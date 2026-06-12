import { T } from '@/lib/theme';

export default function SuperAdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const hasError = searchParams.error === '1';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: T.bg,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: T.card,
          border: `0.5px solid ${T.cardBorder}`,
          borderRadius: 16,
          padding: '36px 32px',
          width: '100%',
          maxWidth: 360,
        }}
      >
        <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          WorldCupBuster
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 24px', letterSpacing: '-0.3px', color: T.textPrimary }}>
          Super Admin
        </h1>

        {hasError && (
          <div
            style={{
              background: 'rgba(230,29,37,0.2)',
              border: '1px solid rgba(230,29,37,0.4)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: T.wsi,
              marginBottom: 18,
            }}
          >
            Invalid credentials. Try again.
          </div>
        )}

        <form method="POST" action="/api/superadmin/login">
          <label
            style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6, color: T.textPrimary }}
          >
            Username
          </label>
          <input
            name="username"
            type="text"
            autoComplete="username"
            required
            style={{
              width: '100%',
              fontSize: 15,
              padding: '10px 12px',
              border: `0.5px solid ${T.inputBorder}`,
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 14,
              background: T.inputBg,
              color: T.textPrimary,
            }}
          />
          <label
            style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6, color: T.textPrimary }}
          >
            Password
          </label>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            style={{
              width: '100%',
              fontSize: 15,
              padding: '10px 12px',
              border: `0.5px solid ${T.inputBorder}`,
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 20,
              background: T.inputBg,
              color: T.textPrimary,
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: 8,
              border: 'none',
              background: T.textPrimary,
              color: '#000',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
