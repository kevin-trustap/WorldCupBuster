import { createClient } from '@supabase/supabase-js';

// Server-only client using service_role key.
// NEVER import this file in client components.
// fetch override: bypass Next.js data cache so queries always return fresh data.
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );
}
