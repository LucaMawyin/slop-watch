import os

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

from services.predict import predict_slop
from config.sports import SPORT_CONFIG
from services.update_data import update_data
from services.model import train_model

from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env.local")

print("ROOT_DIR:", ROOT_DIR)
print("ENV EXISTS:", (ROOT_DIR / ".env.local").exists())
print("UPDATE_KEY loaded:", os.environ.get("UPDATE_KEY") is not None)
print("UPDATE_KEY length:", len(os.environ.get("UPDATE_KEY", "")))

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

    league = request.args.get("league", "nba")
    start_date = request.args.get("start")
    end_date = request.args.get("end")

    print("Search params:")
    print("league:", league)
    print("start:", start_date)
    print("end:", end_date)
    
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

    predictions = predict_slop(
        prediction_date=prediction_date,
        league=league,
        days_ahead=days_ahead,
    )

    if predictions.empty:
        return jsonify([])

    games = predictions[
        [
            # Game information
            "game_id",
            "date",
            "home_name",
            "away_name",

            # Prediction
            "predicted_slop",

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

    games["date"] = games["date"].astype(str)

    return jsonify(
        games.to_dict(orient="records")
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)