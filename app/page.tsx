import { T } from '@/lib/theme';
import HomePageForms from './HomePageForms';
import TodaysSummaryPublic from './TodaysSummaryPublic';
import PublicTeamLeaderboards from '@/components/PublicTeamLeaderboards';

export const revalidate = 60;

// ── Page ───────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 16px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🌍🥄</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px', color: T.textPrimary }}>WorldCupBuster</h1>
        <p style={{ fontSize: 16, color: T.textSecondary, margin: '0 auto 18px', maxWidth: 480, lineHeight: 1.6 }}>
          Get randomly assigned a FIFA World Cup 2026 team. Compete with friends to see whose team earns the most glory — or the most shame.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: T.wsiBadgeBg, color: T.wsi, borderRadius: 99, padding: '5px 14px', fontSize: 13, fontWeight: 600 }}>
            🥄 Wooden Spoon Index
          </span>
          <span style={{ background: T.ciBadgeBg, color: T.ci, borderRadius: 99, padding: '5px 14px', fontSize: 13, fontWeight: 600 }}>
            🏆 Champion Index
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <a href="#create" style={{ padding: '10px 22px', borderRadius: 8, background: T.blue, color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            Create a group
          </a>
          <a href="#join" style={{ padding: '10px 22px', borderRadius: 8, background: 'transparent', color: T.blue, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: `1.5px solid ${T.blue}` }}>
            Join a group
          </a>
        </div>
      </div>

      {/* Today's summary — match results + WSI/CI team impact */}
      <TodaysSummaryPublic />

      {/* Public team standings — team-only, no group/member data */}
      <PublicTeamLeaderboards />

      {/* Client forms + trophy cards + how it works */}
      <HomePageForms />

    </div>
  );
}
