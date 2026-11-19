from config.sports import SPORT_CONFIG
from services.update_data import update_all_models, update_all_data


if __name__ == "__main__":
    update_all_data()
    update_all_models()