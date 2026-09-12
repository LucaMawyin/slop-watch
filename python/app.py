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

from config.sports import (
    SPORT_CONFIG,
    SPORT_LEAGUES,
    GAME_FEATURES,
    PREDICTION_FEATURES,
)
from services.update_data import update_data
from services.model import train_model
from services.teams import get_teams
from services.predict import predict
from services.live import get_live_metrics, get_live_score

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
    team_name = unslugify(team_slug)

    if league not in SPORT_CONFIG:
        return jsonify({
            "error": f"Unknown league: {league}"
        }), 400

    processed = pd.read_csv(
        SPORT_CONFIG[league]["processed_output"]
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
        if latest_game["season_type"] == 2:

            point_diff += int(team_score) - int(opponent_score)

            if team_score > opponent_score:
                wins += 1

            elif team_score < opponent_score:
                losses += 1


    # ---------------------------------
    # RECENT & UPCOMING GAMES
    # ---------------------------------

    now = pd.Timestamp.now(tz="UTC")
    start_date = now - pd.Timedelta(days=14)

    games = predict(
        league=league,
        start_date=start_date,
        days_ahead=28
    )

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

        # Sort by date
        games = games.sort_values(
            "date",
            ascending=True
        )

        # Split by date
        upcoming_games = games[
            (games["date"] > now) |
            (
                (games["date"] <= now) &
                (games["actual_slop"].isna())
            )
        ].copy()

        # Completed games only
        recent_games = games[
            (games["date"] <= now) &
            (games["actual_slop"].notna())
        ].copy()

        # Most recent games first
        recent_games = recent_games.sort_values(
            "date",
            ascending=False
        )

        # Soonest upcoming games first
        upcoming_games = upcoming_games.sort_values(
            "date",
            ascending=True
        )

        # Convert dates to ISO strings
        recent_games["date"] = recent_games["date"].dt.strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        upcoming_games["date"] = upcoming_games["date"].dt.strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        # Convert NaN to None
        recent_games = recent_games.astype(object).where(
            pd.notna(recent_games),
            None
        )

        upcoming_games = upcoming_games.astype(object).where(
            pd.notna(upcoming_games),
            None
        )

        # Convert games to JSON-safe Python values
        recent_games = [
            {
                key: json_safe(value)
                for key, value in game.items()
            }
            for game in recent_games.to_dict(orient="records")
        ]

        upcoming_games = [
            {
                key: json_safe(value)
                for key, value in game.items()
            }
            for game in upcoming_games.to_dict(orient="records")
        ]

    else:
        recent_games = []
        upcoming_games = []

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
        "recent_games": recent_games,
        "upcoming_games": upcoming_games,
    })

@app.route("/api/game/<game_id>", methods=["GET"])
def game(game_id):

    start_time = time.perf_counter()

    league = request.args.get("league")
    game_date = request.args.get("date")

    if not league:
        return jsonify({
            "error": "Missing league"
        }), 400

    if not game_date:
        return jsonify({
            "error": "Missing date"
        }), 400

    if league not in SPORT_CONFIG:
        return jsonify({
            "error": f"Unknown league: {league}"
        }), 400

    # ---------------------------------
    # GET GAME DATE
    # ---------------------------------

    try:
        game_date = pd.Timestamp(game_date).normalize()
    except Exception:
        return jsonify({
            "error": "Invalid date"
        }), 400

    # ---------------------------------
    # GET GAME PREDICTION
    # ---------------------------------

    prediction_date = (
        game_date
        - pd.Timedelta(days=1)
    )

    games = predict(
        league=league,
        start_date=prediction_date,
        days_ahead=2,
    )

    if games.empty:
        return jsonify({
            "error": "Game not found"
        }), 404

    games["game_id"] = (
        games["game_id"]
        .astype(str)
    )

    game = games[
        games["game_id"] == str(game_id)
    ].copy()

    if game.empty:
        return jsonify({
            "error": "Game not found"
        }), 404

    game = game.iloc[0]

    # ---------------------------------
    # GET LIVE SCORE
    # ---------------------------------

    live_score = get_live_score(
        league=league,
        game_id=game_id,
        game_date=game["date"],
    )

    playoff_wins = game.get(
        "playoff_wins",
        0
    )

    # ---------------------------------
    # LIVE METRICS
    # ---------------------------------

    live_metrics = get_live_metrics(
        league=league,
        home_name=game["home_name"],
        away_name=game["away_name"],
        game_date=game["date"],
        home_score=live_score["home_score"],
        away_score=live_score["away_score"],
        is_postseason=bool(game["is_postseason"]),
        playoff_wins=playoff_wins,
    )

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

    # Override predicted/CSV scores with live scores
    result["home_score"] = live_score["home_score"]
    result["away_score"] = live_score["away_score"]

    result["league"] = league

    result.update(live_metrics)

    elapsed = time.perf_counter() - start_time
    print(f"Game {game_id} took {elapsed:.3f}s")

    return jsonify(result)

@app.route("/api/game/<game_id>/score", methods=["GET"])
def game_score(game_id):

    league = request.args.get("league")
    game_date = request.args.get("date")

    if not league:
        return jsonify({
            "error": "Missing league"
        }), 400

    if not game_date:
        return jsonify({
            "error": "Missing date"
        }), 400

    if league not in SPORT_CONFIG:
        return jsonify({
            "error": f"Unknown league: {league}"
        }), 400

    try:
        game_date = pd.Timestamp(game_date).normalize()
    except Exception:
        return jsonify({
            "error": "Invalid date"
        }), 400

    score = get_live_score(
        league=league,
        game_id=game_id,
        game_date=game_date,
    )

    return jsonify({
        "game_id": str(game_id),
        "home_score": score["home_score"],
        "away_score": score["away_score"],
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)