-- =============================================================
-- Demo Cleanup: removes demo group and restores team_stats
-- Run in Supabase SQL Editor after reviewing the UI
-- =============================================================

-- Delete demo group (cascades to group_members + member_team_assignments)
DELETE FROM groups WHERE invite_code = 'DEMO01';

-- Remove demo sync log entry
DELETE FROM sync_log WHERE triggered_by = 'demo';

-- Restore all team_stats to tournament-start defaults
UPDATE team_stats SET
  points               = 0,
  conceded             = 0,
  gd                   = 0,
  yellows              = 0,
  reds                 = 0,
  bigdefeat            = 0,
  og                   = 0,
  fastgoal             = 90,
  penmiss              = 0,
  pts_group            = 0,
  scored               = 0,
  posgd                = 0,
  stage                = 0,
  bigwin               = 0,
  fastscored           = 90,
  penscored            = 0,
  cleansheets          = 0,
  shotsontarget        = 0,
  matches_played       = 0,
  group_stage_complete = FALSE,
  last_synced_at       = NULL;

SELECT 'Demo data cleaned up successfully' AS result;
