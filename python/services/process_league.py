from pathlib import Path
import os

from services.slop import get_slop
from config.sports import SPORT_CONFIG


def process_league(league):
    config = SPORT_CONFIG[league]

    games = get_slop(league=league)

    output_path = Path(config["processed_output"])
    output_path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = output_path.with_suffix(".tmp")
    games.to_csv(temp_path, index=False)
    os.replace(temp_path, output_path)

    print(f"Processed {league}: {len(games)} games")

if __name__ == "__main__":
    for league in SPORT_CONFIG:
        process_league(league)