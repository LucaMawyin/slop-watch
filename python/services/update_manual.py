from config.sports import SPORT_CONFIG
from services.update_data import update_data
from services.model import train_model

def update_manual():
    for league in SPORT_CONFIG:
        print(f"\n{'=' * 50}")
        print(f"Updating {league.upper()}")
        print(f"{'=' * 50}")

        update_data(league)

        print(f"Retraining {league.upper()} model...")
        train_model(league)

if __name__ == "__main__":
    update_manual()