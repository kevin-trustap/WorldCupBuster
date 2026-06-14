import { createServerSupabase } from '@/lib/supabase/server';
import { T } from '@/lib/theme';

async function getTodaysFixtures(today: string) {
  const supabase = createServerSupabase();

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('fixture_id, round, home_goals, away_goals, home_team_id, away_team_id')
    .eq('match_date', today)
    .order('fixture_id');

  if (!fixtures?.length) return [];

  const teamIds = Array.from(new Set(fixtures.flatMap(f => [f.home_team_id, f.away_team_id]).filter(Boolean) as number[]));
  const { data: teams } = await supabase
    .from('wc_teams')
    .select('id, name, flag_emoji')
    .in('id', teamIds);

  const teamMap = new Map(teams?.map(t => [t.id as number, { name: t.name as string, flag_emoji: t.flag_emoji as string }]) ?? []);

  return fixtures.map(f => ({
    fixtureId:  f.fixture_id as number,
    round:      f.round as string,
    homeGoals:  f.home_goals as number,
    awayGoals:  f.away_goals as number,
    homeTeam:   teamMap.get(f.home_team_id as number),
    awayTeam:   teamMap.get(f.away_team_id as number),
  })).filter(f => f.homeTeam && f.awayTeam);
}

export default async function TodaysMatches() {
  const today = new Date().toISOString().split('T')[0];
  const fixtures = await getTodaysFixtures(today);

  if (fixtures.length === 0) return null;

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 14, padding: '18px 20px', maxWidth: 520, margin: '0 auto 28px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        📅 Today&apos;s Matches
      </div>
      {fixtures.map((f, i) => (
        <div
          key={f.fixtureId}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 0',
            borderBottom: i < fixtures.length - 1 ? `0.5px solid ${T.divider}` : 'none',
            fontSize: 13,
          }}
        >
          <span style={{ fontSize: 16 }}>{f.homeTeam!.flag_emoji}</span>
          <span style={{ flex: 1, color: T.textPrimary }}>{f.homeTeam!.name}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: T.textPrimary, minWidth: 32, textAlign: 'center' }}>
            {f.homeGoals}–{f.awayGoals}
          </span>
          <span style={{ flex: 1, color: T.textPrimary, textAlign: 'right' }}>{f.awayTeam!.name}</span>
          <span style={{ fontSize: 16 }}>{f.awayTeam!.flag_emoji}</span>
          <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 6, whiteSpace: 'nowrap' }}>{f.round.replace('Group Stage - ', 'Grp ')}</span>
        </div>
      ))}
    </div>
  );
}
