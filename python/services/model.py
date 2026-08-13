import pandas as pd
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

from games import get_performance
from slop import get_slop

def train_model():

    # ---------------------------------
    # GET DATA
    # ---------------------------------

    performance = get_performance()
    actual_slop = get_slop()

    # ---------------------------------
    # SORT DATA BY DATE
    # ---------------------------------

    actual_slop = actual_slop.sort_values("date").reset_index(drop=True)


    # ---------------------------------
    # FEATURES
    # ---------------------------------

    home_features = performance[
        [
            "game_id",
            "team",
            "win_pct",
            "point_diff_avg",
            "recent_win_pct",
            "recent_point_diff",            
        ]
    ].rename(
        columns={
            "team": "home_name",
            "win_pct": "home_win_pct",
            "point_diff_avg": "home_point_diff",
            "recent_win_pct": "home_recent_win_pct",
            "recent_point_diff": "home_recent_point_diff",
        }
    )

    away_features = performance[
        [
            "game_id",
            "team",
            "win_pct",
            "point_diff_avg",
            "recent_win_pct",
            "recent_point_diff",            
        ]
    ].rename(
        columns={
            "team": "away_name",
            "win_pct": "away_win_pct",
            "point_diff_avg": "away_point_diff",
            "recent_win_pct": "away_recent_win_pct",
            "recent_point_diff": "away_recent_point_diff",
        }
    )

    actual_slop = actual_slop.merge(
        home_features, 
        on=["game_id", "home_name"], 
        how="left"
    ).merge(
        away_features, 
        on=["game_id", "away_name"], 
        how="left"
    )

    features = [
        "home_win_pct",
        "away_win_pct",
        "home_point_diff",
        "away_point_diff",
        "home_recent_win_pct",
        "away_recent_win_pct",
        "home_recent_point_diff",
        "away_recent_point_diff",
    ]

    X = actual_slop[features]
    Y = actual_slop["actual_slop"]

    # Remove games where pre-game statistics are unavailable
    valid = X.notna().all(axis=1)

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
    error = mean_absolute_error(
        Y_test, 
        predictions,
    )

    print(f"Mean Absolute Error: {error:.4f}")

    # ---------------------------------
    # SAVE MODEL
    # ---------------------------------
    joblib.dump(
        model,
        "models/slop_model.pkl",
    )

    print("Model saved.")


if __name__ == "__main__":
    train_model()