-- Migration: add fixtures and fixture_team_stats tables
-- Run in Supabase SQL Editor for existing projects

CREATE TABLE IF NOT EXISTS fixtures (
  fixture_id   INTEGER PRIMARY KEY,
  home_team_id INTEGER REFERENCES wc_teams(id),
  away_team_id INTEGER REFERENCES wc_teams(id),
  home_goals   INTEGER NOT NULL DEFAULT 0,
  away_goals   INTEGER NOT NULL DEFAULT 0,
  match_date   DATE NOT NULL,
  round        TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixture_team_stats (
  id                SERIAL PRIMARY KEY,
  fixture_id        INTEGER NOT NULL REFERENCES fixtures(fixture_id),
  team_id           INTEGER NOT NULL REFERENCES wc_teams(id),
  wsi_delta         NUMERIC(6,1) NOT NULL DEFAULT 0,
  ci_delta          NUMERIC(6,1) NOT NULL DEFAULT 0,
  goals_for         INTEGER NOT NULL DEFAULT 0,
  goals_against     INTEGER NOT NULL DEFAULT 0,
  match_points      INTEGER NOT NULL DEFAULT 0,
  yellow_cards      INTEGER NOT NULL DEFAULT 0,
  red_cards         INTEGER NOT NULL DEFAULT 0,
  own_goals         INTEGER NOT NULL DEFAULT 0,
  pen_missed        INTEGER NOT NULL DEFAULT 0,
  pen_scored        INTEGER NOT NULL DEFAULT 0,
  clean_sheet       BOOLEAN NOT NULL DEFAULT FALSE,
  shots_on_target   INTEGER NOT NULL DEFAULT 0,
  set_bigdefeat     BOOLEAN NOT NULL DEFAULT FALSE,
  defeat_margin     INTEGER NOT NULL DEFAULT 0,
  set_bigwin        BOOLEAN NOT NULL DEFAULT FALSE,
  win_margin        INTEGER NOT NULL DEFAULT 0,
  set_fastgoal      BOOLEAN NOT NULL DEFAULT FALSE,
  fastgoal_minute   INTEGER,
  set_fastscored    BOOLEAN NOT NULL DEFAULT FALSE,
  fastscored_minute INTEGER,
  UNIQUE(fixture_id, team_id)
);

ALTER TABLE fixtures           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixture_team_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_fixtures"           ON fixtures;
DROP POLICY IF EXISTS "public_read_fixture_team_stats" ON fixture_team_stats;

CREATE POLICY "public_read_fixtures"           ON fixtures           FOR SELECT USING (TRUE);
CREATE POLICY "public_read_fixture_team_stats" ON fixture_team_stats FOR SELECT USING (TRUE);
