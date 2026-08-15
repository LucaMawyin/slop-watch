# Slop Watch

**Predicting the sloppiest games in sports — so you know when not to watch.**

Slop Watch is an ML-powered sports prediction application that predicts which upcoming games are most likely to be the **worst games of the season**.

Using historical sports data and machine learning, Slop Watch analyzes upcoming matchups and estimates which games are most likely to be boring, uncompetitive, low-scoring, or otherwise deserving of the title of **slop**.

When Slop Watch identifies a game worth avoiding, users can also **add the game to their calendar** so they know exactly when the slop is coming.

## Website

**[Try Slop Watch](https://slopwatchsports.vercel.app/)** — Try Slop Watch and see which upcoming games are predicted to be the sloppiest.

## Project Structure

```text
slop-watch/
├── src/                    # React frontend
│
├── python/                 # Flask backend and ML code
│   ├── .venv/             # Python virtual environment
│   ├── app.py             # Flask application
│   ├── requirements.txt   # Python dependencies
│   │
│   ├── data/
│   │   ├── raw/           # Raw historical sports data
│   │   └── processed/     # Processed data used by the application
│   │
│   ├── models/            # Trained ML models
│   |   └── slop_model.pkl
│   │
│   └── services/
│       ├── data.py        # Loads and converts raw sports data into DataFrames
│       ├── games.py       # Provides game data and pre-game team performance
│       ├── slop.py        # Calculates the actual Slop Score for completed games
│       ├── model.py       # Trains and saves the Slop Score model
│       └── predict.py     # Predicts Slop Score using pre-game team performance
│
├── package.json            # React dependencies
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

Slop Watch follows a pipeline from historical data to predictions:

```text
Historical Sports Data
        ↓
     data.py
        ↓
     games.py
        ↓
     slop.py
        ↓
   Actual Slop
        ↓
    model.py
        ↓
 Random Forest Model
        ↓
 slop_model.pkl
        ↓
    predict.py
        ↓
 Predicted Slop
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
│ 🚨 HIGH SLOP WARNING            │
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
- Reason for the prediction
- Game information

The goal is to make it easy for users to keep track of games they have been warned about — whether they want to **avoid the slop or watch it anyway**.

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

The trained model is saved as:

python/models/slop_model.pkl

`predict.py` loads this model and uses current pre-game team performance
to estimate the Slop Score of upcoming games.

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

### Current Status

Replace your current checklist with:

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
- [ ] Develop sport-specific Slop Scores

## Future Goals

- Predict the sloppiest game of an entire season
- Explain why a game is predicted to be slop
- Display confidence scores
- Compare predictions with actual game results
- Track model accuracy over time
- Build a historical database of the worst games
- Develop sport-specific Slop Scores
- Improve predictions with additional data sources
- Provide personalized slop recommendations

## The Goal

Sports are full of great games.

Slop Watch exists to find the ones you should **not** watch.

And if you're brave enough to watch them anyway, **put them on your calendar.**

```

```
