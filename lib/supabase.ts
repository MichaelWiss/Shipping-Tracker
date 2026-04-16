import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client factories.
 *
 * - `supabaseBrowser()` uses the public anon key. Safe for client components
 *   and Realtime subscriptions. RLS policies enforce read-only access.
 * - `supabaseServer()` uses the service role key and bypasses RLS.
 *   SERVER ONLY — only import from API routes (app/api/**).
 *
 * IMPORTANT: NEXT_PUBLIC_* vars MUST be referenced as literal
 * `process.env.NEXT_PUBLIC_X` expressions — Next.js replaces them at
 * compile time via static analysis. Dynamic lookups like
 * `process.env[name]` are invisible to the compiler and stay undefined
 * in client bundles.
 */

export function supabaseBrowser(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local (see .env.example).",
    );
  }
  return createClient(url, key);
}

export function supabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Add them to .env.local (see .env.example).",
    );
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
