from dotenv import load_dotenv
from pathlib import Path
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi import APIRouter
from starlette.concurrency import run_in_threadpool
import pandas as pd
from lock import lock
import re
import numpy as np
import time
import json
import requests
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from config.sports import (
    SPORT_CONFIG,
    SPORT_LEAGUES,
    GAME_FEATURES,
    PREDICTION_FEATURES,
)
from services.update_manual import update_manual
from services.teams import get_teams
from services.predict import predict
from services.live import get_live_score
from services.cache import (
    make_cache_key,
    get_cached,
    set_cached,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_VERSION_FILE = Path(__file__).resolve().parent / "data_version.json"

load_dotenv(ROOT_DIR / ".env.local")

app = FastAPI()
router = APIRouter(prefix="/slop-watch")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_data_version():
    if not DATA_VERSION_FILE.exists():
        return 0

    try:
        with open(DATA_VERSION_FILE, "r") as f:
            return json.load(f)["version"]
    except Exception:
        return 0


def increment_data_version():
    version = time.time_ns()

    temp_file = DATA_VERSION_FILE.with_suffix(".tmp")

    with open(temp_file, "w") as f:
        json.dump({"version": version}, f)

    temp_file.replace(DATA_VERSION_FILE)

    return version

def cached_response(
    content,
    max_age=31536000,
    stale_while_revalidate=0,
):
    return JSONResponse(
        content=jsonable_encoder(content),
        headers={
            "Cache-Control": "public, max-age=0",
            "Cloudflare-CDN-Cache-Control": (
                f"public, max-age={max_age}, "
                f"stale-while-revalidate={stale_while_revalidate}"
            )
        }
    )

def warm_cache(version: int):
    base_url = os.environ.get("NEXT_PUBLIC_API_URL")

    if not base_url:
        print("PUBLIC_API_URL is not configured. Skipping cache warming.")
        return

    today = datetime.now(ZoneInfo("America/Toronto")).date()
    start = (today - timedelta(days=30)).isoformat()
    end = (today + timedelta(days=30)).isoformat()

    # Warm home page games
    try:
        response = requests.get(
            f"{base_url}/api/games",
            params={
                "start": start,
                "end": end,
                "version": version,
            },
            timeout=120,
        )

        print(
            f"Games cache warm:\n"
            f"URL: {response.url}\n"
            f"HTTP: {response.status_code}\n"
            f"CF-Cache-Status: {response.headers.get('CF-Cache-Status')}\n"
            f"Age: {response.headers.get('Age')}\n"
            f"Cache-Control: {response.headers.get('Cache-Control')}\n"
            f"CF-CDN-Cache-Control: "
            f"{response.headers.get('Cloudflare-CDN-Cache-Control')}",
            flush=True
        )

        response.raise_for_status()

    except Exception as e:
        print(f"Failed to warm games cache: {e}")

    # Warm teams for every league
    for league in SPORT_CONFIG:
        try:
            response = requests.get(
                f"{base_url}/api/teams",
                params={
                    "league": league,
                    "version": version,
                },
                timeout=60,
            )

            print(
                f"{league} teams cache warm: "
                f"HTTP {response.status_code}, "
                f"CF status: {response.headers.get('CF-Cache-Status')}"
            )

            response.raise_for_status()

        except Exception as e:
            print(f"Failed to warm {league} teams cache: {e}")


@router.get("/api/version")
def version():
    return JSONResponse(
        content={"version": get_data_version()},
        headers={
            "Cache-Control": "no-store",
            "Cloudflare-CDN-Cache-Control": "no-store",
        }
    )

    
@router.post("/api/update")
def update(request: Request):

    provided_secret = request.headers.get("X-Update-Secret")
    expected_secret = os.environ.get("UPDATE_KEY")

    if not expected_secret or provided_secret != expected_secret:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    try:
        with lock:
            print("UPDATE: Starting", flush=True)

            update_manual()

            print("UPDATE: Manual update finished", flush=True)

            version = increment_data_version()

            print(f"UPDATE: Version incremented to {version}", flush=True)

        # Warm cache after releasing
        print("UPDATE: Starting cache warm", flush=True)

        warm_cache(version)

        print("UPDATE: Complete", flush=True)

        return {
            "success": True,
            "message": "Data updated, models retrained, and cache warmed.",
            "version": version,
        }

    except Exception as e:
        print(f"Update failed: {e}")

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )


@router.get("/api/games")
async def games(request: Request):

    start_time = time.perf_counter()

    league = request.query_params.get("league")
    sport = request.query_params.get("sport")
    start_date = request.query_params.get("start")
    end_date = request.query_params.get("end")
    team = request.query_params.get("team")
    game_id = request.query_params.get("id")

    # ---------------------------------
    # CHECKING IF CACHED
    # ---------------------------------

    version = get_data_version()

    cache_key = make_cache_key(
        "games",
        version,
        {
            "league": league,
            "sport": sport,
            "start": start_date,
            "end": end_date,
            "team": team,
            "id": game_id,
        }
    )

    cached = get_cached(cache_key)

    if cached is not None:
        return cached_response(
            cached,
            max_age=31536000,
            stale_while_revalidate=0,
        )

    # ---------------------------------
    # GETTING SPORT OR LEAGUE
    # ---------------------------------

    if sport:
        leagues = SPORT_LEAGUES.get(sport.lower())

        if leagues is None:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unknown sport: {sport}"}
            )

    elif league:

        if league not in SPORT_CONFIG:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unknown league: {league}"}
            )

        leagues = [league]

    else:
        leagues = list(SPORT_CONFIG.keys())

    # ---------------------------------
    # TIMEFRAME
    # ---------------------------------
    
    if start_date:
        prediction_date = (
            pd.Timestamp(start_date).normalize()
            - pd.Timedelta(days=1)
        )
    else:
        prediction_date = pd.Timestamp.now().normalize()

    if end_date:
        end_date = (
            pd.Timestamp(end_date).normalize()
            + pd.Timedelta(days=1)
        )

        days_ahead = (
            end_date - prediction_date
        ).days
    else:
        days_ahead = 7

    all_games = []

    # ---------------------------------
    # GET GAMES & PREDICTIONS
    # ---------------------------------

    for league in leagues:

        predictions = await run_in_threadpool(
            predict,
            start_date=prediction_date,
            league=league,
            days_ahead=days_ahead,
        )

        if predictions.empty:
            continue

        predictions["game_id"] = (
            predictions["game_id"].astype(str)
        )

        # Make sure all prediction feature columns exist
        for column in PREDICTION_FEATURES:
            if column not in predictions.columns:
                predictions[column] = None

        # Select cols
        league_games = predictions[PREDICTION_FEATURES].copy()

        # ---------------------------------
        # FILTER FOR GAME
        # ---------------------------------

        if game_id:
            league_games = league_games[
                league_games["game_id"].astype(str) == str(game_id)
            ].copy()

        # ---------------------------------
        # FILTER FOR TEAM
        # ---------------------------------

        if team:
            league_games = league_games[
                (league_games["home_name"] == team) | 
                (league_games["away_name"] == team)
            ].copy()

        league_games["league"] = league

        all_games.append(league_games)

    # ---------------------------------
    # RETURN GAMES
    # ---------------------------------
    if not all_games:

        set_cached(cache_key, [])

        print(f"Games took {time.perf_counter() - start_time:.3f}s")

        return cached_response(
            [],
            max_age=31536000,
            stale_while_revalidate=0,
        )

    games = pd.concat(
        all_games, 
        ignore_index=True
    )

    games["date"] = games["date"].astype(str)

    games = games.astype(object).where(
        pd.notna(games),
        None
    )

    elapsed = time.perf_counter() - start_time
    print(f"Games took {elapsed:.3f}s")

    result = games.to_dict(orient="records")

    set_cached(cache_key, result)

    return cached_response(
        result,
        max_age=31536000,
        stale_while_revalidate=0,
    )

@router.get("/api/team/{league}/{team_slug}")
async def team(league: str, team_slug: str, request: Request):

    start_time = time.perf_counter()

    team_id = request.query_params.get("id")
    team_name = unslugify(team_slug)

    # ---------------------------------
    # CHECKING IF CACHED
    # ---------------------------------

    version = get_data_version()

    cache_key = make_cache_key(
        "team",
        version,
        {
            "league": league,
            "team_slug": team_slug,
            "id": team_id,
        },
    )

    cached = get_cached(cache_key)

    if cached is not None:
        return cached_response(cached)

    if league not in SPORT_CONFIG:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown league: {league}"}
        )

    processed = await run_in_threadpool(
        pd.read_csv,
        SPORT_CONFIG[league]["processed_output"],
)

    processed["game_id"] = processed["game_id"].astype(str).str.replace(
        r"\.0$",
        "",
        regex=True
    )

    processed["home_last_game_id"] = (
        processed["home_last_game_id"]
        .astype(str)
        .str.replace(r"\.0$", "", regex=True)
    )

    processed["away_last_game_id"] = (
        processed["away_last_game_id"]
        .astype(str)
        .str.replace(r"\.0$", "", regex=True)
    )

    processed["date"] = pd.to_datetime(
        processed["date"],
        utc=True
    )

    # Filter games for this team
    if team_id:
        team_games = processed[
            (processed["home_id"].astype(str) == str(team_id)) |
            (processed["away_id"].astype(str) == str(team_id))
        ].copy()
    else:
        team_games = processed[
            (processed["home_name"] == team_name) |
            (processed["away_name"] == team_name)
        ].copy()

    # Only completed games
    team_games = team_games[
        team_games["actual_slop"].notna()
    ]

    season = None
    team_badness = None
    wins = 0
    losses = 0
    point_diff = 0
    team_full_name = team_name

    if team_games.empty:
        print(f"No completed games found for team ID {team_id}")
    else:
        latest_game = (
            team_games
            .sort_values("date", ascending=False)
            .iloc[0]
        )

        season = latest_game["season"]

        # Determine whether team was home or away
        if team_id:
            is_home = (
                str(latest_game["home_id"]) == str(team_id)
            )
        else:
            is_home = (
                latest_game["home_name"] == team_name
            )

        # Get team's badness
        if is_home:
            team_badness = latest_game["home_badness"]
            team_score = latest_game["home_score"]
            opponent_score = latest_game["away_score"]
            team_full_name = latest_game["home_full_name"]
        else:
            team_badness = latest_game["away_badness"]
            team_score = latest_game["away_score"]
            opponent_score = latest_game["home_score"]
            team_full_name = latest_game["away_full_name"]

        # Get existing regular season record
        if is_home:
            wins = int(latest_game["home_season_wins"])
            losses = int(latest_game["home_season_losses"])
            point_diff = int(latest_game["home_season_point_diff"])
        else:
            wins = int(latest_game["away_season_wins"])
            losses = int(latest_game["away_season_losses"])
            point_diff = int(latest_game["away_season_point_diff"])

        # Only update record for regular season games
        if "season_type" in latest_game.index:
            is_regular_season = latest_game["season_type"] == 2
        elif "season_id" in latest_game.index:
            is_regular_season = latest_game["season_id"] % 3 == 2
        else:
            is_regular_season = latest_game["is_postseason"] == 0

        if is_regular_season:

            point_diff += int(team_score) - int(opponent_score)

            if team_score > opponent_score:
                wins += 1

            elif team_score < opponent_score:
                losses += 1

    # ---------------------------------
    # RECENT & UPCOMING GAMES
    # ---------------------------------

    now = pd.Timestamp.now(tz="UTC")

    # ---------------------------------
    # PREVIOUS GAMES FROM CSV
    # ---------------------------------

    previous_games = []

    if not team_games.empty:

        team_games = team_games.sort_values("date")

        # Lookup games by ID
        game_lookup = {
            str(row["game_id"]): row
            for _, row in processed.iterrows()
        }

        # Start from the most recent completed game
        current_game = team_games.iloc[-1]

        for _ in range(15):

            if team_id:
                is_home = (
                    str(current_game["home_id"]) == str(team_id)
                )
            else:
                is_home = (
                    current_game["home_name"] == team_name
                )

            # Add the CURRENT game first
            previous_games.append({
                "game_id": int(float(current_game["game_id"])),
                "date": pd.to_datetime(
                    current_game["date"],
                    utc=True
                ).isoformat(),
                "home_name": current_game["home_name"],
                "away_name": current_game["away_name"],
                "home_full_name": current_game["home_full_name"],
                "away_full_name": current_game["away_full_name"],
                "venue_full_name": current_game["venue_full_name"],
                "home_score": (
                    int(current_game["home_score"])
                    if pd.notna(current_game["home_score"])
                    else None
                ),
                "away_score": (
                    int(current_game["away_score"])
                    if pd.notna(current_game["away_score"])
                    else None
                ),
                "is_postseason": int(current_game["is_postseason"]),
                "slop_percentile": (
                    float(current_game["slop_percentile"])
                    if pd.notna(current_game["slop_percentile"])
                    else None
                ),
                "watchability_percentile": (
                    float(current_game["watchability_percentile"])
                    if pd.notna(current_game["watchability_percentile"])
                    else None
                ),
            })

            # Find the previous game
            last_game_id = (
                current_game["home_last_game_id"]
                if is_home
                else current_game["away_last_game_id"]
            )

            if pd.isna(last_game_id):
                break

            previous = game_lookup.get(str(last_game_id))

            if previous is None:
                break

            # Follow the chain backwards
            current_game = previous

    # ---------------------------------
    # LIVE & UPCOMING GAMES
    # ---------------------------------

    games = await run_in_threadpool(
        predict,
        league=league,
        start_date=now,
        days_ahead=14,
    )

    upcoming_games = []

    if not games.empty:

        games["date"] = pd.to_datetime(
            games["date"],
            utc=True
        )

        # Filter to this team
        if team_id:
            games = games[
                (games["home_id"].astype(str) == str(team_id)) |
                (games["away_id"].astype(str) == str(team_id))
            ].copy()
        else:
            games = games[
                (games["home_name"] == team_name) |
                (games["away_name"] == team_name)
            ].copy()

        # Live + upcoming games
        games = games[
            (games["date"] > now) |
            (
                (games["date"] <= now) &
                (games["actual_slop"].isna())
            )
        ].copy()

        games = games.sort_values(
            "date",
            ascending=True
        )

        games["date"] = games["date"].dt.strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        games = games.astype(object).where(
            pd.notna(games),
            None
        )

        upcoming_games = [
            {
                key: json_safe(value)
                for key, value in game.items()
            }
            for game in games.to_dict(orient="records")
        ]

    else:
        upcoming_games = []

    elapsed = time.perf_counter() - start_time
    print(f"Team took {elapsed:.3f}s")

    # ---------------------------------
    # RETURN
    # ---------------------------------

    result = {
        "team": {
            "name": team_name,
            "full_name": team_full_name,
        },
        "team_badness": (
            float(team_badness)
            if pd.notna(team_badness)
            else None
        ),
        "record": {
            "wins": int(wins),
            "losses": int(losses),
        },
        "league": league,
        "season": str(season) if season is not None else None,
        "win_pct": (
            wins / (wins + losses)
            if wins + losses > 0
            else 0
        ),
        "point_diff": int(point_diff),
        "games_played": wins + losses,
        "recent_games": previous_games,
        "upcoming_games": upcoming_games,
    }

    set_cached(cache_key, result)

    return cached_response(result)


@router.get("/api/game/{game_id}")
async def game(game_id: str, request: Request):

    start_time = time.perf_counter()

    league = request.query_params.get("league")
    game_date = request.query_params.get("date")

    if not league:
        return JSONResponse(
            status_code=400,
            content={"error": f"Missing league"}
        )

    if not game_date:
        return JSONResponse(
            status_code=400,
            content={"error": f"Missing date"}
        )

    if league not in SPORT_CONFIG:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown league: {league}"}
        )

    # ---------------------------------
    # GET GAME DATE
    # ---------------------------------

    try:
        game_date = pd.Timestamp(game_date).normalize()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid date"}
        )

    # ---------------------------------
    # CHECKING IF CACHED
    # ---------------------------------

    version = get_data_version()

    cache_key = make_cache_key(
        "game",
        version,
        {
            "game_id": game_id,
            "league": league,
            "date": game_date.isoformat(),
        },
    )

    cached = get_cached(cache_key)

    if cached is not None:
        return cached_response(cached)

    # ---------------------------------
    # GET GAME PREDICTION
    # ---------------------------------

    prediction_date = (
        game_date
        - pd.Timedelta(days=1)
    )

    games = await run_in_threadpool(
        predict,
        league=league,
        start_date=prediction_date,
        days_ahead=2,
    )

    if games.empty:
        return JSONResponse(
            status_code=400,
            content={"error": f"Game not found"}
        )

    games["game_id"] = (
        games["game_id"]
        .astype(str)
    )

    game = games[
        games["game_id"] == str(game_id)
    ].copy()

    if game.empty:
        return JSONResponse(
            status_code=400,
            content={"error": f"Game not found"}
        )

    game = game.iloc[0]

    # ---------------------------------
    # GET LAST 5 HOME TEAM GAMES
    # ---------------------------------

    processed = await run_in_threadpool(
        pd.read_csv,
        SPORT_CONFIG[league]["processed_output"],
    )

    processed["date"] = pd.to_datetime(
        processed["date"],
        utc=True
    )

    current_game_date = pd.Timestamp(
        game["date"]
    ).tz_convert("UTC")

    home_recent_games = (
        processed[
            (
                (processed["home_name"] == game["home_name"]) |
                (processed["away_name"] == game["home_name"])
            )
            &
            (processed["date"] < current_game_date)
            &
            processed["home_score"].notna()
            &
            processed["away_score"].notna()
        ]
        .sort_values("date", ascending=False)
        .head(5)
    )

    home_recent_games = [
        {
            "game_id": int(float(row["game_id"])),
            "date": row["date"].isoformat(),
            "home_name": row["home_name"],
            "away_name": row["away_name"],
            "home_full_name": row["home_full_name"],
            "away_full_name": row["away_full_name"],
            "home_score": int(row["home_score"]),
            "away_score": int(row["away_score"]),
            "is_postseason": int(row["is_postseason"]),
            "slop_percentile": (
                float(row["slop_percentile"])
                if pd.notna(row["slop_percentile"])
                else None
            ),
            "watchability_percentile": (
                float(row["watchability_percentile"])
                if pd.notna(row["watchability_percentile"])
                else None
            ),
        }
        for _, row in home_recent_games.iterrows()
    ]

    # ---------------------------------
    # GET LAST 5 AWAY TEAM GAMES
    # ---------------------------------

    away_recent_games = (
        processed[
            (
                (processed["home_name"] == game["away_name"]) |
                (processed["away_name"] == game["away_name"])
            )
            &
            (processed["date"] < current_game_date)
            &
            processed["home_score"].notna()
            &
            processed["away_score"].notna()
        ]
        .sort_values("date", ascending=False)
        .head(5)
    )

    away_recent_games = [
        {
            "game_id": int(float(row["game_id"])),
            "date": row["date"].isoformat(),
            "home_name": row["home_name"],
            "away_name": row["away_name"],
            "home_full_name": row["home_full_name"],
            "away_full_name": row["away_full_name"],
            "home_score": int(row["home_score"]),
            "away_score": int(row["away_score"]),
            "is_postseason": int(row["is_postseason"]),
            "slop_percentile": (
                float(row["slop_percentile"])
                if pd.notna(row["slop_percentile"])
                else None
            ),
            "watchability_percentile": (
                float(row["watchability_percentile"])
                if pd.notna(row["watchability_percentile"])
                else None
            ),
        }
        for _, row in away_recent_games.iterrows()
    ]

    # ---------------------------------
    # RETURN GAME
    # ---------------------------------

    result = {}

    for column in GAME_FEATURES:

        if column not in game.index:
            continue

        value = game[column]

        if pd.isna(value):
            value = None

        elif isinstance(value, np.integer):
            value = int(value)

        elif isinstance(value, np.floating):
            value = float(value)

        result[column] = value

    result["league"] = league

    result["home_recent_games"] = home_recent_games
    result["away_recent_games"] = away_recent_games

    elapsed = time.perf_counter() - start_time
    print(f"Game {game_id} took {elapsed:.3f}s")

    set_cached(cache_key, result)

    return cached_response(result)

@router.get("/api/game/{game_id}/score")
async def game_score(game_id: str, request: Request):

    league = request.query_params.get("league")
    game_date = request.query_params.get("date")

    if not league:
        return JSONResponse(
            status_code=400,
            content={"error": f"Missing league"}
        )

    if not game_date:
        return JSONResponse(
            status_code=400,
            content={"error": f"Missing date"}
        )

    if league not in SPORT_CONFIG:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown league: {league}"}
        )

    try:
        game_date = pd.Timestamp(game_date).normalize()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid date"}
        )

    score = await run_in_threadpool(
        get_live_score,
        league=league,
        game_id=game_id,
        game_date=game_date,
    )

    return cached_response(
        {
            "game_id": int(game_id),
            "home_score": score["home_score"],
            "away_score": score["away_score"],
        },
        max_age=5,
        stale_while_revalidate=5
    )

@router.get("/api/teams")
def teams(request: Request):

    league = request.query_params.get("league")

    if not league:
        return JSONResponse(
            status_code=400,
            content={"error": "League is required"}
        )

    if league not in SPORT_CONFIG:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid league"}
        )

    version = get_data_version()

    cache_key = make_cache_key(
        "teams",
        version,
        {
            "league": league,
        },
    )

    cached = get_cached(cache_key)

    if cached is not None:
        return cached_response(cached)

    result = get_teams(league)

    set_cached(cache_key, result)

    return cached_response(result)

def slugify(value):
    return re.sub(
        r"-+",
        "-",
        re.sub(
            r"[^a-z0-9\s-]",
            "",
            value.lower().strip()
        ).replace(" ", "-")
    )

def unslugify(value):
    return " ".join(
        word.capitalize()
        for word in value.split("-")
    )

def json_safe(value):
    if isinstance(value, np.ndarray):
        return value.tolist()

    if isinstance(value, np.generic):
        return value.item()

    if pd.isna(value):
        return None

    return value

app.include_router(router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=5002,
        reload=True
    )