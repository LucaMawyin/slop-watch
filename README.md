# [Slop Watch](https://slopwatchsports.vercel.app/)

**Predicting the sloppiest games in sports — so you know when not to watch.**

Slop Watch is an ML-powered sports prediction application that predicts which upcoming games are most likely to be the **worst games of the season**.

Using historical sports data and machine learning, Slop Watch analyzes upcoming matchups and estimates which games are most likely to be boring, uncompetitive, low-scoring, or otherwise deserving of the title of **slop**.

When Slop Watch identifies a game worth avoiding, users can also **add the game to their calendar** so they know exactly when the slop is coming.

## Website

**[Try Slop Watch](https://slopwatchsports.vercel.app/)** — Try Slop Watch and see which upcoming games are predicted to be the sloppiest.

## Project Structure

```
slop-watch/

├── src/                          # React frontend
│   ├── games/                    # Games list
│   └── [league]/
│       ├── teams/
│       │   └── [team]/           # Team pages
│       └── preview/
│           └── [id]/             # Game preview pages
│
├── python/                       # Flask backend and ML code
│   ├── .venv/                    # Python virtual environment
│   ├── app.py                    # Flask application and API routes
│   ├── lock.py                   # Handles data/model locking and update coordination
│   ├── requirements.txt          # Python dependencies
│   │
│   ├── config/                   # Application and league configuration
│   │   ├── __init__.py
│   │   └── sports.py             # Sports and league configuration
│   │
│   ├── data/
│   │   ├── raw/                  # Raw historical sports data
│   │   └── processed/            # Processed data used by the application
│   │
│   ├── models/                   # Trained ML models and prediction data
│   │   ├── league_slop_model
│   │   └── league_prediction_distribution
│   │
│   └── services/
│       ├── data.py               # Loads and converts raw sports data into DataFrames
│       ├── games_old.py          # DEPRECATED: Previous game data implementation
│       ├── games.py              # Provides game data and pre-game team performance
│       ├── teams.py              # Provides team data and team performance statistics
│       ├── slop.py               # Calculates the actual Slop Score for completed games
│       ├── model.py              # Trains and saves the Slop Score model
│       ├── predict.py            # Predicts Slop Score using pre-game team performance
│       ├── process_leagues.py    # Processes data for individual sports leagues
│       ├── update_data.py        # Collects and updates historical sports data
│       └── update_manual.py      # Manually updates data and retrains the models
│
├── package.json                  # React dependencies
└── .gitignore
```

## Tech Stack

### Frontend

- React
- TypeScript

### Backend

- Python
- Flask
- Flask-CORS

### Data & Machine Learning

- Sportsdataverse — sports data collection
- Pandas — data processing
- NumPy — numerical operations
- Scikit-learn — machine learning
- Joblib — model serialization

### Calendar Integration

Slop Watch will allow users to add predicted slop games directly to their calendar.

Calendar integration may support services such as:

- Google Calendar
- Apple Calendar
- Microsoft Outlook

## How It Works

Slop Watch uses a machine learning pipeline to turn historical game data into predictions for upcoming games.

```text
Historical Sports Data
        ↓
     data.py
        ↓
  Processed Data
        ↓
     games.py
        ↓
Pre-Game Team Performance
        ↓
     slop.py
        ↓
   Actual Slop Score
        ↓
     model.py
        ↓
 Random Forest Model
        ↓
  slop_model.pkl
        ↓
    predict.py
        ↓
 Predicted Slop Score
        ↓
    Flask API
        ↓
 React Frontend
        ↓
Calendar Integration
```

The model learns from historical games and uses information available **before a game is played** to predict how likely an upcoming matchup is to be slop.

Users can then view predicted games and add them to their calendar.

## What Makes a Game Slop?

The exact definition of slop is still being developed.

Potential factors include:

- Expected competitiveness
- Expected scoring
- Expected point/goal/run differential
- Team quality
- Recent team performance
- Importance of the game
- Likelihood of a blowout
- Other sport-specific factors

These factors will eventually be combined into a **Slop Score**.

A higher Slop Score means a game is predicted to be worse.

Different sports may use different factors when determining slop. What makes an awful NBA game isn't necessarily what makes an awful baseball, hockey, or soccer game.

## Calendar Integration

One of Slop Watch's main features is the ability to add predicted slop games to a user's calendar.

For example:

```text
┌─────────────────────────────────┐
│ HIGH SLOP WARNING               │
│                                 │
│ Team A vs. Team B               │
│ Saturday, 7:30 PM               │
│                                 │
│ Slop Score: 92/100              │
│                                 │
│ [ Add to Calendar ]             │
└─────────────────────────────────┘
```

A calendar event can include relevant information such as:

- Teams
- Game date and time
- Venue
- Slop Score
- Prediction
- Game information

The goal is to make it easy for users to keep track of games they have been warned about — whether they want to **avoid the slop or watch it anyway**.

## Game & Team Pages

Slop Watch provides dedicated pages for both **games** and **teams**, giving users more context behind Slop Score predictions.

### Game Preview Pages

Each game has its own page where users can view information about the matchup, including:

- Teams
- Game date and time
- Venue
- Predicted Slop Score
- Game details
- Pre-game team performance
- Other relevant prediction information

Game pages provide a more detailed view of an individual matchup beyond the main list of upcoming games.

### Team Pages

Each team has its own page containing information about the team's performance and history.

Team pages can include:

- Team information
- Recent performance
- Season statistics
- Upcoming games
- Previous games
- Slop-related statistics

Together, game preview and team pages allow users to explore **why a game is predicted to be slop** and understand the teams involved.

## Development

### 1. Clone the repository

```bash
git clone https://github.com/LucaMawyin/slop-watch
cd slop-watch
```

### 2. Set up the Python environment

Navigate to the backend:

```bash
cd python
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Flask backend

```bash
python app.py
```

The Flask backend will provide the API that the React frontend will eventually use.

## Python Dependencies

The backend currently uses:

```text
pandas
numpy
scikit-learn
flask
flask-cors
joblib
sportsdataverse
python-dotenv
filelock
```

Install them with:

```bash
pip install -r requirements.txt
```

## Data

Historical sports data is collected using Sportsipy.

Raw data is stored in:

```text
python/data/raw/
```

Processed datasets are stored in:

```text
python/data/processed/
```

Raw datasets should remain unchanged. Data cleaning and feature engineering should produce separate processed datasets.

## Machine Learning

Slop Watch currently uses a Random Forest regression model to predict the
Slop Score of upcoming games.

The model uses statistics that are available before a game is played,
including:

- Home team win percentage
- Away team win percentage
- Home team point differential
- Away team point differential
- Home team recent win percentage
- Away team recent win percentage
- Home team recent point differential
- Away team recent point differential

The model is trained on historical games using the actual Slop Score
calculated by `slop.py` as the target.

The trained models are stored in:

```
python/models/
```

Each league has its own trained model:

```
league_slop_model.pkl
```

## Prediction

`predict.py` loads the appropriate league model and uses the most recent pre-game team performance to predict the Slop Score of upcoming games.

## League Prediction Distributions

Slop Watch maintains a **prediction distribution for each supported league**.

The league prediction distribution shows how predicted Slop Scores are distributed across games within that league. This allows individual predictions to be evaluated relative to the typical predictions for that specific league.

League-specific models and prediction distributions are stored separately so that different sports can have their own prediction ranges and characteristics.

```
python/models/
├── league_slop_model.pkl
└── league_prediction_distribution
```

This makes it possible to determine not only a game's predicted Slop Score, but also how unusually high or low that prediction is compared with other games in the same league.

## Avoiding Data Leakage

Predictions must only use information that would have been available **before the game begins**.

For example, when predicting a November game, the model can use:

- Previous game results
- Previous team statistics
- Current standings
- Recent performance
- Rest days
- Other pre-game information

It must not use information from games that have not happened yet.

This is particularly important when training and testing the model. A model that accidentally sees future information can appear extremely accurate while being useless in practice.

## Current Status

🚧 **Active Development**

### Data & Machine Learning

- [x] Set up the Python backend
- [x] Collect historical sport data
- [x] Build the initial Pandas dataset
- [x] Create game and team performance processing
- [x] Define an initial Slop Score
- [x] Calculate actual game slop
- [x] Calculate predicted game slop
- [x] Measure prediction error
- [x] Train an initial Random Forest model
- [ ] Perform more comprehensive model evaluation
- [ ] Improve the Slop Score definition
- [ ] Add additional predictive features
- [ ] Account for important player availability

### API & Frontend

- [x] Create Flask API
- [x] Expose upcoming game predictions
- [x] Connect the React frontend to the API
- [ ] Add prediction explanations
- [ ] Add confidence estimates

### Calendar

- [x] Add games to calendar
- [x] Support Google Calendar
- [x] Support Apple Calendar
- [x] Support Microsoft Outlook

### Sports

- [x] Initial NBA support
- [x] Support MLB
- [x] Support NFL
- [x] Support NHL
- [x] Develop sport-specific Slop Scores

## Future Goals

- Predict the sloppiest game of an entire season
- Explain why a game is predicted to be slop
- Display confidence scores
- Compare predictions with actual game results

## The Goal

Sports are full of great games.

Slop Watch exists to find the ones you should **not** watch.

And if you're brave enough to watch them anyway, **put them on your calendar.**
