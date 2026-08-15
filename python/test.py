from services.games import get_games, get_performance, get_future_games
from services.slop import get_slop
from services.predict import predict_slop

import pandas as pd

LEAGUE = "nfl"

TEST_DATE = pd.Timestamp(
    "2026-08-14",
    tz="UTC",
)


def main():

    league = LEAGUE

    print("=" * 60)
    print(f"TESTING {league.upper()}")
    print("=" * 60)

    # ---------------------------------
    # GET HISTORICAL GAMES
    # ---------------------------------

    print("\n1. Getting games...")

    games = get_games(league=league)

    print(f"Games: {len(games)}")

    if games.empty:
        raise RuntimeError(
            f"No {league.upper()} games found."
        )

    print(games.head(3).to_string(index=False))

    # ---------------------------------
    # GET PERFORMANCE
    # ---------------------------------

    print("\n2. Getting performance...")

    performance = get_performance(
        league=league
    )

    print(f"Performance rows: {len(performance)}")

    if performance.empty:
        raise RuntimeError(
            f"No {league.upper()} performance data found."
        )

    print(
        performance.head(3).to_string(index=False)
    )

    # ---------------------------------
    # GET SLOP
    # ---------------------------------

    print("\n3. Getting slop...")

    slop = get_slop(
        league=league
    )

    print(f"Slop games: {len(slop)}")

    if slop.empty:
        raise RuntimeError(
            f"No {league.upper()} slop data found."
        )

    print(
        slop[
            [
                "date",
                "home_name",
                "away_name",
                "actual_slop",
            ]
        ]
        .head(5)
        .to_string(index=False)
    )

    # ---------------------------------
    # GET FUTURE GAMES
    # ---------------------------------

    print("\n4. Getting future games...")

    future_games = get_future_games(
        prediction_date=TEST_DATE,
        league=league,
        days_ahead=30,
    )

    print(f"Future games: {len(future_games)}")

    if future_games.empty:
        print(
            f"No future {league.upper()} games found."
        )
        return

    # ---------------------------------
    # PREDICT
    # ---------------------------------

    print("\n5. Predicting slop...")

    predictions = predict_slop(
        prediction_date=TEST_DATE,
        league=league,
    )

    print(f"Predictions: {len(predictions)}")

    if predictions.empty:
        raise RuntimeError(
            f"No {league.upper()} predictions generated."
        )

    print(
        predictions[
            [
                "date",
                "home_name",
                "away_name",
                "predicted_slop",
            ]
        ]
        .head(10)
        .to_string(index=False)
    )

    print("\n" + "=" * 60)
    print(f"{league.upper()} TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()