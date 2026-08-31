import joblib
from pathlib import Path
import os

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

from services.slop import get_slop
from config.sports import SPORT_CONFIG

def train_model(league="nba"):

    actual_slop = get_slop(league=league)

    # ---------------------------------
    # SORT DATA BY DATE
    # ---------------------------------

    actual_slop = actual_slop.sort_values("date").reset_index(drop=True)

    # ---------------------------------
    # FEATURES
    # ---------------------------------

    features = [
        "home_id",
        "away_id",
        "home_win_pct",
        "away_win_pct",
        "home_point_diff",
        "away_point_diff",
        "home_recent_win_pct",
        "away_recent_win_pct",
        "home_recent_point_diff",
        "away_recent_point_diff",
        "month",
        "day",
        "year",
    ]

    targets = [
        "actual_slop",
        "actual_watchability",
    ]

    X = actual_slop[features]
    Y = actual_slop[targets]

    # Remove games where pre-game statistics are unavailable
    valid = (
        X.notna().all(axis=1) &
        Y.notna().all(axis=1)
    )

    X = X[valid].reset_index(drop=True)
    Y = Y[valid].reset_index(drop=True)

    # ---------------------------------
    # TRAIN / TEST SPLIT
    # ---------------------------------

    split_index = int(len(X) * 0.8)
    X_train = X.iloc[:split_index]
    Y_train = Y.iloc[:split_index]

    X_test = X.iloc[split_index:]
    Y_test = Y.iloc[split_index:]

    # ---------------------------------
    # TRAIN MODEL
    # ---------------------------------
    model = RandomForestRegressor(
        n_estimators=200, 
        random_state=42,
    )

    model.fit(
        X_train, 
        Y_train,
    )

    # ---------------------------------
    # TEST MODEL
    # ---------------------------------
    predictions = model.predict(X_test)

    all_predictions = model.predict(X)

    # Save the distribution of historical model predictions
    prediction_distribution = {
        "slop": all_predictions[:, 0],
        "watchability": all_predictions[:, 1],
    }

    joblib.dump(
        prediction_distribution,
        f"models/{league}_prediction_distribution.pkl"
    )

    slop_error = mean_absolute_error(
        Y_test["actual_slop"],
        predictions[:, 0],
    )

    watchability_error = mean_absolute_error(
        Y_test["actual_watchability"],
        predictions[:, 1],
    )

    print(
        f"Slop MAE: {slop_error:.4f}"
    )

    print(
        f"Watchability MAE: {watchability_error:.4f}"
    )

    # ---------------------------------
    # SAVE MODEL
    # ---------------------------------

    model_path = Path(f"models/{league}_slop_model.pkl")
    temp_path = Path(f"models/{league}_slop_model.pkl.tmp")

    joblib.dump(
        model,
        temp_path
    )

    os.replace(
        temp_path,
        model_path
    )

    print(f"{league.upper()} model saved.")


if __name__ == "__main__":
    for league in SPORT_CONFIG:
        print(f"\nTraining {league.upper()} model...")
        train_model(league=league)