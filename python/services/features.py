"""

This module calculates the slop score for a game as follows:

Slop Score = Badness(Home Team) + Badness(Away Team)

How "badness" of a team is defined:

Win %
Point Differential
Recent Win %
Recent Point Differential

"""

import pandas as pd

df = pd.read_csv("data/raw/nba_games.csv")

# Convert the date column to datetime and ensure scores are numeric
df["date"] = pd.to_datetime(df["date"])
df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")

# Sort the DataFrame by date and reset the index
df = df.sort_values("date").reset_index(drop=True)

# Filter for regular season games and drop rows with missing scores
df = df[df["season_type"] == 2].copy()
df = df.dropna(subset=["home_score", "away_score"])

pd.set_option("display.max_rows", None)
pd.set_option("display.max_columns", None)

print(df.shape)
print(df.head())
print(df.columns.tolist())