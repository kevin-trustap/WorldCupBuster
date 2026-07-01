-- WorldCupBuster — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE groups (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  invite_code    TEXT UNIQUE NOT NULL,
  admin_token    TEXT UNIQUE NOT NULL,  -- UUID v4, lives only in admin URL
  assignment_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id     UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, display_name)
);

CREATE TABLE wc_teams (
  id            SERIAL PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  confederation TEXT NOT NULL,  -- UEFA|CONMEBOL|CAF|AFC|CONCACAF|OFC
  flag_emoji    TEXT NOT NULL,
  api_team_id   INTEGER,        -- API-Football numeric ID, populated on first sync
  is_host       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE member_team_assignments (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  team_id   INTEGER NOT NULL REFERENCES wc_teams(id),
  UNIQUE(group_id, team_id)     -- each team assigned once per group
);

CREATE TABLE team_stats (
  team_id     INTEGER PRIMARY KEY REFERENCES wc_teams(id),
  -- WSI columns (mirror METRICS keys in lib/wsi.ts)
  points      INTEGER NOT NULL DEFAULT 0,
  conceded    INTEGER NOT NULL DEFAULT 0,
  gd          INTEGER NOT NULL DEFAULT 0,
  yellows     INTEGER NOT NULL DEFAULT 0,
  reds        INTEGER NOT NULL DEFAULT 0,
  bigdefeat   INTEGER NOT NULL DEFAULT 0,
  og          INTEGER NOT NULL DEFAULT 0,
  fastgoal    INTEGER NOT NULL DEFAULT 90,  -- 90 = zero WSI contribution
  penmiss     INTEGER NOT NULL DEFAULT 0,
  -- CI columns
  pts_group       INTEGER NOT NULL DEFAULT 0,
  scored          INTEGER NOT NULL DEFAULT 0,
  posgd           INTEGER NOT NULL DEFAULT 0,
  stage           INTEGER NOT NULL DEFAULT 0,  -- 0–6 ordinal
  bigwin          INTEGER NOT NULL DEFAULT 0,
  fastscored      INTEGER NOT NULL DEFAULT 90, -- 90 = zero CI contribution
  penscored       INTEGER NOT NULL DEFAULT 0,
  cleansheets     INTEGER NOT NULL DEFAULT 0,
  shotsontarget   INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  matches_played       INTEGER NOT NULL DEFAULT 0,
  group_stage_complete BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at       TIMESTAMPTZ
);

CREATE TABLE sync_log (
  id           SERIAL PRIMARY KEY,
  api_calls    INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT NOT NULL,  -- 'admin' | 'cron'
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'running'  -- 'running' | 'done' | 'error'
);

-- Prevents re-processing the same fixture
CREATE TABLE processed_fixtures (
  fixture_id   INTEGER PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Never exposes admin_token to the client
CREATE VIEW public_groups AS
  SELECT id, name, invite_code, assignment_done, created_at
  FROM groups;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE groups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_fixtures   ENABLE ROW LEVEL SECURITY;

-- Public SELECT only — all writes happen server-side via service_role key
CREATE POLICY "public_read_groups"               ON groups               FOR SELECT USING (TRUE);
CREATE POLICY "public_read_group_members"        ON group_members        FOR SELECT USING (TRUE);
CREATE POLICY "public_read_wc_teams"             ON wc_teams             FOR SELECT USING (TRUE);
CREATE POLICY "public_read_member_assignments"   ON member_team_assignments FOR SELECT USING (TRUE);
CREATE POLICY "public_read_team_stats"           ON team_stats           FOR SELECT USING (TRUE);
CREATE POLICY "public_read_sync_log"             ON sync_log             FOR SELECT USING (TRUE);
CREATE POLICY "public_read_processed_fixtures"   ON processed_fixtures   FOR SELECT USING (TRUE);

-- ============================================================
-- SEED DATA — 48 WC 2026 Teams
-- VERIFY against https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams
-- ============================================================

INSERT INTO wc_teams (name, confederation, flag_emoji, is_host) VALUES
  -- CONCACAF (3 hosts + 3 qualified)
  ('United States',          'CONCACAF', '🇺🇸', TRUE),
  ('Canada',                 'CONCACAF', '🇨🇦', TRUE),
  ('Mexico',                 'CONCACAF', '🇲🇽', TRUE),
  ('Panama',                 'CONCACAF', '🇵🇦', FALSE),
  ('Curaçao',               'CONCACAF', '🇨🇼', FALSE),
  ('Haiti',                  'CONCACAF', '🇭🇹', FALSE),
  -- CONMEBOL (6)
  ('Argentina',              'CONMEBOL', '🇦🇷', FALSE),
  ('Brazil',                 'CONMEBOL', '🇧🇷', FALSE),
  ('Colombia',               'CONMEBOL', '🇨🇴', FALSE),
  ('Ecuador',                'CONMEBOL', '🇪🇨', FALSE),
  ('Paraguay',               'CONMEBOL', '🇵🇾', FALSE),
  ('Uruguay',                'CONMEBOL', '🇺🇾', FALSE),
  -- UEFA (16)
  ('France',                 'UEFA', '🇫🇷', FALSE),
  ('Spain',                  'UEFA', '🇪🇸', FALSE),
  ('England',                'UEFA', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', FALSE),
  ('Portugal',               'UEFA', '🇵🇹', FALSE),
  ('Germany',                'UEFA', '🇩🇪', FALSE),
  ('Netherlands',            'UEFA', '🇳🇱', FALSE),
  ('Belgium',                'UEFA', '🇧🇪', FALSE),
  ('Switzerland',            'UEFA', '🇨🇭', FALSE),
  ('Croatia',                'UEFA', '🇭🇷', FALSE),
  ('Austria',                'UEFA', '🇦🇹', FALSE),
  ('Czechia',                'UEFA', '🇨🇿', FALSE),
  ('Bosnia and Herzegovina', 'UEFA', '🇧🇦', FALSE),
  ('Sweden',                 'UEFA', '🇸🇪', FALSE),
  ('Türkiye',               'UEFA', '🇹🇷', FALSE),
  ('Scotland',               'UEFA', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', FALSE),
  ('Norway',                 'UEFA', '🇳🇴', FALSE),
  -- CAF (10)
  ('Morocco',                'CAF', '🇲🇦', FALSE),
  ('Egypt',                  'CAF', '🇪🇬', FALSE),
  ('Algeria',                'CAF', '🇩🇿', FALSE),
  ('Senegal',                'CAF', '🇸🇳', FALSE),
  ('Congo DR',               'CAF', '🇨🇩', FALSE),
  ('Côte d''Ivoire',        'CAF', '🇨🇮', FALSE),
  ('Ghana',                  'CAF', '🇬🇭', FALSE),
  ('Cape Verde Islands',     'CAF', '🇨🇻', FALSE),
  ('South Africa',           'CAF', '🇿🇦', FALSE),
  ('Tunisia',                'CAF', '🇹🇳', FALSE),
  -- AFC (9)
  ('Japan',                  'AFC', '🇯🇵', FALSE),
  ('South Korea',            'AFC', '🇰🇷', FALSE),
  ('Iran',                   'AFC', '🇮🇷', FALSE),
  ('Australia',              'AFC', '🇦🇺', FALSE),
  ('Saudi Arabia',           'AFC', '🇸🇦', FALSE),
  ('Iraq',                   'AFC', '🇮🇶', FALSE),
  ('Jordan',                 'AFC', '🇯🇴', FALSE),
  ('Qatar',                  'AFC', '🇶🇦', FALSE),
  ('Uzbekistan',             'AFC', '🇺🇿', FALSE),
  -- OFC (1)
  ('New Zealand',            'OFC', '🇳🇿', FALSE);

-- Default team_stats row for every team (all zeros, fastgoal/fastscored=90)
INSERT INTO team_stats (team_id)
SELECT id FROM wc_teams;

-- ============================================================
-- FIXTURES TABLES (populated at sync time)
-- ============================================================

-- Match metadata captured at sync time
CREATE TABLE fixtures (
  fixture_id   INTEGER PRIMARY KEY,
  home_team_id INTEGER REFERENCES wc_teams(id),
  away_team_id INTEGER REFERENCES wc_teams(id),
  home_goals   INTEGER NOT NULL DEFAULT 0,
  away_goals   INTEGER NOT NULL DEFAULT 0,
  match_date   DATE NOT NULL,
  round        TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-team per-fixture WSI/CI deltas and raw match stats
CREATE TABLE fixture_team_stats (
  id                SERIAL PRIMARY KEY,
  fixture_id        INTEGER NOT NULL REFERENCES fixtures(fixture_id),
  team_id           INTEGER NOT NULL REFERENCES wc_teams(id),
  -- Score deltas (daily summary)
  wsi_delta         NUMERIC(6,1) NOT NULL DEFAULT 0,
  ci_delta          NUMERIC(6,1) NOT NULL DEFAULT 0,
  -- Raw per-match stats
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
  -- Record metric flags
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

CREATE POLICY "public_read_fixtures"           ON fixtures           FOR SELECT USING (TRUE);
CREATE POLICY "public_read_fixture_team_stats" ON fixture_team_stats FOR SELECT USING (TRUE);

-- ── Player awards ───────────────────────────────────────────────────────────
CREATE TABLE player_awards (
  id          SERIAL PRIMARY KEY,
  category    TEXT    NOT NULL,   -- 'topscorers' | 'topassists' | 'topyellowcards' | 'topredcards'
  rank        INTEGER NOT NULL,   -- 1-based (1 = leader)
  player_id   INTEGER NOT NULL,   -- API-Football player ID
  player_name TEXT    NOT NULL,
  nationality TEXT,
  api_team_id INTEGER NOT NULL,   -- API-Football team ID; join to wc_teams.api_team_id
  team_name   TEXT    NOT NULL,   -- denormalised fallback
  stat_value  INTEGER NOT NULL DEFAULT 0,
  appearances INTEGER NOT NULL DEFAULT 0,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, rank)
);
ALTER TABLE player_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_player_awards" ON player_awards FOR SELECT USING (TRUE);
