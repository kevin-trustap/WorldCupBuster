// FIFA World Cup 2026 — 48 Qualified Teams
// IMPORTANT: Verify against https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams
// before seeding. AFC list (9) based on confirmed qualifiers including Jordan & Uzbekistan (debutants).

export interface WCTeam {
  name: string;
  confederation: 'UEFA' | 'CONMEBOL' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';
  flag_emoji: string;
  is_host: boolean;
}

export const WC2026_TEAMS: WCTeam[] = [
  // ── CONCACAF (6) ──────────────────────────────────
  { name: 'United States',         confederation: 'CONCACAF', flag_emoji: '🇺🇸', is_host: true  },
  { name: 'Canada',                confederation: 'CONCACAF', flag_emoji: '🇨🇦', is_host: true  },
  { name: 'Mexico',                confederation: 'CONCACAF', flag_emoji: '🇲🇽', is_host: true  },
  { name: 'Panama',                confederation: 'CONCACAF', flag_emoji: '🇵🇦', is_host: false },
  { name: 'Curaçao',              confederation: 'CONCACAF', flag_emoji: '🇨🇼', is_host: false },
  { name: 'Haiti',                 confederation: 'CONCACAF', flag_emoji: '🇭🇹', is_host: false },

  // ── CONMEBOL (6) ──────────────────────────────────
  { name: 'Argentina',             confederation: 'CONMEBOL', flag_emoji: '🇦🇷', is_host: false },
  { name: 'Brazil',                confederation: 'CONMEBOL', flag_emoji: '🇧🇷', is_host: false },
  { name: 'Colombia',              confederation: 'CONMEBOL', flag_emoji: '🇨🇴', is_host: false },
  { name: 'Ecuador',               confederation: 'CONMEBOL', flag_emoji: '🇪🇨', is_host: false },
  { name: 'Paraguay',              confederation: 'CONMEBOL', flag_emoji: '🇵🇾', is_host: false },
  { name: 'Uruguay',               confederation: 'CONMEBOL', flag_emoji: '🇺🇾', is_host: false },

  // ── UEFA (16) ─────────────────────────────────────
  { name: 'France',                confederation: 'UEFA', flag_emoji: '🇫🇷', is_host: false },
  { name: 'Spain',                 confederation: 'UEFA', flag_emoji: '🇪🇸', is_host: false },
  { name: 'England',               confederation: 'UEFA', flag_emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', is_host: false },
  { name: 'Portugal',              confederation: 'UEFA', flag_emoji: '🇵🇹', is_host: false },
  { name: 'Germany',               confederation: 'UEFA', flag_emoji: '🇩🇪', is_host: false },
  { name: 'Netherlands',           confederation: 'UEFA', flag_emoji: '🇳🇱', is_host: false },
  { name: 'Belgium',               confederation: 'UEFA', flag_emoji: '🇧🇪', is_host: false },
  { name: 'Switzerland',           confederation: 'UEFA', flag_emoji: '🇨🇭', is_host: false },
  { name: 'Croatia',               confederation: 'UEFA', flag_emoji: '🇭🇷', is_host: false },
  { name: 'Austria',               confederation: 'UEFA', flag_emoji: '🇦🇹', is_host: false },
  { name: 'Czechia',               confederation: 'UEFA', flag_emoji: '🇨🇿', is_host: false },
  { name: 'Bosnia and Herzegovina',confederation: 'UEFA', flag_emoji: '🇧🇦', is_host: false },
  { name: 'Sweden',                confederation: 'UEFA', flag_emoji: '🇸🇪', is_host: false },
  { name: 'Türkiye',              confederation: 'UEFA', flag_emoji: '🇹🇷', is_host: false },
  { name: 'Scotland',              confederation: 'UEFA', flag_emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', is_host: false },
  { name: 'Norway',                confederation: 'UEFA', flag_emoji: '🇳🇴', is_host: false },

  // ── CAF (10) ──────────────────────────────────────
  { name: 'Morocco',               confederation: 'CAF', flag_emoji: '🇲🇦', is_host: false },
  { name: 'Egypt',                 confederation: 'CAF', flag_emoji: '🇪🇬', is_host: false },
  { name: 'Algeria',               confederation: 'CAF', flag_emoji: '🇩🇿', is_host: false },
  { name: 'Senegal',               confederation: 'CAF', flag_emoji: '🇸🇳', is_host: false },
  { name: 'Congo DR',              confederation: 'CAF', flag_emoji: '🇨🇩', is_host: false },
  { name: "Côte d'Ivoire",        confederation: 'CAF', flag_emoji: '🇨🇮', is_host: false },
  { name: 'Ghana',                 confederation: 'CAF', flag_emoji: '🇬🇭', is_host: false },
  { name: 'Cape Verde Islands',    confederation: 'CAF', flag_emoji: '🇨🇻', is_host: false },
  { name: 'South Africa',          confederation: 'CAF', flag_emoji: '🇿🇦', is_host: false },
  { name: 'Tunisia',               confederation: 'CAF', flag_emoji: '🇹🇳', is_host: false },

  // ── AFC (9) ───────────────────────────────────────
  { name: 'Japan',                 confederation: 'AFC', flag_emoji: '🇯🇵', is_host: false },
  { name: 'South Korea',           confederation: 'AFC', flag_emoji: '🇰🇷', is_host: false },
  { name: 'Iran',                  confederation: 'AFC', flag_emoji: '🇮🇷', is_host: false },
  { name: 'Australia',             confederation: 'AFC', flag_emoji: '🇦🇺', is_host: false },
  { name: 'Saudi Arabia',          confederation: 'AFC', flag_emoji: '🇸🇦', is_host: false },
  { name: 'Iraq',                  confederation: 'AFC', flag_emoji: '🇮🇶', is_host: false },
  { name: 'Jordan',                confederation: 'AFC', flag_emoji: '🇯🇴', is_host: false },
  { name: 'Qatar',                 confederation: 'AFC', flag_emoji: '🇶🇦', is_host: false },
  { name: 'Uzbekistan',            confederation: 'AFC', flag_emoji: '🇺🇿', is_host: false },

  // ── OFC (1) ───────────────────────────────────────
  { name: 'New Zealand',           confederation: 'OFC', flag_emoji: '🇳🇿', is_host: false },
];

// Verify count is exactly 48
if (WC2026_TEAMS.length !== 48) {
  throw new Error(`Expected 48 WC 2026 teams, got ${WC2026_TEAMS.length}`);
}

// Map display name → API-Football name when they differ.
// Populate after running GET /api/admin/teams-check and checking the `missing` array.
// Example: { 'Congo DR': 'DR Congo' }
export const API_NAME_OVERRIDES: Record<string, string> = {
  'United States':          'USA',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Czechia':                'Czech Republic',
  "Côte d'Ivoire":          'Ivory Coast',
  'Congo DR':               'DR Congo',
  'Cape Verde Islands':     'Cape Verde',
};
