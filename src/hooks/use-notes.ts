"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { localDb } from "@/lib/local-db";
import type { DisplayName, Note } from "@/lib/types";
import { NOTE_MAX_LENGTH, USER_IDS } from "@/lib/types";

const NOTE_LIMIT = 20;

export function useNotes(displayName: DisplayName, userId: string) {
  const mode = useMemo(() => (isSupabaseConfigured() ? "supabase" : "local"), []);
  const otherName: DisplayName = displayName === "Ali" ? "Hajar" : "Ali";
  const otherId = USER_IDS[otherName];

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      if (mode === "local") {
        setNotes(localDb.getNotes().slice(0, NOTE_LIMIT));
        return;
      }
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error: fetchError } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(NOTE_LIMIT);
      if (fetchError) throw fetchError;
      setNotes((data as Note[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (mode === "local") {
      return localDb.subscribe(() => {
        void refresh();
      });
    }
    const supabase = getSupabase();
    if (!supabase) return;

    const channelName = `notes-${userId}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mode, refresh, userId]);

  const incoming = useMemo(
    () => notes.filter((n) => n.to_user_id === userId && n.from_user_id === otherId),
    [notes, userId, otherId]
  );

  const outgoing = useMemo(
    () => notes.filter((n) => n.from_user_id === userId && n.to_user_id === otherId),
    [notes, userId, otherId]
  );

  const latestIncoming = incoming[0] ?? null;
  const latestOutgoing = outgoing[0] ?? null;

  const sendNote = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Write something first");
      if (trimmed.length > NOTE_MAX_LENGTH) {
        throw new Error(`Keep it under ${NOTE_MAX_LENGTH} characters`);
      }

      if (mode === "local") {
        localDb.addNote({
          from_user_id: userId,
          to_user_id: otherId,
          body: trimmed,
        });
        await refresh();
        return;
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");

      const { error: insertError } = await supabase.from("notes").insert({
        from_user_id: userId,
        to_user_id: otherId,
        body: trimmed,
      });
      if (insertError) throw insertError;
      await refresh();
    },
    [mode, userId, otherId, refresh]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (mode === "local") {
        localDb.deleteNote(id, userId);
        await refresh();
        return;
      }
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      const { error: deleteError } = await supabase
        .from("notes")
        .delete()
        .eq("id", id)
        .eq("from_user_id", userId);
      if (deleteError) throw deleteError;
      await refresh();
    },
    [mode, userId, refresh]
  );

  return {
    otherName,
    loading,
    error,
    latestIncoming,
    latestOutgoing,
    recent: notes.filter(
      (n) =>
        (n.from_user_id === userId && n.to_user_id === otherId) ||
        (n.from_user_id === otherId && n.to_user_id === userId)
    ),
    sendNote,
    deleteNote,
    refresh,
  };
}
