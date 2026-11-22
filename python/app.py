from dotenv import load_dotenv
from pathlib import Path
import os
import asyncio
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
import requests
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from concurrent.futures import ThreadPoolExecutor, as_completed

from config.sports import (
    SPORT_CONFIG,
    SPORT_LEAGUES,
    GAME_FEATURES,
    PREDICTION_FEATURES,
)
from services.update_data import update_all_data, update_all_models
from services.teams import get_teams
from services.predict import predict
from services.live import get_live_score
from services.cache import (
    make_cache_key,
    get_cached,
    get_cached_many,
    set_cached,
    get_active_version,
    set_active_version,
    set_model_versions,
    get_model_versions,
    get_model_version,
)
from services.model import (
    promote_all_models,
    discard_model_candidates,
)

LIVE_SCORE_CACHE_SECONDS = 30
LIVE_SCORE_SEMAPHORE = asyncio.Semaphore(8)

ROOT_DIR = Path(__file__).resolve().parent.parent

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
    return get_active_version()


def generate_data_version():
    return time.time_ns()


def set_data_version(version: int):
    set_active_version(version)

def get_request_cache_version(request: Request):

    provided_secret = request.headers.get("X-Cache-Warm-Key")
    expected_secret = os.environ.get("CACHE_WARM_KEY")

    candidate_version = request.query_params.get("version")

    authorized = (
        expected_secret
        and provided_secret == expected_secret
    )

    if authorized and candidate_version:
        try:
            version = int(candidate_version)

            print(
                f"CACHE VERSION: Candidate {version}",
                flush=True,
            )

            return version

        except ValueError:
            pass

    version = get_data_version()

    print(
        f"CACHE VERSION: Active {version}",
        flush=True,
    )

    return version

def cached_response(content):
    return JSONResponse(
        content=jsonable_encoder(content),
        headers={
            "Cache-Control": "no-store",
            "Cloudflare-CDN-Cache-Control": "no-store",
        }
    )


def warm_cache(version: int):
    base_url = os.environ.get("NEXT_PUBLIC_API_URL")
    secret = os.environ.get("CACHE_WARM_KEY")

    if not base_url or not secret:
        print("Cache warming configuration is missing.", flush=True)
        return False

    headers = {
        "X-Cache-Warm-Key": secret,
    }

    success = True

    warm_start = time.perf_counter()

    def log(message):
        elapsed = time.perf_counter() - warm_start
        print(f"[WARM +{elapsed:.2f}s] {message}", flush=True)

    today = datetime.now(ZoneInfo("America/Toronto")).date()
    start = (today - timedelta(days=30)).isoformat()
    end = (today + timedelta(days=30)).isoformat()

    print("DEBUG: NEW WARM_CACHE VERSION RUNNING", flush=True)
    print(f"DEBUG: API URL = {base_url}", flush=True)
    print(f"DEBUG: DATE RANGE = {start} to {end}", flush=True)

    # ---------------------------------
    # WARM ALL GAMES
    # ---------------------------------

    all_games = []

    try:
        log(f"START all-games request: {start} to {end}")

        response = requests.get(
            f"{base_url}/api/games",
            params={
                "start": start,
                "end": end,
                "version": version,
            },
            headers=headers,
            timeout=120,
        )

        log(f"All-games HTTP response: {response.status_code}")

        response.raise_for_status()

        all_games = response.json()

        log(f"SUCCESS all-games request: {len(all_games)} games")

    except Exception as e:
        success = False
        log(f"FAILED all-games request: {repr(e)}")

    # ---------------------------------
    # WARM GAMES FOR EVERY LEAGUE
    # ---------------------------------

    for league in SPORT_CONFIG:
        try:
            log(f"START {league} games request")

            response = requests.get(
                f"{base_url}/api/games",
                params={
                    "league": league,
                    "start": start,
                    "end": end,
                    "version": version,
                },
                headers=headers,
                timeout=120,
            )

            log(f"{league} games HTTP response: {response.status_code}")

            response.raise_for_status()

            league_games = response.json()
            all_games.extend(league_games)

            log(f"SUCCESS {league} games: {len(league_games)} games")

        except Exception as e:
            success = False
            log(f"FAILED {league} games: {repr(e)}")

    # Remove duplicates
    unique_games = {}

    for game in all_games:
        key = (
            game.get("league"),
            str(game.get("game_id")),
        )
        unique_games[key] = game

    all_games = list(unique_games.values())

    # ---------------------------------
    # WARM TEAM LISTS
    # ---------------------------------

    for league in SPORT_CONFIG:
        try:
            log(f"START {league} teams request")

            response = requests.get(
                f"{base_url}/api/teams",
                params={
                    "league": league,
                    "version": version,
                },
                headers=headers,
                timeout=60,
            )

            log(f"{league} teams HTTP response: {response.status_code}")

            response.raise_for_status()

            teams = response.json()
            log(f"SUCCESS {league} teams list: {len(teams)} teams")

        except Exception as e:
            success = False
            log(f"FAILED {league} teams list: {repr(e)}")

    # ---------------------------------
    # COLLECT UNIQUE TEAMS AND GAMES
    # ---------------------------------

    log(f"Starting collection from {len(all_games)} unique games")

    teams_to_warm = set()
    games_to_warm = set()

    for game in all_games:

        league = game.get("league")
        game_id = game.get("game_id")
        game_date = game.get("date")

        if not league:
            continue

        # Collect game details
        if game_id is not None and game_date:
            games_to_warm.add((
                str(game_id),
                league,
                str(game_date),
            ))

        # Collect home and away teams
        for side in ("home", "away"):

            team_name = game.get(f"{side}_name")
            team_id = game.get(f"{side}_id")

            if not team_name:
                continue

            teams_to_warm.add((
                league,
                str(team_name),
                str(team_id) if team_id is not None else None,
            ))

    log(
        f"Collection complete: "
        f"{len(teams_to_warm)} teams, "
        f"{len(games_to_warm)} games"
    )

    # ---------------------------------
    # WARM TEAM PAGES
    # ---------------------------------

    def warm_team(team_data):

        league, team_name, team_id = team_data

        slug = slugify(team_name)

        params = {
            "version": version,
        }

        if team_id:
            params["id"] = team_id

        response = requests.get(
            f"{base_url}/api/team/{league}/{slug}",
            params=params,
            headers=headers,
            timeout=120,
        )

        response.raise_for_status()

        return f"{league} / {team_name}"

    # ---------------------------------
    # WARM GAME PAGES
    # ---------------------------------

    def warm_game(game_data):

        game_id, league, game_date = game_data

        response = requests.get(
            f"{base_url}/api/game/{game_id}",
            params={
                "league": league,
                "date": game_date,
                "version": version,
            },
            headers=headers,
            timeout=120,
        )

        response.raise_for_status()

        return f"{league} / Game {game_id}"

    # ---------------------------------
    # EXECUTE FULL WARMING
    # ---------------------------------

    total_tasks = len(teams_to_warm) + len(games_to_warm)
    log(f"Submitting {total_tasks} detail requests to 12 workers")

    print(
        f"[WARM] Starting detail cache warming: "
        f"{len(teams_to_warm)} teams, "
        f"{len(games_to_warm)} games, "
        f"{total_tasks} total requests",
        flush=True,
    )

    def run_warm_task(task_number, task_type, task_data, warm_function):
        task_start = time.perf_counter()

        print(
            f"[WARM {task_number}/{total_tasks}] START {task_type}: {task_data}",
            flush=True,
        )

        try:
            result = warm_function(task_data)

            elapsed = time.perf_counter() - task_start

            print(
                f"[WARM {task_number}/{total_tasks}] SUCCESS {task_type}: "
                f"{result} ({elapsed:.2f}s)",
                flush=True,
            )

            return task_type, task_data, result, elapsed, None

        except Exception as e:
            elapsed = time.perf_counter() - task_start

            print(
                f"[WARM {task_number}/{total_tasks}] FAILED {task_type}: "
                f"{task_data} ({elapsed:.2f}s) - {repr(e)}",
                flush=True,
            )

            return task_type, task_data, None, elapsed, str(e)

    with ThreadPoolExecutor(max_workers=12) as executor:

        tasks = {}

        task_number = 0

        for team_data in teams_to_warm:
            task_number += 1

            future = executor.submit(
                run_warm_task,
                task_number,
                "team",
                team_data,
                warm_team,
            )

            tasks[future] = "team"

        for game_data in games_to_warm:
            task_number += 1

            future = executor.submit(
                run_warm_task,
                task_number,
                "game",
                game_data,
                warm_game,
            )

            tasks[future] = "game"

        completed_teams = 0
        completed_games = 0
        completed = 0

        for future in as_completed(tasks):

            task_type = tasks[future]
            completed += 1

            try:
                result_type, task_data, result, elapsed, error = future.result()

                if error:
                    success = False
                elif result_type == "team":
                    completed_teams += 1
                else:
                    completed_games += 1

                print(
                    f"[WARM] PROGRESS {completed}/{total_tasks} "
                    f"| Teams: {completed_teams}/{len(teams_to_warm)} "
                    f"| Games: {completed_games}/{len(games_to_warm)} "
                    f"| Elapsed: {time.perf_counter() - warm_start:.1f}s",
                    flush=True,
                )

            except Exception as e:
                success = False

                print(
                    f"[WARM] UNEXPECTED ERROR {task_type}: {e}",
                    flush=True,
                )

    print(
        f"[WARM] Detail cache warming finished: "
        f"{completed_teams}/{len(teams_to_warm)} teams, "
        f"{completed_games}/{len(games_to_warm)} games "
        f"in {time.perf_counter() - warm_start:.2f}s",
        flush=True,
    )

    return success

@router.get("/api/version")
def version():
    active_version = get_data_version()
    model_versions = get_model_versions(active_version)

    print(
        f"VERSION REQUEST: Active version = {active_version}",
        flush=True,
    )

    return JSONResponse(
        content={
            "version": str(active_version),
            "model_versions": model_versions,
        },
        headers={
            "Cache-Control": "no-store",
            "Cloudflare-CDN-Cache-Control": "no-store",
        }
    )
    
@router.post("/api/update/data")
def update_data_route(request: Request):

    provided_secret = request.headers.get("X-Update-Secret")
    expected_secret = os.environ.get("UPDATE_KEY")

    if not expected_secret or provided_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        with lock:
            print("UPDATE DATA: Starting", flush=True)

            # Refresh source and processed data
            update_all_data()

            print("UPDATE DATA: Finished", flush=True)

            # Create a new cache generation
            candidate_version = generate_data_version()

            # Preserve the existing model generations
            active_version = get_data_version()
            model_versions = get_model_versions(active_version)

            if not model_versions:
                raise RuntimeError(
                    f"No model versions registered for active version "
                    f"{active_version}"
                )

            set_model_versions(
                candidate_version,
                model_versions,
            )

            print(
                f"UPDATE DATA: Candidate version {candidate_version}",
                flush=True,
            )

            # Warm the candidate while keeping the old version active
            print("UPDATE DATA: Starting candidate cache warm", flush=True)

            warm_success = warm_cache(candidate_version)

            if not warm_success:
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "message": (
                            "Data updated, but cache warming failed. "
                            "Previous version remains active."
                        ),
                        "candidate_version": candidate_version,
                        "active_version": get_data_version(),
                    },
                )

            # Activate only after successful warming
            set_data_version(candidate_version)

            print(
                f"UPDATE DATA: Activated version {candidate_version}",
                flush=True,
            )

            return {
                "success": True,
                "message": "Data updated, cache warmed, and new version activated.",
                "version": candidate_version,
            }

    except Exception as e:
        print(f"Data update failed: {e}", flush=True)

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
            },
        )
    
@router.post("/api/update/model")
def update_model_route(request: Request):

    provided_secret = request.headers.get("X-Update-Secret")
    expected_secret = os.environ.get("UPDATE_KEY")

    if not expected_secret or provided_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    model_versions = None

    try:
        with lock:
            print("UPDATE MODEL: Starting", flush=True)

            # Train all candidate models
            model_versions = update_all_models()

            if not model_versions:
                raise RuntimeError("No candidate models were generated")

            # Create a new cache generation
            candidate_version = generate_data_version()

            # Associate this cache generation with its model generations
            set_model_versions(
                candidate_version,
                model_versions,
            )

            print(
                f"UPDATE MODEL: Candidate version {candidate_version}",
                flush=True,
            )

            # Warm using candidate models
            print("UPDATE MODEL: Starting candidate cache warm", flush=True)

            warm_success = warm_cache(candidate_version)

            if not warm_success:
                discard_model_candidates(model_versions)

                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "message": (
                            "Model cache warming failed. "
                            "Candidate models discarded; previous version remains active."
                        ),
                        "candidate_version": candidate_version,
                        "active_version": get_data_version(),
                    },
                )

            # Promote candidates only after successful warming
            promote_all_models(model_versions)

            # Activate only after promotion
            set_data_version(candidate_version)

            print(
                f"UPDATE MODEL: Activated version {candidate_version}",
                flush=True,
            )

            return {
                "success": True,
                "message": "Models updated, cache warmed, and new version activated.",
                "version": candidate_version,
                "model_versions": model_versions,
            }

    except Exception as e:
        print(f"Model update failed: {e}", flush=True)

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "active_version": get_data_version(),
            },
        )
    
def apply_live_score(game: dict, league: str, game_date: str):
    timestamp = pd.Timestamp(game_date)

    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize("UTC")

    cache_date = timestamp.tz_convert(
        ZoneInfo("America/Toronto")
    ).strftime("%Y-%m-%d")

    score_cache_key = make_cache_key(
        "live-score",
        1,
        {
            "league": league,
            "game_id": str(game["game_id"]),
            "date": cache_date,
        },
    )

    cached_score = get_cached(score_cache_key)

    if cached_score is None:
        return game

    game["home_score"] = cached_score.get("home_score")
    game["away_score"] = cached_score.get("away_score")

    if cached_score.get("actual_slop") is not None:
        game["actual_slop"] = cached_score.get("actual_slop")
        game["actual_watchability"] = cached_score.get("actual_watchability")
        game["watchability_percentile"] = cached_score.get("watchability_percentile")
        game["slop_percentile"] = cached_score.get("slop_percentile")

    return game


@router.get("/api/games")
async def games(request: Request):

    start_time = time.perf_counter()

    league = request.query_params.get("league")
    sport = request.query_params.get("sport")
    start_date = request.query_params.get("start")
    end_date = request.query_params.get("end")
    team = request.query_params.get("team")
    game_id = request.query_params.get("id")

    timezone = request.query_params.get(
        "timezone",
        "America/Toronto",
    )

    try:
        local_tz = ZoneInfo(timezone)
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid timezone: {timezone}"},
        )

    version = get_request_cache_version(request)

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
    # GET DATE RANGE
    # ---------------------------------

    try:
        if start_date:
            first_date = pd.Timestamp(start_date).normalize()
        else:
            first_date = pd.Timestamp.now(tz="UTC").normalize()

        if end_date:
            last_date = pd.Timestamp(end_date).normalize()
        else:
            last_date = first_date + pd.Timedelta(days=6)

        if last_date < first_date:
            return JSONResponse(
                status_code=400,
                content={"error": "End date must be on or after start date"}
            )

    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid date range"}
        )

    # Pad dates by 1 day on each side
    cache_start = first_date - pd.Timedelta(days=1)
    cache_end = last_date + pd.Timedelta(days=1)

    dates = [
        date.strftime("%Y-%m-%d")
        for date in pd.date_range(
            cache_start,
            cache_end,
            freq="D",
        )
    ]

    all_games = []

    # ---------------------------------
    # FETCH ALL CACHE HITS CONCURRENTLY
    # ---------------------------------

    cache_tasks = [
        (current_league, date)
        for current_league in leagues
        for date in dates
    ]

    cache_keys = [
        make_cache_key(
            "games",
            version,
            {
                "league": current_league,
                "date": date,
                "timezone": timezone,
            },
        )
        for current_league, date in cache_tasks
    ]

    cache_results = await run_in_threadpool(
        get_cached_many,
        cache_keys,
    )

    cache_lookup = {
        key: result
        for key, result in zip(cache_tasks, cache_results)
    }

    # ---------------------------------
    # PROCESS EACH LEAGUE
    # ---------------------------------

    for current_league in leagues:

        cached_by_date = {}
        missing_dates = []

        for date in dates:

            cached_date = cache_lookup[(current_league, date)]

            if cached_date is not None:
                cached_by_date[date] = cached_date
            else:
                missing_dates.append(date)

        print(
            f"{current_league}: "
            f"{len(cached_by_date)} cached dates, "
            f"{len(missing_dates)} missing dates",
            flush=True,
        )

        # ---------------------------------
        # GROUP CONSECUTIVE MISSING DATES
        # ---------------------------------

        missing_groups = []

        for date in missing_dates:

            if not missing_groups:
                missing_groups.append([date])
                continue

            previous_date = pd.Timestamp(
                missing_groups[-1][-1]
            )

            current_date = pd.Timestamp(date)

            if (current_date - previous_date).days == 1:
                missing_groups[-1].append(date)
            else:
                missing_groups.append([date])

        # ---------------------------------
        # FETCH MISSING DATE RANGES
        # ---------------------------------

        for date_group in missing_groups:

            group_start = pd.Timestamp(
                date_group[0]
            )

            group_end = pd.Timestamp(
                date_group[-1]
            )

            # Start one day before requested date
            prediction_start = (
                group_start - pd.Timedelta(days=1)
            )

            # Headroom to account for timezone differences
            days_ahead = (
                (group_end - prediction_start).days + 2
            )

            predictions = await run_in_threadpool(
                predict,
                start_date=prediction_start,
                days_ahead=days_ahead,
                league=current_league,
                model_version=get_model_version(version, current_league),
            )

            # Make sure prediction columns exist
            if predictions.empty:
                predictions = pd.DataFrame(
                    columns=PREDICTION_FEATURES
                )
            else:
                predictions["game_id"] = (
                    predictions["game_id"]
                    .astype(str)
                )

                predictions["date"] = pd.to_datetime(
                    predictions["date"],
                    utc=True,
                    errors="coerce",
                )

            for column in PREDICTION_FEATURES:
                if column not in predictions.columns:
                    predictions[column] = None

            # ---------------------------------
            # CACHE EACH DATE SEPARATELY
            # ---------------------------------

            for date in date_group:

                if predictions.empty:
                    date_games = pd.DataFrame(
                        columns=PREDICTION_FEATURES
                    )
                else:
                    local_dates = (
                        predictions["date"]
                        .dt.tz_convert(local_tz)
                        .dt.strftime("%Y-%m-%d")
                    )

                    date_games = predictions[
                        local_dates == date
                    ].copy()

                date_games = date_games[
                    PREDICTION_FEATURES
                ].copy()

                date_games["league"] = current_league

                date_games = date_games.astype(
                    object
                ).where(
                    pd.notna(date_games),
                    None,
                )

                date_result = date_games.to_dict(
                    orient="records"
                )

                date_cache_key = make_cache_key(
                    "games",
                    version,
                    {
                        "league": current_league,
                        "date": date,
                        "timezone": timezone,
                    }
                )

                set_cached(
                    date_cache_key,
                    date_result,
                )

                cached_by_date[date] = date_result

        # ---------------------------------
        # COMBINE DATES FOR LEAGUE
        # ---------------------------------

        for date in dates:
            all_games.extend(
                cached_by_date.get(date, [])
            )

    # ---------------------------------
    # APPLY REQUEST FILTERS
    # ---------------------------------

    if all_games:
        games_df = pd.DataFrame(all_games)

        if game_id:
            games_df = games_df[
                games_df["game_id"].astype(str) == str(game_id)
            ]

        if team:
            games_df = games_df[
                (games_df["home_name"] == team) |
                (games_df["away_name"] == team)
            ]

        games_df = games_df.astype(object).where(
            pd.notna(games_df),
            None,
        )

        result = games_df.to_dict(
            orient="records"
        )

    else:
        result = []

    # ---------------------------------
    # APPLY LATEST LIVE SCORES (BATCHED)
    # ---------------------------------

    score_games = [
        game for game in result
        if game.get("date") and game.get("league")
    ]

    score_keys = []

    for game in score_games:
        timestamp = pd.Timestamp(game["date"])

        if timestamp.tzinfo is None:
            timestamp = timestamp.tz_localize("UTC")

        cache_date = timestamp.tz_convert(
            ZoneInfo("America/Toronto")
        ).strftime("%Y-%m-%d")

        score_keys.append(
            make_cache_key(
                "live-score",
                1,
                {
                    "league": game["league"],
                    "game_id": str(game["game_id"]),
                    "date": cache_date,
                },
            )
        )

    score_results = await run_in_threadpool(
        get_cached_many,
        score_keys,
    )

    for game, cached_score in zip(score_games, score_results):
        if cached_score is None:
            continue

        game["home_score"] = cached_score.get("home_score")
        game["away_score"] = cached_score.get("away_score")

        if cached_score.get("actual_slop") is not None:
            game["actual_slop"] = cached_score.get("actual_slop")
            game["actual_watchability"] = cached_score.get("actual_watchability")
            game["watchability_percentile"] = cached_score.get("watchability_percentile")
            game["slop_percentile"] = cached_score.get("slop_percentile")

    # ---------------------------------
    # CACHE COMPLETE REQUEST
    # ---------------------------------

    elapsed = time.perf_counter() - start_time

    print(
        f"Games took {elapsed:.3f}s "
        f"({len(result)} games)",
        flush=True,
    )

    return cached_response(result)

@router.get("/api/team/{league}/{team_slug}")
async def team(league: str, team_slug: str, request: Request):

    start_time = time.perf_counter()

    team_id = request.query_params.get("id")
    team_name = unslugify(team_slug)

    # ---------------------------------
    # CHECKING IF CACHED
    # ---------------------------------

    version = get_request_cache_version(request)

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

    # ---------------------------------
    # RESOLVE TEAM FULL NAME
    # ---------------------------------

    team_full_name = team_name

    if team_id:
        team_games = processed[
            (processed["home_id"].astype(str) == str(team_id)) |
            (processed["away_id"].astype(str) == str(team_id))
        ].copy()

    else:
        # Match against short names and full names
        home_matches = (
            processed["home_name"].fillna("").map(slugify) == team_slug
        ) | (
            processed["home_full_name"].fillna("").map(slugify) == team_slug
        )

        away_matches = (
            processed["away_name"].fillna("").map(slugify) == team_slug
        ) | (
            processed["away_full_name"].fillna("").map(slugify) == team_slug
        )

        matches = processed[home_matches | away_matches]

        if not matches.empty:
            first_match = matches.iloc[0]

            if home_matches.loc[first_match.name]:
                team_full_name = first_match["home_full_name"]
            else:
                team_full_name = first_match["away_full_name"]

        # Filter using the resolved full name
        team_games = processed[
            (processed["home_full_name"] == team_full_name) |
            (processed["away_full_name"] == team_full_name)
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
                latest_game["home_full_name"] == team_full_name
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
                    current_game["home_full_name"] == team_full_name
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
        model_version=get_model_version(version, league),
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
                (games["home_full_name"] == team_full_name) |
                (games["away_full_name"] == team_full_name)
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

    version = get_request_cache_version(request)

    cache_key = make_cache_key(
        "game",
        version,
        {
            "game_id": game_id,
            "league": league,
            "date": game_date.isoformat(),
        },
    )

    print(
        f"GAME CACHE KEY: {cache_key}",
        flush=True,
    )

    cached = get_cached(cache_key)

    if cached is not None:
        print(
            f"GAME CACHE HIT: {league} / {game_id}",
            flush=True,
        )

        apply_live_score(
            cached,
            league,
            cached.get("date", game_date),
        )

        return cached_response(cached)

    print(
        f"GAME CACHE MISS: {league} / {game_id}",
        flush=True,
    )

    # ---------------------------------
    # GET GAME PREDICTION
    # ---------------------------------

    prediction_start = game_date - pd.Timedelta(days=1)
    prediction_end = game_date + pd.Timedelta(days=1)

    days_ahead = (
        (prediction_end - prediction_start).days + 2
    )

    games = await run_in_threadpool(
        predict,
        league=league,
        start_date=prediction_start,
        days_ahead=days_ahead,
        model_version=get_model_version(version, league),
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
                (processed["home_full_name"] == game["home_full_name"]) |
                (processed["away_full_name"] == game["home_full_name"])
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
                (processed["home_full_name"] == game["away_full_name"]) |
                (processed["away_full_name"] == game["away_full_name"])
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

    # Cache the original prediction response
    set_cached(cache_key, result)

    # Overlay the latest independently cached score
    apply_live_score(
        result,
        league,
        result["date"],
    )

    return cached_response(result)

@router.get("/api/game/{game_id}/score")
async def game_score(game_id: str, request: Request):

    league = request.query_params.get("league")
    game_date = request.query_params.get("date")

    if not league:
        return JSONResponse(
            status_code=400,
            content={"error": "Missing league"}
        )

    if not game_date:
        return JSONResponse(
            status_code=400,
            content={"error": "Missing date"}
        )

    if league not in SPORT_CONFIG:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unknown league: {league}"}
        )

    try:
        parsed_date = pd.Timestamp(game_date)

        if parsed_date.tzinfo is None:
            cache_date = parsed_date.strftime("%Y-%m-%d")
            normalized_date = parsed_date.tz_localize("UTC").normalize()
        else:
            cache_date = parsed_date.tz_convert(
                ZoneInfo("America/Toronto")
            ).strftime("%Y-%m-%d")

            normalized_date = parsed_date.normalize()

    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid date"}
        )

    score_cache_key = make_cache_key(
        "live-score",
        1,  # Stable version; independent of prediction versions
        {
            "league": league,
            "game_id": str(game_id),
            "date": cache_date,
        },
    )

    version = get_data_version()

    score_start = time.perf_counter()

    # ---------------------------------
    # CHECK REDIS BEFORE READING CSV
    # ---------------------------------

    cached_score = get_cached(score_cache_key)

    if cached_score is not None:

        fetched_at = cached_score.get("fetched_at")

        is_completed = cached_score.get("actual_slop") is not None

        is_fresh = (
            fetched_at is not None
            and time.time() - float(fetched_at) < LIVE_SCORE_CACHE_SECONDS
        )

        if is_completed or is_fresh:

            print(
                f"SCORE {game_id}: returning Redis cache "
                f"(completed={is_completed}, fresh={is_fresh})",
                flush=True,
            )

            return cached_response({
                "game_id": int(game_id),
                "home_score": cached_score.get("home_score"),
                "away_score": cached_score.get("away_score"),
                "actual_slop": cached_score.get("actual_slop"),
                "actual_watchability": cached_score.get("actual_watchability"),
                "watchability_percentile": cached_score.get("watchability_percentile"),
                "slop_percentile": cached_score.get("slop_percentile"),
            })

    print(f"SCORE {game_id}: starting CSV read", flush=True)

    # ---------------------------------
    # CHECK PROCESSED CSV FOR COMPLETED GAME
    # ---------------------------------

    processed = await run_in_threadpool(
        pd.read_csv,
        SPORT_CONFIG[league]["processed_output"],
        usecols=[
            "game_id",
            "actual_slop",
            "actual_watchability",
            "watchability_percentile",
            "slop_percentile",
            "home_score",
            "away_score",
        ],
    )

    print(
        f"SCORE {game_id}: CSV read took "
        f"{time.perf_counter() - score_start:.3f}s",
        flush=True,
    )

    processed["game_id"] = (
        processed["game_id"]
        .astype(str)
        .str.replace(r"\.0$", "", regex=True)
    )

    completed_game = processed[
        processed["game_id"] == str(game_id)
    ]

    if not completed_game.empty:

        completed_game = completed_game.iloc[-1]

        if pd.notna(completed_game["actual_slop"]):

            home_score = (
                int(completed_game["home_score"])
                if pd.notna(completed_game["home_score"])
                else None
            )

            away_score = (
                int(completed_game["away_score"])
                if pd.notna(completed_game["away_score"])
                else None
            )

            actual_slop = float(completed_game["actual_slop"])

            actual_watchability = (
                float(completed_game["actual_watchability"])
                if pd.notna(completed_game["actual_watchability"])
                else None
            )

            watchability_percentile = (
                float(completed_game["watchability_percentile"])
                if pd.notna(completed_game["watchability_percentile"])
                else None
            )

            slop_percentile = (
                float(completed_game["slop_percentile"])
                if pd.notna(completed_game["slop_percentile"])
                else None
            )

            print(
                f"Completed game found in processed CSV: "
                f"{league} / Game {game_id} "
                f"({home_score}-{away_score})",
                flush=True,
            )

            # ---------------------------------
            # UPDATE PER-DATE REDIS CACHE
            # ---------------------------------

            date_cache_key = make_cache_key(
                "games",
                version,
                {
                    "league": league,
                    "date": cache_date,
                    "timezone": "America/Toronto",
                }
            )

            cached_games = get_cached(date_cache_key)

            if cached_games is not None:

                for cached_game in cached_games:

                    if str(cached_game.get("game_id")) == str(game_id):

                        cached_game["home_score"] = home_score
                        cached_game["away_score"] = away_score
                        cached_game["actual_slop"] = actual_slop
                        cached_game["actual_watchability"] = actual_watchability
                        cached_game["watchability_percentile"] = watchability_percentile
                        cached_game["slop_percentile"] = slop_percentile

                        set_cached(
                            date_cache_key,
                            cached_games,
                        )

                        print(
                            f"Updated completed game in date cache: "
                            f"{league} / Game {game_id}",
                            flush=True,
                        )

                        break

            # ---------------------------------
            # UPDATE INDIVIDUAL GAME CACHE
            # ---------------------------------

            game_cache_key = make_cache_key(
                "game",
                version,
                {
                    "game_id": game_id,
                    "league": league,
                    "date": normalized_date.isoformat(),
                },
            )

            cached_game = get_cached(game_cache_key)

            if cached_game is not None:

                cached_game["home_score"] = home_score
                cached_game["away_score"] = away_score
                cached_game["actual_slop"] = actual_slop
                cached_game["actual_watchability"] = actual_watchability
                cached_game["watchability_percentile"] = watchability_percentile
                cached_game["slop_percentile"] = slop_percentile

                set_cached(
                    game_cache_key,
                    cached_game,
                )

                print(
                    f"Updated completed game detail cache: "
                    f"{league} / Game {game_id}",
                    flush=True,
                )

            set_cached(
                score_cache_key,
                {
                    "game_id": int(game_id),
                    "home_score": home_score,
                    "away_score": away_score,
                    "actual_slop": actual_slop,
                    "actual_watchability": actual_watchability,
                    "watchability_percentile": watchability_percentile,
                    "slop_percentile": slop_percentile,
                },
                ttl=86400,
            )

            return cached_response({
                "game_id": int(game_id),
                "home_score": home_score,
                "away_score": away_score,
                "actual_slop": actual_slop,
                "actual_watchability": actual_watchability,
                "watchability_percentile": watchability_percentile,
                "slop_percentile": slop_percentile,
            })

    # ---------------------------------
    # GET EXISTING REDIS SCORE
    # ---------------------------------

    cached_home_score = (
        cached_score.get("home_score")
        if cached_score is not None
        else None
    )

    cached_away_score = (
        cached_score.get("away_score")
        if cached_score is not None
        else None
    )

    # Fall back to the old per-date cache if needed
    date_cache_key = make_cache_key(
        "games",
        version,
        {
            "league": league,
            "date": cache_date,
            "timezone": "America/Toronto",
        }
    )

    cached_games = get_cached(date_cache_key)

    if cached_games is not None and cached_score is None:
        for cached_game in cached_games:
            if str(cached_game.get("game_id")) == str(game_id):
                cached_home_score = cached_game.get("home_score")
                cached_away_score = cached_game.get("away_score")
                break

    # ---------------------------------
    # ALWAYS FETCH A FRESH LIVE SCORE
    # ---------------------------------

    provider_start = time.perf_counter()
    print(f"SCORE {game_id}: fetching provider score", flush=True)

    try:
        async with LIVE_SCORE_SEMAPHORE:
            score = await run_in_threadpool(
                get_live_score,
                league,
                game_id,
                game_date,
            )
    except Exception as e:
        print(
            f"Live score provider failed: {e}",
            flush=True,
        )
        score = {}

    print(
        f"SCORE {game_id}: provider took "
        f"{time.perf_counter() - provider_start:.3f}s",
        flush=True,
    )

    score = score or {}

    home_score = (
        score.get("home_score")
        if score.get("home_score") is not None
        else cached_home_score
    )

    away_score = (
        score.get("away_score")
        if score.get("away_score") is not None
        else cached_away_score
    )

    # ---------------------------------
    # UPDATE DEDICATED LIVE SCORE CACHE
    # ---------------------------------

    if (
        score.get("home_score") is not None
        or score.get("away_score") is not None
    ):
        set_cached(
            score_cache_key,
            {
                "game_id": int(game_id),
                "home_score": home_score,
                "away_score": away_score,
                "actual_slop": None,
                "actual_watchability": None,
                "watchability_percentile": None,
                "slop_percentile": None,
                "fetched_at": time.time(),
            },
            ttl=86400,
        )

    # ---------------------------------
    # UPDATE PER-DATE REDIS CACHE
    # ---------------------------------

    if cached_games is not None:

        for cached_game in cached_games:

            if str(cached_game.get("game_id")) == str(game_id):

                cached_game["home_score"] = home_score
                cached_game["away_score"] = away_score

                set_cached(
                    date_cache_key,
                    cached_games,
                )

                break

    # ---------------------------------
    # UPDATE INDIVIDUAL GAME CACHE
    # ---------------------------------

    game_cache_key = make_cache_key(
        "game",
        version,
        {
            "game_id": game_id,
            "league": league,
            "date": normalized_date.isoformat(),
        },
    )

    cached_game = get_cached(game_cache_key)

    if cached_game is not None:

        cached_game["home_score"] = home_score
        cached_game["away_score"] = away_score

        set_cached(
            game_cache_key,
            cached_game,
        )

    print(
        f"SCORE {game_id}: total took "
        f"{time.perf_counter() - score_start:.3f}s",
        flush=True,
    )

    return cached_response({
        "game_id": int(game_id),
        "home_score": home_score,
        "away_score": away_score,
        "actual_slop": None,
        "actual_watchability": None,
        "watchability_percentile": None,
        "slop_percentile": None,
    })

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

    version = get_request_cache_version(request)

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