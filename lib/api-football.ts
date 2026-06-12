// API-Football (RapidAPI) wrapper
// Free tier: 100 req/day. Sync guard enforced at 90 to leave headroom.
// League ID 1 = FIFA World Cup

const BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 1;
const SEASON = 2026;

// ── Round ordinal map ──────────────────────────────────────────────────────
// Used to derive `stage` CI metric for knockout rounds.
// WC 2026 format: 12×4 groups → R32 → R16 → QF → SF → Final
const ROUND_ORDINALS: Record<string, number> = {
  'Round of 32': 1,
  'Round of 16': 2,
  'Quarter-finals': 3,
  'Semi-finals': 4,
  '3rd Place Final': 4, // same level as SF (runner-up in 3rd-place game = 4)
  'Final': 5,
};

export function getRoundOrdinal(round: string): number {
  return ROUND_ORDINALS[round] ?? 0;
}

export function isGroupStageRound(round: string): boolean {
  return round.toLowerCase().includes('group');
}

// ── HTTP helper ────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API_FOOTBALL_KEY env var not set');

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'x-apisports-key': key,
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`API-Football ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface ApiTeam {
  team: { id: number; name: string };
}

export interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league:  { id: number; round: string };
  teams:   { home: { id: number; name: string }; away: { id: number; name: string } };
  goals:   { home: number | null; away: number | null };
  score:   { penalty: { home: number | null; away: number | null } | null };
}

export interface ApiEvent {
  time:   { elapsed: number; extra: number | null };
  team:   { id: number; name: string };
  type:   string;  // 'Goal' | 'Card' | 'Var' | 'subst'
  detail: string;  // 'Normal Goal' | 'Penalty' | 'Own Goal' | 'Missed Penalty'
                   // 'Yellow Card' | 'Red Card' | 'Yellow Red Card'
}

export interface ApiStatTeam {
  team: { id: number };
  statistics: Array<{ type: string; value: number | string | null }>;
}

// ── Fetch functions ────────────────────────────────────────────────────────
export async function fetchTeams(): Promise<ApiTeam[]> {
  const data = await apiFetch<{ response: ApiTeam[] }>(
    `/teams?league=${LEAGUE_ID}&season=${SEASON}`
  );
  return data.response;
}

export async function fetchCompletedFixtures(): Promise<ApiFixture[]> {
  const data = await apiFetch<{ response: ApiFixture[] }>(
    `/fixtures?league=${LEAGUE_ID}&season=${SEASON}&status=FT`
  );
  return data.response;
}

export async function fetchFixtureEvents(fixtureId: number): Promise<ApiEvent[]> {
  const data = await apiFetch<{ response: ApiEvent[] }>(
    `/fixtures/events?fixture=${fixtureId}`
  );
  return data.response;
}

export async function fetchFixtureStatistics(fixtureId: number): Promise<ApiStatTeam[]> {
  const data = await apiFetch<{ response: ApiStatTeam[] }>(
    `/fixtures/statistics?fixture=${fixtureId}`
  );
  return data.response;
}

// ── Stat helpers ───────────────────────────────────────────────────────────
export function getShotsOnTarget(stats: ApiStatTeam[], teamId: number): number {
  const teamStats = stats.find(s => s.team.id === teamId);
  if (!teamStats) return 0;
  const stat = teamStats.statistics.find(s => s.type === 'Shots on Target');
  const val = stat?.value;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseInt(val, 10) || 0;
  return 0;
}

// ── Event parsing helpers ──────────────────────────────────────────────────
export function parseTeamEvents(events: ApiEvent[], teamId: number) {
  const teamEvents = events.filter(e => e.team.id === teamId);

  const normalGoals = teamEvents.filter(
    e => e.type === 'Goal' && e.detail !== 'Missed Penalty' && e.detail !== 'Own Goal'
  );
  const ownGoals = teamEvents.filter(e => e.type === 'Goal' && e.detail === 'Own Goal');
  const penMisses = teamEvents.filter(e => e.type === 'Goal' && e.detail === 'Missed Penalty');
  const penGoals  = teamEvents.filter(e => e.type === 'Goal' && e.detail === 'Penalty');

  const yellows = teamEvents.filter(
    e => e.type === 'Card' && (e.detail === 'Yellow Card' || e.detail === 'Yellow Red Card')
  );
  const reds = teamEvents.filter(
    e => e.type === 'Card' && (e.detail === 'Red Card' || e.detail === 'Yellow Red Card')
  );

  // Goal times: clamp extra time to 90
  const goalTimesScored = normalGoals.map(e => Math.min(e.time.elapsed, 90));

  return {
    normalGoalsCount: normalGoals.length,
    ownGoalsCount: ownGoals.length,
    ownGoalTimes: ownGoals.map(e => Math.min(e.time.elapsed, 90)),
    penMissCount: penMisses.length,
    penGoalCount: penGoals.length,
    yellowCount: yellows.length,
    redCount: reds.length,
    goalTimesScored,
  };
}
