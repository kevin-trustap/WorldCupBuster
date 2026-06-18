import { getTodaysFixtures, getPublicDailyTeamStats } from '@/lib/daily-summary';
import DailySummary from '@/components/DailySummary';

export default async function TodaysSummaryPublic() {
  const today = new Date().toISOString().split('T')[0];
  const [fixtures, items] = await Promise.all([
    getTodaysFixtures(today),
    getPublicDailyTeamStats(today),
  ]);
  if (fixtures.length === 0 && items.length === 0) return null;
  return <DailySummary fixtures={fixtures} items={items} rankChanges={{}} date={today} />;
}
