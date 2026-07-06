import { createClient } from "@/lib/supabase/client";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function getCurrentUser() {
  const supabase = createClient();

  if (!supabase) {
    return { user: null, mode: "demo" as const };
  }

  const { data } = await supabase.auth.getUser();
  return { user: data.user, mode: data.user ? ("authenticated" as const) : ("anonymous" as const) };
}

export async function signInWithEmail(email: string) {
  const supabase = createClient();

  if (!supabase) {
    return { ok: false, mode: "demo" as const };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined
    }
  });

  return { ok: !error, error };
}

export async function signOut() {
  const supabase = createClient();

  if (!supabase) {
    return { ok: true, mode: "demo" as const };
  }

  const { error } = await supabase.auth.signOut();
  return { ok: !error, error };
}
