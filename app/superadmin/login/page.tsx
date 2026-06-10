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
        background: '#f4f4f3',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '0.5px solid rgba(0,0,0,0.12)',
          borderRadius: 16,
          padding: '36px 32px',
          width: '100%',
          maxWidth: 360,
        }}
      >
        <div style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          WorldCupBuster
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 24px', letterSpacing: '-0.3px' }}>
          Super Admin
        </h1>

        {hasError && (
          <div
            style={{
              background: '#fdecea',
              border: '1px solid #f5c6c4',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#c0392b',
              marginBottom: 18,
            }}
          >
            Invalid credentials. Try again.
          </div>
        )}

        <form method="POST" action="/api/superadmin/login">
          <label
            style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}
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
              border: '0.5px solid rgba(0,0,0,0.2)',
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 14,
            }}
          />
          <label
            style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}
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
              border: '0.5px solid rgba(0,0,0,0.2)',
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 20,
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: 8,
              border: 'none',
              background: '#1a1a1a',
              color: '#fff',
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
