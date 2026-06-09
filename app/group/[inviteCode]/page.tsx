import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { teamWSI, teamCI, type TeamStats, type TeamCIStats } from '@/lib/wsi';
import ScoringBreakdown from './ScoringBreakdown';
import { WSILeaderboard, CILeaderboard, type TeamEntry } from './Leaderboards';

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

  return { group, members: members ?? [], leaderboard };
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
  const [data, lastSync] = await Promise.all([
    getGroupData(params.inviteCode),
    getLastSync(),
  ]);

  if (!data) notFound();

  const { group, members, leaderboard } = data;
  const tournamentStart = new Date('2026-06-11');
  const now = new Date();
  const preTournament = now < tournamentStart;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          WorldCupBuster
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{group.name}</h1>
        <div style={{ fontSize: 13, color: '#888' }}>
          Invite code: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1a1a1a' }}>{group.invite_code}</span>
          {lastSync && (
            <span style={{ marginLeft: 16 }}>
              · Last updated {new Date(lastSync).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* State 1: Solo — first member, no assignment */}
      {!group.assignment_done && members.length <= 1 && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 14, padding: '32px 24px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>You're the first one here!</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Share the invite code with your friends to get started.</div>
          <div style={{ display: 'inline-block', background: '#f4f4f3', borderRadius: 10, padding: '10px 20px', fontFamily: 'monospace', fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', color: '#1a1a1a', marginBottom: 16 }}>
            {group.invite_code}
          </div>
          <div style={{ fontSize: 13, color: '#aaa' }}>Once everyone has joined, the admin can assign teams.</div>
        </div>
      )}

      {/* State 2: Multiple members, waiting for assignment */}
      {!group.assignment_done && members.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 14, padding: '20px 24px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Waiting for team assignment</div>
            <div style={{ fontSize: 13, color: '#888' }}>
              {members.length} member{members.length !== 1 ? 's' : ''} joined — no teams assigned yet
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {members.map(m => (
                <span key={m.id} style={{ background: '#f4f4f3', borderRadius: 99, padding: '4px 12px', fontSize: 13 }}>{m.display_name}</span>
              ))}
            </div>
          </div>

          {/* Blank leaderboard preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {(['🥄 Wooden Spoon Index', '🏆 Champion Index'] as const).map(title => (
              <div key={title} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 14, padding: '18px 18px 14px', opacity: 0.55 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  {title}
                </div>
                {members.map((m, rank) => (
                  <div key={m.id} style={{ padding: '8px 0', borderBottom: rank < members.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#aaa', minWidth: 16, textAlign: 'right' }}>{rank + 1}</span>
                      <span style={{ fontSize: 18, color: '#ccc' }}>🏳</span>
                      <span style={{ fontSize: 14, flex: 1, color: '#ccc' }}>TBD</span>
                      <span style={{ fontSize: 14, color: '#ccc' }}>—</span>
                    </div>
                    <div style={{ paddingLeft: 24, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#ccc' }}>{m.display_name}</span>
                    </div>
                    <div style={{ paddingLeft: 24 }}>
                      <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 10, fontStyle: 'italic' }}>
            Scores will appear here once teams are assigned and matches begin
          </div>
        </div>
      )}

      {/* States 3 & 4: Assignment done */}
      {group.assignment_done && leaderboard.length > 0 && (
        <>
          {/* State 3 notice: no sync yet */}
          {lastSync === null && (
            <div style={{ background: '#f0f9ff', border: '0.5px solid #b3d9f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#0369a1' }}>
              {preTournament
                ? '🗓️ Tournament kicks off 11 June 2026 — scores will appear after the first match sync'
                : '⏳ Waiting for first match sync — scores will appear once the admin syncs match data'}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <WSILeaderboard entries={leaderboard} showScores={lastSync !== null} />
            <CILeaderboard  entries={leaderboard} showScores={lastSync !== null} />
          </div>
        </>
      )}

      {/* Footer */}
      <p style={{ fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 24 }}>
        WSI = Wooden Spoon Index · CI = Champion Index · Higher WSI = more shame · Higher CI = more glory
      </p>

      {/* Scoring breakdown — always visible */}
      <ScoringBreakdown />
    </div>
  );
}
