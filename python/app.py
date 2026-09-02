from dotenv import load_dotenv
from pathlib import Path
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from lock import lock
import re

from services.predict import predict_slop
from config.sports import SPORT_CONFIG, SPORT_LEAGUES
from services.update_data import update_data
from services.model import train_model
from services.slop import get_slop



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

    league = request.args.get("league")
    sport = request.args.get("sport")
    start_date = request.args.get("start")
    end_date = request.args.get("end")
    team = request.args.get("team")

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
        prediction_date = pd.Timestamp(start_date, tz="UTC")
    else:
        prediction_date = pd.Timestamp.now(tz="UTC")

    if end_date:
        end_date = pd.Timestamp(end_date, tz="UTC")

        days_ahead = (
            end_date.normalize() - prediction_date.normalize()
        ).days
    else:
        days_ahead = 7

    all_games = []

    for league in leagues:

        historical = get_slop(league=league)
        predictions = predict_slop(
            prediction_date=prediction_date,
            league=league,
            days_ahead=days_ahead,
        )

        if predictions.empty:
            continue

        predictions["game_id"] = predictions["game_id"].astype(str)
        historical["game_id"] = historical["game_id"].astype(str)

        predictions = predictions.merge(
            historical[[
                "game_id", 
                "actual_slop",
                "slop_percentile",
                "actual_watchability",
                "watchability_percentile"
            ]].rename(
                columns={
                    "slop_percentile": "actual_slop_percentile",
                    "watchability_percentile": "actual_watchability_percentile",
                }
            ),
            on="game_id",
            how="left",
        )

        predictions["slop_percentile"] = (
            predictions["actual_slop_percentile"]
            .fillna(predictions["slop_percentile"])
        )

        predictions["watchability_percentile"] = (
            predictions["actual_watchability_percentile"]
            .fillna(predictions["watchability_percentile"])
        )

        league_games = predictions[
            [
                # Game information
                "game_id",
                "date",
                "home_name",
                "away_name",
                "venue_full_name",
                "is_postseason",

                # Score
                "home_score",
                "away_score",

                # Slop
                "predicted_slop",
                "actual_slop",
                "slop_percentile",

                # Watchability
                "predicted_watchability",
                "actual_watchability",
                "watchability_percentile",

                # Season performance
                "home_win_pct",
                "away_win_pct",
                "home_point_diff",
                "away_point_diff",

                # Recent performance
                "home_recent_win_pct",
                "away_recent_win_pct",
                "home_recent_point_diff",
                "away_recent_point_diff",
            ]
        ].copy()

        # Filter to team if provided
        if team:
            league_games = league_games[
                (league_games["home_name"] == team) |
                (league_games["away_name"] == team)
            ].copy()

        league_games["league"] = league

        all_games.append(league_games)

    if not all_games:
        return jsonify([])

    games = pd.concat(all_games, ignore_index=True)

    games["date"] = games["date"].astype(str)
    games = games.astype(object).where(pd.notna(games), None)

    return jsonify(
        games.to_dict(orient="records")
    )

@app.route("/api/team/<league>/<team_slug>", methods=["GET"])
def team(league, team_slug):

    if league not in SPORT_CONFIG:
        return jsonify({
            "error": f"Unknown league: {league}"
        }), 400

    historical = get_slop(league=league)

    # Determine the current season from the most recent game
    historical["date"] = pd.to_datetime(
        historical["date"],
        utc=True,
        errors="coerce"
    )

    # ---------------------------------
    # DETERMINE REGULAR SEASON
    # ---------------------------------

    if "season_type" in historical.columns:
        # ESPN leagues
        regular_season = historical["season_type"] == 2

    elif "season_id" in historical.columns:
        # PWHL
        regular_season = historical["season_id"] % 3 == 2

    else:
        # Soccer
        regular_season = historical["is_postseason"] == 0


    # Determine current season from the most recent regular-season game
    latest_game = (
        historical.loc[
            regular_season & historical["date"].notna()
        ]
        .sort_values("date")
        .iloc[-1]
    )
    current_season = latest_game["season"]

    # Resolve slug to the actual team name
    team_names = pd.concat([
        historical["home_name"],
        historical["away_name"]
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

    # All games involving this team
    team_games_all = historical[
        (
            (historical["home_name"] == team_name) |
            (historical["away_name"] == team_name)
        ) &
        historical["date"].notna()
    ].copy()

    now = pd.Timestamp.now(tz="UTC")

    # ---------------------------------
    # RECENT GAMES
    # ---------------------------------

    recent_games = (
        team_games_all[
            (team_games_all["date"] < now) &
            team_games_all["home_score"].notna() &
            team_games_all["away_score"].notna()
        ]
        .sort_values("date", ascending=False)
        .head(15)
        .copy()
    )

    # Fields required by Game but not available for historical games
    recent_games["league"] = league
    recent_games["predicted_slop"] = None
    recent_games["predicted_watchability"] = None

    for column in [
        "actual_slop",
        "slop_percentile",
        "actual_watchability",
        "watchability_percentile",
    ]:
        if column not in recent_games.columns:
            recent_games[column] = None

    # ---------------------------------
    # UPCOMING GAMES
    # ---------------------------------

    predictions = predict_slop(
        prediction_date=now,
        league=league,
        days_ahead=30,
    )

    if not predictions.empty:

        upcoming_games = predictions[
            (
                (predictions["home_name"] == team_name) |
                (predictions["away_name"] == team_name)
            )
        ].sort_values(
            "date",
            ascending=True
        ).head(15).copy()

    else:
        upcoming_games = pd.DataFrame()

    # Fields that may not exist for future games
    for column in [
        "home_score",
        "away_score",
        "actual_slop",
        "actual_watchability",
    ]:
        if column not in upcoming_games.columns:
            upcoming_games[column] = None

    # Required by Game type
    upcoming_games["league"] = league

    game_columns = [
        # Game information
        "game_id",
        "league",
        "date",
        "home_name",
        "away_name",
        "venue_full_name",
        "is_postseason",

        # Score
        "home_score",
        "away_score",

        # Slop
        "predicted_slop",
        "actual_slop",
        "slop_percentile",

        # Watchability
        "predicted_watchability",
        "actual_watchability",
        "watchability_percentile",

        # Season performance
        "home_win_pct",
        "away_win_pct",
        "home_point_diff",
        "away_point_diff",

        # Recent performance
        "home_recent_win_pct",
        "away_recent_win_pct",
        "home_recent_point_diff",
        "away_recent_point_diff",
    ]

    recent_games = recent_games[game_columns]
    upcoming_games = upcoming_games[game_columns]

    # Convert dates / NaN for JSON
    recent_games["date"] = recent_games["date"].astype(str)
    upcoming_games["date"] = upcoming_games["date"].astype(str)

    recent_games = recent_games.astype(object).where(
        pd.notna(recent_games),
        None
    )

    upcoming_games = upcoming_games.astype(object).where(
        pd.notna(upcoming_games),
        None
    )

    # ---------------------------------
    # CURRENT SEASON RECORD
    # ---------------------------------

    # Completed regular season games in current season
    team_games = historical[
        (historical["season"] == current_season) &
        regular_season &
        (
            (historical["home_name"] == team_name) |
            (historical["away_name"] == team_name)
        ) &
        historical["home_score"].notna() &
        historical["away_score"].notna()
    ].copy()

    # No games
    if team_games.empty:
        return jsonify({
            "team": team_name,
            "league": league,
            "season": str(current_season),

            "record": {
                "wins": 0,
                "losses": 0,
            },

            "win_pct": 0.0,
            "point_diff": 0,
            "games_played": 0,

            "recent_games": recent_games.to_dict(
                orient="records"
            ),

            "upcoming_games": upcoming_games.to_dict(
                orient="records"
            ),
        })

    latest_team_game = team_games.sort_values("date").iloc[-1]

    # Team badness
    team_badness = (
        latest_team_game["home_badness"]
        if latest_team_game["home_name"] == team_name
        else latest_team_game["away_badness"]
    )

    # Determine team score in each game
    team_games["team_score"] = team_games.apply(
        lambda row:
            row["home_score"]
            if row["home_name"] == team_name
            else row["away_score"],
        axis=1
    )

    team_games["opponent_score"] = team_games.apply(
        lambda row:
            row["away_score"]
            if row["home_name"] == team_name
            else row["home_score"],
        axis=1
    )

    # Wins / losses
    team_games["win"] = (
        team_games["team_score"] > team_games["opponent_score"]
    )

    wins = int(team_games["win"].sum())
    games_played = len(team_games)
    losses = games_played - wins

    # Win percentage
    win_pct = wins / games_played

    # Point differential
    point_diff = (
        team_games["team_score"] -
        team_games["opponent_score"]
    ).sum()

    return jsonify({
        "team": team_name,
        "team_badness": float(team_badness),
        "league": league,
        "season": str(current_season),

        "record": {
            "wins": int(wins),
            "losses": int(losses),
        },

        "win_pct": float(win_pct),
        "point_diff": int(point_diff),
        "games_played": int(games_played),

        "recent_games": recent_games.to_dict(
            orient="records"
        ),

        "upcoming_games": upcoming_games.to_dict(
            orient="records"
        ),
    })

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