"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  defaultAdaptivePreferences,
  sanitizeAdaptivePreferences,
  type AdaptivePreferences
} from "@/lib/adaptive-preferences";

const storageKey = "wallet-adaptive-preferences";

function readLocalPreferences() {
  if (typeof window === "undefined") return defaultAdaptivePreferences;
  try {
    return sanitizeAdaptivePreferences(JSON.parse(window.localStorage.getItem(storageKey) ?? "{}"));
  } catch {
    return defaultAdaptivePreferences;
  }
}

export function useSyncedPreferences() {
  const supabase = useMemo(() => createClient(), []);
  const [value, setValue] = useState<AdaptivePreferences>(readLocalPreferences);
  const [userId, setUserId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"local" | "saving" | "synced" | "error">("local");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;

    supabase.from("users").select("ui_preferences").eq("id", userId).maybeSingle().then(({ data }) => {
      if (!active) return;
      const remote = data?.ui_preferences && Object.keys(data.ui_preferences).length > 0
        ? sanitizeAdaptivePreferences(data.ui_preferences)
        : readLocalPreferences();
      setValue(remote);
      window.localStorage.setItem(storageKey, JSON.stringify(remote));
      setSyncState("synced");
    });

    const channel = supabase
      .channel(`wallet-preferences-${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` }, (payload) => {
        const next = sanitizeAdaptivePreferences((payload.new as { ui_preferences?: unknown }).ui_preferences);
        setValue(next);
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        setSyncState("synced");
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  useEffect(() => {
    const syncLocalTabs = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) setValue(sanitizeAdaptivePreferences(JSON.parse(event.newValue)));
    };
    window.addEventListener("storage", syncLocalTabs);
    return () => window.removeEventListener("storage", syncLocalTabs);
  }, []);

  const update = useCallback((nextValue: AdaptivePreferences) => {
    const next = sanitizeAdaptivePreferences(nextValue);
    setValue(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    if (!supabase || !userId) {
      setSyncState("local");
      return;
    }

    setSyncState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("users")
        .update({ ui_preferences: next, updated_at: new Date().toISOString() })
        .eq("id", userId);
      setSyncState(error ? "error" : "synced");
    }, 250);
  }, [supabase, userId]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  return { value, update, syncState };
}
