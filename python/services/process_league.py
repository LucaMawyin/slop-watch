from pathlib import Path
import os
import uuid
import warnings

from services.slop import get_slop
from config.sports import SPORT_CONFIG
from pandas.errors import DtypeWarning

warnings.filterwarnings("ignore", category=DtypeWarning)


def process_league(league, raw_path=None, output_path=None):
    config = SPORT_CONFIG[league]

    raw_path = Path(raw_path or config["output"])
    output_path = Path(output_path or config["processed_output"])

    if raw_path.resolve() == output_path.resolve():
        raise ValueError("Raw and processed dataset paths cannot be the same")

    # Read and process the specified raw dataset
    games = get_slop(
        league=league,
        raw_path=raw_path,
    )

    # Remove duplicate games
    games["game_id"] = (
        games["game_id"]
        .astype(str)
        .str.strip()
    )

    games = games.drop_duplicates(
        subset="game_id",
        keep="last"
    ).reset_index(drop=True)

    # Atomically replace the specified processed dataset
    output_path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = output_path.with_name(
        f"{output_path.stem}_{uuid.uuid4().hex}.tmp"
    )

    try:
        games.to_csv(temp_path, index=False)
        os.replace(temp_path, output_path)
    finally:
        if temp_path.exists():
            temp_path.unlink()

    print(f"Processed {league}: {len(games)} games")


if __name__ == "__main__":
    for league in SPORT_CONFIG:
        process_league(league)
