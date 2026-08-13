# Slop Watch

**Predicting the sloppiest games in sports — so you know when not to watch.**

Slop Watch is an ML-powered sports prediction application that predicts which upcoming games are most likely to be the **worst games of the season**.

Using historical sports data and machine learning, Slop Watch analyzes upcoming matchups and estimates which games are most likely to be boring, uncompetitive, low-scoring, or otherwise deserving of the title of **slop**.

When Slop Watch identifies a game worth avoiding, users can also **add the game to their calendar** so they know exactly when the slop is coming.

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
│   │
│   └── services/
│       ├── data.py        # Loads and converts raw CSV data into DataFrames
│       ├── games.py       # Provides game data and team performance data
│       ├── slop.py        # Calculates the actual slop of completed games
│       └── predict.py     # Predicts slop using pre-game team performance
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

- Sportsipy — sports data collection
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
 ┌───────────────┬────────────────┐
 ↓               ↓                ↓
slop.py       predict.py       ML Model
 ↓               ↓                ↓
Actual Slop   Predicted Slop
        \       /
         \     /
          ↓   ↓
    Prediction Error
          ↓
   Future Predictions
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
sportsipy
pandas
numpy
scikit-learn
flask
flask-cors
joblib
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

The initial model will predict characteristics of upcoming games such as:

- Expected home score
- Expected away score
- Expected margin
- Probability of a close game
- Expected competitiveness
- Overall game quality

These predictions can then be used to calculate the game's **Slop Score**.

The model will eventually be evaluated against historical seasons to determine how accurately it can identify bad games before they happen.

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

🚧 **Early Development**

- [x] Set up the Python backend
- [x] Collect historical NBA data
- [x] Build the initial Pandas dataset
- [x] Create game and team performance processing
- [x] Define an initial Slop Score
- [x] Calculate actual game slop
- [x] Calculate predicted game slop
- [ ] Compare predicted slop against actual slop
- [ ] Measure prediction error
- [ ] Train an initial ML model
- [ ] Evaluate model performance
- [ ] Create the Flask API
- [ ] Connect the React frontend
- [ ] Implement calendar integration
- [ ] Support multiple calendar providers
- [ ] Support multiple sports

## Future Goals

- Predict the sloppiest game of an entire season
- Support multiple sports and leagues
- Explain why a game is predicted to be slop
- Display confidence scores
- Compare predictions with actual game results
- Track model accuracy over time
- Build a historical database of the worst games
- Develop sport-specific Slop Scores
- Improve predictions with additional data sources
- Allow users to add slop games directly to their calendar
- Support Google Calendar, Apple Calendar, and Outlook
- Provide personalized slop recommendations

## The Goal

Sports are full of great games.

Slop Watch exists to find the ones you should **not** watch.

And if you're brave enough to watch them anyway, **put them on your calendar.**
