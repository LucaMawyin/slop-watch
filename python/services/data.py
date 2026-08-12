from sportsipy.nba.schedule import Schedule

schedule = Schedule("LAL")

for game in schedule:
    print(game.date)
    print(game.opponent_name)
    print(game.home_points)
    print(game.away_points)