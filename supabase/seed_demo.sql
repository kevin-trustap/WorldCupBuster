-- =============================================================
-- Demo Seed: 10-member group with realistic WSI/CI spread
-- Run in Supabase SQL Editor
-- Cleanup: run cleanup_demo.sql
-- =============================================================

WITH
new_group AS (
  INSERT INTO groups (name, invite_code, admin_token, assignment_done)
  VALUES ('Demo Group 🌍', 'DEMO01', gen_random_uuid()::text, TRUE)
  RETURNING id AS group_id
),
new_members AS (
  INSERT INTO group_members (group_id, display_name)
  SELECT group_id, name FROM new_group
  CROSS JOIN (VALUES
    ('Alice'),('Bob'),('Charlie'),('Diana'),('Eve'),
    ('Frank'),('Grace'),('Henry'),('Iris'),('Jack')
  ) AS names(name)
  RETURNING id, display_name
),
numbered_members AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY display_name) - 1 AS rn FROM new_members
),
numbered_teams AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn FROM wc_teams
),
assignments AS (
  INSERT INTO member_team_assignments (group_id, member_id, team_id)
  SELECT (SELECT group_id FROM new_group), m.id, t.id
  FROM numbered_teams t
  JOIN numbered_members m ON m.rn = t.rn % 10
  RETURNING 1
),
log AS (
  INSERT INTO sync_log (api_calls, triggered_by, completed_at, status)
  VALUES (18, 'demo', now(), 'done')
  RETURNING 1
)
SELECT 'Demo group created — invite code: DEMO01' AS result;

-- =============================================================
-- Seed team_stats with 4-tier spread based on team_id % 4
--
-- Tier 0 (Elite):   champion-level, high CI / low WSI
-- Tier 1 (Good):    solid performer, moderate CI
-- Tier 2 (Average): mixed results, moderate WSI
-- Tier 3 (Poor):    struggling, high WSI / low CI
-- =============================================================

UPDATE team_stats SET
  -- Tier 0: Elite
  points          = CASE WHEN team_id % 4 = 0 THEN 9  WHEN team_id % 4 = 1 THEN 6  WHEN team_id % 4 = 2 THEN 3  ELSE 0  END,
  scored          = CASE WHEN team_id % 4 = 0 THEN 8  WHEN team_id % 4 = 1 THEN 4  WHEN team_id % 4 = 2 THEN 2  ELSE 1  END,
  conceded        = CASE WHEN team_id % 4 = 0 THEN 1  WHEN team_id % 4 = 1 THEN 2  WHEN team_id % 4 = 2 THEN 3  ELSE 6  END,
  gd              = CASE WHEN team_id % 4 = 0 THEN 6  WHEN team_id % 4 = 1 THEN 2  WHEN team_id % 4 = 2 THEN 0  ELSE -4 END,
  posgd           = CASE WHEN team_id % 4 = 0 THEN 6  WHEN team_id % 4 = 1 THEN 2  WHEN team_id % 4 = 2 THEN 0  ELSE 0  END,
  stage           = CASE WHEN team_id % 4 = 0 THEN 5  WHEN team_id % 4 = 1 THEN 2  WHEN team_id % 4 = 2 THEN 1  ELSE 0  END,
  cleansheets     = CASE WHEN team_id % 4 = 0 THEN 3  WHEN team_id % 4 = 1 THEN 1  WHEN team_id % 4 = 2 THEN 0  ELSE 0  END,
  bigwin          = CASE WHEN team_id % 4 = 0 THEN 1  WHEN team_id % 4 = 1 THEN 0  WHEN team_id % 4 = 2 THEN 0  ELSE 0  END,
  bigdefeat       = CASE WHEN team_id % 4 = 0 THEN 0  WHEN team_id % 4 = 1 THEN 0  WHEN team_id % 4 = 2 THEN 0  ELSE 1  END,
  yellows         = CASE WHEN team_id % 4 = 0 THEN 0  WHEN team_id % 4 = 1 THEN 1  WHEN team_id % 4 = 2 THEN 2  ELSE 3  END,
  reds            = CASE WHEN team_id % 4 = 0 THEN 0  WHEN team_id % 4 = 1 THEN 0  WHEN team_id % 4 = 2 THEN 0  ELSE 1  END,
  og              = CASE WHEN team_id % 4 = 0 THEN 0  WHEN team_id % 4 = 1 THEN 0  WHEN team_id % 4 = 2 THEN 0  ELSE 1  END,
  fastgoal        = CASE WHEN team_id % 4 = 0 THEN 90 WHEN team_id % 4 = 1 THEN 90 WHEN team_id % 4 = 2 THEN 90 ELSE 12 END,
  penmiss         = CASE WHEN team_id % 4 = 0 THEN 0  WHEN team_id % 4 = 1 THEN 0  WHEN team_id % 4 = 2 THEN 1  ELSE 0  END,
  pts_group       = CASE WHEN team_id % 4 = 0 THEN 9  WHEN team_id % 4 = 1 THEN 6  WHEN team_id % 4 = 2 THEN 3  ELSE 0  END,
  fastscored      = CASE WHEN team_id % 4 = 0 THEN 15 WHEN team_id % 4 = 1 THEN 35 WHEN team_id % 4 = 2 THEN 90 ELSE 90 END,
  penscored       = CASE WHEN team_id % 4 = 0 THEN 2  WHEN team_id % 4 = 1 THEN 1  WHEN team_id % 4 = 2 THEN 0  ELSE 0  END,
  shotsontarget   = CASE WHEN team_id % 4 = 0 THEN 18 WHEN team_id % 4 = 1 THEN 10 WHEN team_id % 4 = 2 THEN 5  ELSE 3  END,
  matches_played  = 4,
  group_stage_complete = TRUE,
  last_synced_at  = now();
