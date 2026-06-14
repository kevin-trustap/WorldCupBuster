import { T } from '@/lib/theme';
import HomePageForms from './HomePageForms';
import TodaysMatches from './TodaysMatches';

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
      </div>

      {/* Today's Matches — only shown once fixtures table is populated */}
      <TodaysMatches />

      {/* Client forms + trophy cards + how it works */}
      <HomePageForms />

    </div>
  );
}
