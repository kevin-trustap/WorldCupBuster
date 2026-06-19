import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { teamWSI, teamCI, type TeamStats, type TeamCIStats } from '@/lib/wsi';
import { T } from '@/lib/theme';
import ScoringBreakdown from './ScoringBreakdown';
import { WSILeaderboard, CILeaderboard, type TeamEntry, type FixtureDetail } from './Leaderboards';
import DailySummary from '@/components/DailySummary';
import { getDailySummary, getTodaysFixtures, computeRankChanges } from '@/lib/daily-summary';

export const revalidate = 60; // re-fetch every 60 seconds

// ── Data fetching ──────────────────────────────────────────────────────────
async function getGroupData(inviteCode: string) {
  const supabase = createServerSupabase();

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, invite_code, assignment_done, created_at')
    .eq('invite_code', inviteCode.toUpperCase())
    .maybeSingle();

  if (!group) return null;

  const { data: members } = await supabase
    .from('group_members')
    .select('id, display_name')
    .eq('group_id', group.id)
    .order('created_at', { ascending: true });

  if (!group.assignment_done) {
    return { group, members: members ?? [], leaderboard: [] as TeamEntry[] };
  }

  // Fetch assignments with team names + stats
  // team_stats must be nested inside wc_teams — no direct FK from member_team_assignments to team_stats
  const { data: assignments } = await supabase
    .from('member_team_assignments')
    .select(`
      member_id,
      group_members!inner(display_name),
      wc_teams!inner(
        id, name, flag_emoji,
        team_stats!inner(
          points, conceded, gd, yellows, reds, bigdefeat, og, fastgoal, penmiss,
          pts_group, scored, posgd, stage, bigwin, fastscored, penscored, cleansheets, shotsontarget,
          matches_played
        )
      )
    `)
    .eq('group_id', group.id);

  // One leaderboard entry per team
  const leaderboard: TeamEntry[] = (assignments ?? []).map(row => {
    const gm  = row.group_members as unknown as { display_name: string };
    const wct = row.wc_teams as unknown as { id: number; name: string; flag_emoji: string; team_stats: TeamStats & TeamCIStats & { matches_played: number } };
    const ts  = wct.team_stats;
    return {
      teamId:     wct.id,
      teamName:   wct.name,
      flagEmoji:  wct.flag_emoji,
      memberName: gm.display_name,
      wsiScore:   teamWSI(ts),
      ciScore:    teamCI(ts),
      stats:      ts,
    };
  });

  // Fetch per-fixture stats for all teams in this group
  const teamIds = leaderboard.map(e => e.teamId);

  const [{ data: fixtureRows }, { data: allTeams }] = await Promise.all([
    supabase
      .from('fixture_team_stats')
      .select(`
        team_id, goals_for, goals_against, match_points,
        yellow_cards, red_cards, own_goals, pen_missed, pen_scored,
        clean_sheet, shots_on_target,
        set_bigdefeat, defeat_margin, set_bigwin, win_margin,
        set_fastgoal, fastgoal_minute, set_fastscored, fastscored_minute,
        fixtures!inner(fixture_id, home_team_id, away_team_id, match_date, round)
      `)
      .in('team_id', teamIds),
    supabase.from('wc_teams').select('id, name, flag_emoji'),
  ]);

  const teamLookup = new Map<number, { name: string; flag_emoji: string }>(
    (allTeams ?? []).map(t => [t.id, { name: t.name ?? '', flag_emoji: t.flag_emoji ?? '🏳' }])
  );

  const fixturesByTeam = new Map<number, FixtureDetail[]>();
  for (const row of (fixtureRows ?? [])) {
    const fixture = row.fixtures as unknown as { fixture_id: number; home_team_id: number; away_team_id: number; match_date: string };
    const teamId = row.team_id;
    const opponentId = fixture.home_team_id === teamId ? fixture.away_team_id : fixture.home_team_id;
    const opponent = teamLookup.get(opponentId) ?? { name: 'Unknown', flag_emoji: '🏳' };

    const detail: FixtureDetail = {
      fixtureId:        fixture.fixture_id,
      opponentId,
      opponentName:     opponent.name,
      opponentFlag:     opponent.flag_emoji,
      matchDate:        fixture.match_date,
      isHome:           fixture.home_team_id === teamId,
      goalsFor:         row.goals_for ?? 0,
      goalsAgainst:     row.goals_against ?? 0,
      matchPoints:      row.match_points ?? 0,
      yellowCards:      row.yellow_cards ?? 0,
      redCards:         row.red_cards ?? 0,
      ownGoals:         row.own_goals ?? 0,
      penMissed:        row.pen_missed ?? 0,
      penScored:        row.pen_scored ?? 0,
      cleanSheet:       row.clean_sheet ?? false,
      shotsOnTarget:    row.shots_on_target ?? 0,
      setBigDefeat:     row.set_bigdefeat ?? false,
      defeatMargin:     row.defeat_margin ?? 0,
      setBigWin:        row.set_bigwin ?? false,
      winMargin:        row.win_margin ?? 0,
      setFastGoal:      row.set_fastgoal ?? false,
      fastGoalMinute:   row.fastgoal_minute ?? null,
      setFastScored:    row.set_fastscored ?? false,
      fastScoredMinute: row.fastscored_minute ?? null,
    };

    if (!fixturesByTeam.has(teamId)) fixturesByTeam.set(teamId, []);
    fixturesByTeam.get(teamId)!.push(detail);
  }

  return {
    group,
    members: members ?? [],
    leaderboard: leaderboard.map(e => ({ ...e, fixtures: fixturesByTeam.get(e.teamId) ?? [] })),
  };
}

// ── Last sync time ─────────────────────────────────────────────────────────
async function getLastSync() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('sync_log')
    .select('completed_at')
    .eq('status', 'done')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.completed_at ?? null;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function GroupPage({ params }: { params: { inviteCode: string } }) {
  const todayUTCDate = new Date().toISOString().split('T')[0];

  const [data, lastSync] = await Promise.all([
    getGroupData(params.inviteCode),
    getLastSync(),
  ]);

  if (!data) notFound();

  const { group, members, leaderboard } = data;

  // Daily summary — only fetched after assignment + first sync
  const [dailySummaryItems, todaysFixtures] = group.assignment_done && lastSync !== null
    ? await Promise.all([
        getDailySummary(group.id, todayUTCDate),
        getTodaysFixtures(todayUTCDate),
      ])
    : [[], []];
  const rankChanges = computeRankChanges(leaderboard, dailySummaryItems);
  const tournamentStart = new Date('2026-06-11');
  const now = new Date();
  const preTournament = now < tournamentStart;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header + 2026 brand mark */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            WorldCupBuster
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px', color: T.textPrimary }}>{group.name}</h1>
          <div style={{ fontSize: 13, color: T.textSecondary }}>
            Invite code: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: T.textPrimary }}>{group.invite_code}</span>
          </div>
          {lastSync && (
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              Last updated {new Date(lastSync).toLocaleString()}
            </div>
          )}
        </div>

        {/* 2026 brand mark — 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', flexShrink: 0, marginLeft: 16 }}>
          {['2','0','2','6'].map((digit, i) => (
            <span key={i} style={{
              fontSize: 52,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.07)',
              textShadow: '0 0 32px rgba(42,57,141,0.2)',
              letterSpacing: '-2px',
              textAlign: 'center',
            }}>{digit}</span>
          ))}
        </div>
      </div>

      {/* State 1: Solo — first member, no assignment */}
      {!group.assignment_done && members.length <= 1 && (
        <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '32px 24px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: T.textPrimary }}>You&apos;re the first one here!</div>
          <div style={{ fontSize: 14, color: T.textSecondary, marginBottom: 16 }}>Share the invite code with your friends to get started.</div>
          <div style={{ display: 'inline-block', background: T.inputBg, borderRadius: 10, padding: '10px 20px', fontFamily: 'monospace', fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', color: T.textPrimary, marginBottom: 16 }}>
            {group.invite_code}
          </div>
          <div style={{ fontSize: 13, color: T.textMuted }}>Once everyone has joined, the admin can assign teams.</div>
        </div>
      )}

      {/* State 2: Multiple members, waiting for assignment */}
      {!group.assignment_done && members.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '20px 24px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontWeight: 700, marginBottom: 4, color: T.textPrimary }}>Waiting for team assignment</div>
            <div style={{ fontSize: 13, color: T.textSecondary }}>
              {members.length} member{members.length !== 1 ? 's' : ''} joined — no teams assigned yet
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {members.map(m => (
                <span key={m.id} style={{ background: T.inputBg, color: T.textPrimary, borderRadius: 99, padding: '4px 12px', fontSize: 13 }}>{m.display_name}</span>
              ))}
            </div>
          </div>

          {/* Blank leaderboard preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {(['🥄 Wooden Spoon Index', '🏆 Champion Index'] as const).map(title => (
              <div key={title} style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '18px 18px 14px', opacity: 0.55 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  {title}
                </div>
                {members.map((m, rank) => (
                  <div key={m.id} style={{ padding: '8px 0', borderBottom: rank < members.length - 1 ? `0.5px solid ${T.divider}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.textMuted, minWidth: 16, textAlign: 'right' }}>{rank + 1}</span>
                      <span style={{ fontSize: 18, color: T.textFaint }}>🏳</span>
                      <span style={{ fontSize: 14, flex: 1, color: T.textFaint }}>TBD</span>
                      <span style={{ fontSize: 14, color: T.textFaint }}>—</span>
                    </div>
                    <div style={{ paddingLeft: 24, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.textFaint }}>{m.display_name}</span>
                    </div>
                    <div style={{ paddingLeft: 24 }}>
                      <div style={{ height: 4, background: T.track, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: T.textMuted, marginTop: 10, fontStyle: 'italic' }}>
            Scores will appear here once teams are assigned and matches begin
          </div>
        </div>
      )}

      {/* States 3 & 4: Assignment done */}
      {group.assignment_done && leaderboard.length > 0 && (
        <>
          {/* State 3 notice: no sync yet */}
          {lastSync === null && (
            <div style={{ background: T.infoBg, border: `0.5px solid ${T.infoBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: T.infoText }}>
              {preTournament
                ? '🗓️ Tournament kicks off 11 June 2026 — scores will appear after the first match sync'
                : '⏳ Waiting for first match sync — scores will appear once the admin syncs match data'}
            </div>
          )}

          {/* Daily summary */}
          {lastSync !== null && (
            <DailySummary
              fixtures={todaysFixtures}
              items={dailySummaryItems}
              rankChanges={rankChanges}
              date={todayUTCDate}
              groupId={group.id}
            />
          )}

          {lastSync !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: T.textMuted }}>
                <span style={{ color: T.wsi, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>WSI</span>
                <span>😭 spoon leader</span>
                <span>😬 shame ↑</span>
                <span>😌 shame ↓</span>
                <span style={{ color: T.ci, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginLeft: 4 }}>CI</span>
                <span>🥳 glory leader</span>
                <span>🤩 glory ↑</span>
                <span>😔 glory ↓</span>
              </div>
              <div style={{ fontSize: 10, color: T.textFaint, fontStyle: 'italic' }}>
                Movement emojis reflect today&apos;s standings shift — including being displaced by another team&apos;s result.
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <WSILeaderboard entries={leaderboard} showScores={lastSync !== null} rankChanges={rankChanges} />
            <CILeaderboard  entries={leaderboard} showScores={lastSync !== null} rankChanges={rankChanges} />
          </div>
        </>
      )}

      {/* Footer */}
      <p style={{ fontSize: 11, color: T.textFaint, textAlign: 'center', marginTop: 24 }}>
        WSI = Wooden Spoon Index · CI = Champion Index · Higher WSI = more shame · Higher CI = more glory
      </p>

      {/* Scoring breakdown — always visible */}
      <ScoringBreakdown />
    </div>
  );
}
