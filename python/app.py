from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

from services.predict import predict_slop

app = Flask(__name__)
CORS(app)

@app.route("/api/games",methods=["GET"])
def games():

    league = request.args.get("league","nba")
    prediction_date = pd.Timestamp.now(tz="UTC")

    predictions = predict_slop(
        prediction_date=None,
        league=league,
        days_ahead=7,
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