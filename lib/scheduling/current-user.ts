import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { USER_COLOR_PALETTE } from "./palette";

export interface AppUser {
  id: string;
  clerkUserId: string;
  name: string;
  role: string;
  department: string;
  email: string;
  capacity: number;
  color: string;
  isAdmin: boolean;
}

interface UserRow {
  id: string;
  clerk_user_id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  capacity: number;
  color: string;
  is_admin: boolean;
}

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    name: row.name,
    role: row.role,
    department: row.department,
    email: row.email,
    capacity: Number(row.capacity),
    color: row.color,
    isAdmin: row.is_admin,
  };
}

// Resolves the signed-in Clerk user to their `users` row, creating one on
// first sign-in. The very first person to ever sign in becomes admin; every
// later sign-in defaults to a regular (non-admin) member.
export async function getOrCreateAppUser(): Promise<AppUser> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Not signed in.");

  const supabase = createSupabaseAdminClient();

  const { data: existing, error: fetchError } = await supabase.from("users").select("*").eq("clerk_user_id", clerkUserId).maybeSingle();
  if (fetchError) throw fetchError;
  if (existing) return mapUser(existing as UserRow);

  const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
  const profile = await currentUser();
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || profile?.username || "New teammate";
  const email = profile?.primaryEmailAddress?.emailAddress ?? "";
  const isAdmin = (count ?? 0) === 0;
  const color = USER_COLOR_PALETTE[(count ?? 0) % USER_COLOR_PALETTE.length];

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({
      clerk_user_id: clerkUserId,
      name,
      role: isAdmin ? "Administrator" : "Team member",
      department: "General",
      email,
      capacity: 8,
      color,
      is_admin: isAdmin,
    })
    .select("*")
    .single();

  if (insertError) {
    // Another request may have created the row concurrently (unique clerk_user_id) — re-fetch.
    const { data: retry } = await supabase.from("users").select("*").eq("clerk_user_id", clerkUserId).maybeSingle();
    if (retry) return mapUser(retry as UserRow);
    throw insertError;
  }

  await supabase.from("user_settings").insert({ user_id: created.id, work_start: "09:00", capacity: 8, default_slot: 60 });

  return mapUser(created as UserRow);
}
