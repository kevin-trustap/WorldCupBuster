// Fisher-Yates team distribution
// Distributes 48 teams across N members.
// First (48 % N) randomly-ordered members get one extra team.
//
// Examples (48 teams):
//   N=48  → 1 team each
//   N=10  → 8 members get 5, 2 members get 4
//   N=6   → all get 8 each
//   N=49  → throws Error

export interface Assignment {
  memberId: string;
  teamIds: number[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function distributeTeams(memberIds: string[], teamIds: number[]): Assignment[] {
  if (memberIds.length === 0) throw new Error('No members to assign');
  if (memberIds.length > teamIds.length) {
    throw new Error(`Cannot assign teams: ${memberIds.length} members but only ${teamIds.length} teams`);
  }

  const shuffledTeams = shuffle(teamIds);
  const shuffledMembers = shuffle(memberIds); // randomise who gets the extra team

  const n = shuffledMembers.length;
  const base = Math.floor(shuffledTeams.length / n);
  const extras = shuffledTeams.length % n; // first `extras` members get base+1

  const assignments: Assignment[] = [];
  let idx = 0;

  for (let i = 0; i < n; i++) {
    const count = base + (i < extras ? 1 : 0);
    assignments.push({
      memberId: shuffledMembers[i],
      teamIds: shuffledTeams.slice(idx, idx + count),
    });
    idx += count;
  }

  return assignments;
}
