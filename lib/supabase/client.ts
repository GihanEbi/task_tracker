"use client";

import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { useMemo } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Client Component hook: a Supabase client whose requests carry the current
 * Clerk session token, so Postgres RLS policies can see auth.jwt() claims.
 * Requires the Clerk <-> Supabase third-party auth integration to be enabled
 * in both dashboards before any RLS policy can rely on it.
 */
export function useSupabaseClient() {
  const { session } = useSession();

  return useMemo(
    () =>
      createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        accessToken: async () => (await session?.getToken()) ?? null,
      }),
    [session]
  );
}
