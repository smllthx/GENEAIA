import { createClient } from "@/lib/supabase/client";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function getCurrentUser() {
  const supabase = createClient();

  if (!supabase) {
    return { user: null, mode: "unconfigured" as const };
  }

  const { data } = await supabase.auth.getUser();
  return { user: data.user, mode: data.user ? ("authenticated" as const) : ("anonymous" as const) };
}

export async function signInWithEmail(email: string) {
  const supabase = createClient();

  if (!supabase) {
    return { ok: false, mode: "unconfigured" as const };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  });

  return { ok: !error, error };
}

export async function verifyEmailCode(email: string, token: string) {
  const supabase = createClient();

  if (!supabase) {
    return { ok: false, mode: "unconfigured" as const };
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email"
  });

  return { ok: !error, error };
}

export async function signOut() {
  const supabase = createClient();

  if (!supabase) {
    return { ok: true, mode: "unconfigured" as const };
  }

  const { error } = await supabase.auth.signOut();
  return { ok: !error, error };
}
