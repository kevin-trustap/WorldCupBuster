// WSI = Wooden Spoon Index (shame score — higher is worse)
// CI  = Champion Index (glory score — higher is better)
// Ported from wooden-spoon-index_1.jsx

export interface TeamStats {
  points: number;
  conceded: number;
  gd: number;
  yellows: number;
  reds: number;
  bigdefeat: number;
  og: number;
  fastgoal: number;    // default 90 = zero WSI contribution
  penmiss: number;
}

export interface TeamCIStats {
  pts_group: number;
  scored: number;
  posgd: number;
  stage: number;       // 0–6 ordinal (0=group exit, 6=champion)
  bigwin: number;
  fastscored: number;  // default 90 = zero CI contribution
  penscored: number;
  cleansheets: number;
  shotsontarget: number;
}

export interface Metric<T> {
  key: keyof T;
  label: string;
  compute: (v: number) => number;
  display: (v: number) => string;
  hint: string;
  desc: string;
  icon: string;
}

export const METRICS: Metric<TeamStats>[] = [
  {
    key: 'points',
    label: 'Points earned',
    compute: (v) => (9 - v) * 3,
    display: (v) => `${v} pts`,
    hint: '(9 − pts) × 3',
    desc: 'Fewer points = more shame',
    icon: '🏆',
  },
  {
    key: 'conceded',
    label: 'Goals conceded',
    compute: (v) => v * 2,
    display: (v) => `${v}`,
    hint: 'goals × 2',
    desc: 'Raw goals let in',
    icon: '🥅',
  },
  {
    key: 'gd',
    label: 'Goal difference',
    compute: (v) => v < 0 ? Math.abs(v) * 1.5 : 0,
    display: (v) => v >= 0 ? `+${v}` : `${v}`,
    hint: '|neg GD| × 1.5',
    desc: 'Only negative GD scores',
    icon: '📉',
  },
  {
    key: 'yellows',
    label: 'Yellow cards',
    compute: (v) => v,
    display: (v) => `${v}`,
    hint: 'count × 1',
    desc: '',
    icon: '🟨',
  },
  {
    key: 'reds',
    label: 'Red cards',
    compute: (v) => v * 3,
    display: (v) => `${v}`,
    hint: 'count × 3',
    desc: '',
    icon: '🟥',
  },
  {
    key: 'bigdefeat',
    label: 'Biggest single defeat',
    compute: (v) => v * 2,
    display: (v) => v === 0 ? 'None' : `by ${v}`,
    hint: 'margin × 2',
    desc: 'Worst single-match margin',
    icon: '💥',
  },
  {
    key: 'og',
    label: 'Own goals',
    compute: (v) => v * 4,
    display: (v) => `${v}`,
    hint: 'count × 4',
    desc: 'Pure self-sabotage premium',
    icon: '😬',
  },
  {
    key: 'fastgoal',
    label: 'Fastest goal conceded',
    compute: (v) => Math.round((90 - v) * 0.3 * 10) / 10,
    display: (v) => `min ${v}`,
    hint: '(90 − min) × 0.3',
    desc: 'Earlier = more points',
    icon: '⚡',
  },
  {
    key: 'penmiss',
    label: 'Failed penalties',
    compute: (v) => v * 3,
    display: (v) => `${v}`,
    hint: 'count × 3',
    desc: 'Misses + saved attempts',
    icon: '🎯',
  },
];

export const STAGE_LABELS = [
  'Group exit', 'R32', 'R16', 'Quarter-final',
  'Semi-final', 'Runner-up', 'Champion',
];

export const CI_METRICS: Metric<TeamCIStats>[] = [
  {
    key: 'pts_group',
    label: 'Group stage points',
    compute: (v) => v * 2.5,
    display: (v) => `${v} pts`,
    hint: 'pts × 2.5',
    desc: 'Group stage points only',
    icon: '🏆',
  },
  {
    key: 'scored',
    label: 'Goals scored',
    compute: (v) => v * 2,
    display: (v) => `${v}`,
    hint: 'goals × 2',
    desc: 'Total goals scored',
    icon: '⚽',
  },
  {
    key: 'posgd',
    label: 'Goal difference',
    compute: (v) => v > 0 ? v * 1.5 : 0,
    display: (v) => `+${v}`,
    hint: 'pos GD × 1.5',
    desc: 'Only positive GD scores',
    icon: '📈',
  },
  {
    key: 'stage',
    label: 'Tournament stage',
    compute: (v) => v * 4,
    display: (v) => STAGE_LABELS[v] ?? `Stage ${v}`,
    hint: 'stage × 4',
    desc: '0=group exit, 6=champion',
    icon: '🌟',
  },
  {
    key: 'bigwin',
    label: 'Biggest single win',
    compute: (v) => v * 2,
    display: (v) => v === 0 ? 'None' : `by ${v}`,
    hint: 'margin × 2',
    desc: 'Best single-match margin',
    icon: '💪',
  },
  {
    key: 'fastscored',
    label: 'Fastest goal scored',
    compute: (v) => Math.round((90 - v) * 0.25 * 10) / 10,
    display: (v) => `min ${v}`,
    hint: '(90 − min) × 0.25',
    desc: 'Earlier = more points',
    icon: '⚡',
  },
  {
    key: 'penscored',
    label: 'Penalties converted',
    compute: (v) => v * 3,
    display: (v) => `${v}`,
    hint: 'count × 3',
    desc: 'Successful spot kicks',
    icon: '🎯',
  },
  {
    key: 'cleansheets',
    label: 'Clean sheets',
    compute: (v) => v * 4,
    display: (v) => `${v}`,
    hint: 'count × 4',
    desc: 'Defensive excellence',
    icon: '🧤',
  },
  {
    key: 'shotsontarget',
    label: 'Shots on target',
    compute: (v) => Math.round(v * 0.6 * 10) / 10,
    display: (v) => `${v}`,
    hint: 'count × 0.6',
    desc: 'Attacking pressure',
    icon: '🔥',
  },
];

export function teamWSI(stats: TeamStats): number {
  return Math.round(
    METRICS.reduce((sum, m) => sum + m.compute(stats[m.key as keyof TeamStats] as number), 0) * 10
  ) / 10;
}

export function memberWSI(teamStatsList: TeamStats[]): number {
  return Math.round(teamStatsList.reduce((sum, t) => sum + teamWSI(t), 0) * 10) / 10;
}

export function teamCI(stats: TeamCIStats): number {
  return Math.round(
    CI_METRICS.reduce((sum, m) => sum + m.compute(stats[m.key as keyof TeamCIStats] as number), 0) * 10
  ) / 10;
}

export function memberCI(teamStatsList: TeamCIStats[]): number {
  return Math.round(teamStatsList.reduce((sum, t) => sum + teamCI(t), 0) * 10) / 10;
}
