from dotenv import load_dotenv
from pathlib import Path
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from lock import lock
import re
import numpy as np
import time

from config.sports import SPORT_CONFIG, SPORT_LEAGUES, GAME_FEATURES
from services.update_data import update_data
from services.model import train_model
from services.teams import get_teams

from services.games import get_games
from services.predict import predict

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env.local")

app = Flask(__name__)
CORS(app)

@app.route("/api/update", methods=["POST"])
def update():

    # Authenticate request
    provided_secret = request.headers.get("X-Update-Secret")
    expected_secret = os.environ.get("UPDATE_KEY")

    if not expected_secret or provided_secret != expected_secret:
        return jsonify({
            "success": False,
            "error": "Unauthorized"
        }), 401
    
    try: 

        with lock:

            # Fetch new data for each league
            for league in SPORT_CONFIG:
                update_data(league=league)

            # Retrain each model using updated data
            for league in SPORT_CONFIG:
                train_model(league=league)

        # Success
        return jsonify({
            "success": True,
            "message": "Data updated and models retrained."
        }), 200

    # Error
    except Exception as e:
        print(f"Update failed: {e}")

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500



@app.route("/api/games",methods=["GET"])
def games():

    start_time = time.perf_counter()

    league = request.args.get("league")
    sport = request.args.get("sport")
    start_date = request.args.get("start")
    end_date = request.args.get("end")
    team = request.args.get("team")
    game_id = request.args.get("id")

    # ---------------------------------
    # GETTING SPORT OR LEAGUE
    # ---------------------------------
    if sport:
        leagues = SPORT_LEAGUES.get(sport.lower())

        if leagues is None:
            return jsonify({
                "error": f"Unknown sport: {sport}"
            }), 400

    elif league:

        if league not in SPORT_CONFIG:
            return jsonify({
                "error": f"Unknown league: {league}"
            }), 400

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

        predictions = predict(
            start_date=prediction_date,
            league=league,
            days_ahead=days_ahead,
        )

        if predictions.empty:
            continue

        predictions["game_id"] = (
            predictions["game_id"].astype(str)
        )

        # Select cols
        league_games = predictions[GAME_FEATURES].copy()

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
        print(f"Games took {time.perf_counter() - start_time:.3f}s")
        return jsonify([])

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

    return jsonify(
        games.to_dict(orient="records")
    )

@app.route("/api/team/<league>/<team_slug>", methods=["GET"])
def team(league, team_slug):

    start_time = time.perf_counter()

    team_id = request.args.get("id")

    if league not in SPORT_CONFIG:
        return jsonify({
            "error": f"Unknown league: {league}"
        }), 400

    now = pd.Timestamp.now("UTC")

    # ---------------------------------
    # GET CURRENT SEASON GAMES
    # ---------------------------------

    # Get past year of games + next 30 days
    games = predict(
        start_date=now - pd.Timedelta(days=365),
        days_ahead=395,
        league=league,
    )

    if games.empty:
        return jsonify({
            "error": "No games found"
        }), 404

    games["date"] = pd.to_datetime(
        games["date"],
        utc=True,
        errors="coerce"
    )

    # ---------------------------------
    # GET TEAMS
    # ---------------------------------

    team_names = pd.concat([
        games["home_name"],
        games["away_name"]
    ]).dropna().unique()

    team_name = next(
        (
            name
            for name in team_names
            if slugify(name) == team_slug
        ),
        None
    )

    if team_name is None:
        return jsonify({
            "error": "Team not found"
        }), 404

    # Make sure id belongs to team if provided
    if team_id:
        team_id = str(team_id).strip()

        team_ids = games[
            (games["home_name"] == team_name) |
            (games["away_name"] == team_name)
        ].copy()

        valid_ids = pd.concat([
            team_ids["home_id"],
            team_ids["away_id"]
        ]).dropna().astype(str).str.strip().unique()

        if team_id not in valid_ids:
            return jsonify({
                "error": "Team ID does not match team name"
            }), 404

    if team_id:
        team_mask = (
            ((games["home_name"] == team_name) & (games["home_id"].astype(str) == team_id)) |
            ((games["away_name"] == team_name) & (games["away_id"].astype(str) == team_id))
        )
    else:
        team_mask = (
            (games["home_name"] == team_name) |
            (games["away_name"] == team_name)
        )

    # ---------------------------------
    # DETERMINE REGULAR SEASON 
    # ---------------------------------

    if "season_type" in games.columns:

        regular_season = games["season_type"] == 2

    elif "season_id" in games.columns:

        regular_season = games["season_id"] % 3 == 2

    else:

        regular_season = games["is_postseason"] == 0

    # ---------------------------------
    # DETERMINE CURRENT SEASON 
    # ---------------------------------

    completed_regular = games[
        regular_season &
        games["date"].notna() &
        (games["date"] <= now) &
        games["season"].notna() &
        games["home_score"].notna() &
        games["away_score"].notna()
    ].copy()

    if completed_regular.empty:
        return jsonify({
            "error": "Unable to determine current season"
        }), 404

    current_season = (
        completed_regular["season"]
        .astype(int)
        .max()
    )

    # ---------------------------------
    # ALL TEAM GAMES
    # ---------------------------------

    team_games = games[
        team_mask &
        games["date"].notna()
    ].copy()

    # ---------------------------------
    # RECENT GAMES
    # ---------------------------------

    recent_games = (
        team_games[
            (team_games["date"] < now) &
            team_games["home_score"].notna() &
            team_games["away_score"].notna()
        ]
        .sort_values("date", ascending=False)
        .head(15)
        .copy()
    )

    # ---------------------------------
    # CURRENT SEASON GAMES
    # ---------------------------------

    current_season_games = team_games[
        (pd.to_numeric(team_games["season"], errors="coerce") == current_season) &
        regular_season.loc[team_games.index] &
        (team_games["date"] < now) &
        team_games["home_score"].notna() &
        team_games["away_score"].notna()
    ].copy()

    # ---------------------------------
    # RECORD
    # ---------------------------------

    if current_season_games.empty:

        wins = 0
        losses = 0
        games_played = 0
        win_pct = 0.0
        point_diff = 0

    else:

        if team_id:
            is_home = (
                (current_season_games["home_name"] == team_name) &
                (current_season_games["home_id"].astype(str) == team_id)
            )
        else:
            is_home = current_season_games["home_name"] == team_name

        current_season_games["team_score"] = np.where(
            is_home,
            current_season_games["home_score"],
            current_season_games["away_score"],
        )

        current_season_games["opponent_score"] = np.where(
            is_home,
            current_season_games["away_score"],
            current_season_games["home_score"],
        )

        current_season_games["win"] = (
            current_season_games["team_score"] >
            current_season_games["opponent_score"]
        )

        wins = int(current_season_games["win"].sum())

        games_played = len(current_season_games)

        losses = games_played - wins

        win_pct = wins / games_played

        point_diff = int(
            (
                current_season_games["team_score"] -
                current_season_games["opponent_score"]
            ).sum()
        )

    # ---------------------------------
    # TEAM BADNESS
    # ---------------------------------

    team_badness = None

    completed_team_games = team_games[
        (team_games["date"] < now) &
        team_games["season"].notna() &
        team_games["home_score"].notna() &
        team_games["away_score"].notna()
    ]

    if not completed_team_games.empty:

        latest_team_game = (
            completed_team_games
            .sort_values("date")
            .iloc[-1]
        )

        if team_id:
            is_home = (
                latest_team_game["home_name"] == team_name and
                str(latest_team_game["home_id"]).strip() == team_id
            )
        else:
            is_home = latest_team_game["home_name"] == team_name

        if is_home:
            team_badness = latest_team_game["home_badness"]
        else:
            team_badness = latest_team_game["away_badness"]

    # ---------------------------------
    # UPCOMING GAMES
    # ---------------------------------

    if team_id:
        prediction_team_mask = (
            ((games["home_name"] == team_name) & (games["home_id"].astype(str) == team_id)) |
            ((games["away_name"] == team_name) & (games["away_id"].astype(str) == team_id))
        )
    else:
        prediction_team_mask = (
            (games["home_name"] == team_name) |
            (games["away_name"] == team_name)
        )

    upcoming_games = games[
        prediction_team_mask &
        (games["date"] >= now)
    ].copy()


    # ---------------------------------
    # NORMALIZE GAME COLUMNS
    # ---------------------------------

    for df in [recent_games, upcoming_games]:

        if df.empty:
            continue

        for column in GAME_FEATURES:

            if column not in df.columns:
                df[column] = None

    if recent_games.empty:
        recent_games = pd.DataFrame(
            columns=GAME_FEATURES
        )
    else:
        recent_games = recent_games[GAME_FEATURES]

    if upcoming_games.empty:
        upcoming_games = pd.DataFrame(
            columns=GAME_FEATURES
        )
    else:
        upcoming_games = upcoming_games[GAME_FEATURES]

    # ---------------------------------
    # JSON SERIALIZATION
    # ---------------------------------

    if not recent_games.empty:
        recent_games["date"] = recent_games["date"].astype(str)
        recent_games = recent_games.astype(object).where(
            pd.notna(recent_games),
            None
        )

    if not upcoming_games.empty:
        upcoming_games["date"] = upcoming_games["date"].astype(str)
        upcoming_games = upcoming_games.astype(object).where(
            pd.notna(upcoming_games),
            None
        )

    team_full_name = next(
        (
            name
            for name in pd.concat([
                games.loc[
                    games["home_name"] == team_name,
                    "home_full_name"
                ],
                games.loc[
                    games["away_name"] == team_name,
                    "away_full_name"
                ],
            ]).dropna().unique()
        ),
        team_name
    )

    elapsed = time.perf_counter() - start_time
    print(f"Team took {elapsed:.3f}s")

    # ---------------------------------
    # RETURN
    # ---------------------------------

    return jsonify({
        "team": {
            "name": team_name,
            "full_name": team_full_name,
        },
        "team_badness": (
            float(team_badness)
            if pd.notna(team_badness)
            else None
        ),

        "league": league,
        "season": str(current_season),

        "record": {
            "wins": wins,
            "losses": losses,
        },

        "win_pct": float(win_pct),
        "point_diff": point_diff,
        "games_played": games_played,

        "recent_games": recent_games.to_dict(
            orient="records"
        ),

        "upcoming_games": upcoming_games.to_dict(
            orient="records"
        ),
    })

@app.route("/api/teams", methods=["GET"])
def teams():
    league = request.args.get("league")

    if not league:
        return jsonify({"error": "league is required"}), 400

    if league not in SPORT_CONFIG:
        return jsonify({"error": "invalid league"}), 400

    return jsonify(get_teams(league))

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)