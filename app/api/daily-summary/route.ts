import { NextRequest, NextResponse } from 'next/server';
import { getTodaysFixtures, getDailySummary, getPublicDailyTeamStats } from '@/lib/daily-summary';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date    = searchParams.get('date');
  const groupId = searchParams.get('groupId');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ fixtures: [], items: [] });
  }

  const [fixtures, items] = await Promise.all([
    getTodaysFixtures(date),
    groupId ? getDailySummary(groupId, date) : getPublicDailyTeamStats(date),
  ]);

  return NextResponse.json({ fixtures, items });
}
