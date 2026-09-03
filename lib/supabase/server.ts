import "server-only";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

/**
 * Server Component / Route Handler / Server Action client: carries the
 * current Clerk session token, so RLS policies apply as the signed-in user.
 * Requires the Clerk <-> Supabase third-party auth integration to be enabled
 * in both dashboards before any RLS policy can rely on it.
 */
export async function createSupabaseServerClient() {
  const { getToken } = await auth();
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => (await getToken()) ?? null,
  });
}

/**
 * Privileged client using the secret key — bypasses RLS entirely.
 * Server-only. Never import this from a Client Component or expose the
 * secret key to the browser. Reserve for trusted admin/server-side work
 * (e.g. seeding, cross-user reports) that can't run as a specific user.
 */
export function createSupabaseAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}
