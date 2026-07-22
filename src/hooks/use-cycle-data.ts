"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { localDb } from "@/lib/local-db";
import type {
  Challenge,
  ChallengeCycle,
  CheckinStatus,
  DailyCheckin,
} from "@/lib/types";
import { USER_IDS } from "@/lib/types";
import { todayISO } from "@/lib/dates";

export interface CycleData {
  cycle: ChallengeCycle | null;
  challenges: Challenge[];
  checkins: DailyCheckin[];
  cycles: ChallengeCycle[];
  loading: boolean;
  error: string | null;
  mode: "supabase" | "local";
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  setCheckin: (input: {
    challenge_id: string;
    user_id: string;
    date: string;
    status: CheckinStatus;
    proof_url?: string | null;
  }) => Promise<void>;
  uploadProof: (input: {
    challenge_id: string;
    user_id: string;
    date: string;
    file: File;
  }) => Promise<string>;
  updateChallenge: (challenge: Challenge) => Promise<void>;
  addChallenge: (challenge: Omit<Challenge, "id" | "cycle_id">) => Promise<void>;
  startNewCycle: (opts: {
    name: string;
    start_date?: string;
    challenges: Omit<Challenge, "id" | "cycle_id">[];
  }) => Promise<void>;
  resetFreshStart: () => Promise<void>;
}

async function fetchSupabase(): Promise<{
  cycle: ChallengeCycle | null;
  challenges: Challenge[];
  checkins: DailyCheckin[];
  cycles: ChallengeCycle[];
}> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: cycles, error: cyclesError } = await supabase
    .from("challenge_cycles")
    .select("*")
    .order("start_date", { ascending: false });

  if (cyclesError) throw cyclesError;

  const cycle = (cycles as ChallengeCycle[] | null)?.find((c) => c.status === "active") ?? null;

  if (!cycle) {
    return { cycle: null, challenges: [], checkins: [], cycles: (cycles as ChallengeCycle[]) ?? [] };
  }

  const [{ data: challenges, error: chError }, { data: checkins, error: ciError }] =
    await Promise.all([
      supabase
        .from("challenges")
        .select("*")
        .eq("cycle_id", cycle.id)
        .order("sort_order", { ascending: true }),
      supabase.from("daily_checkins").select("*").eq("cycle_id", cycle.id),
    ]);

  if (chError) throw chError;
  if (ciError) throw ciError;

  return {
    cycle,
    challenges: (challenges as Challenge[]) ?? [],
    checkins: (checkins as DailyCheckin[]) ?? [],
    cycles: (cycles as ChallengeCycle[]) ?? [],
  };
}

export function useCycleData(): CycleData {
  const mode = useMemo(() => (isSupabaseConfigured() ? "supabase" : "local"), []);
  const [cycle, setCycle] = useState<ChallengeCycle | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [cycles, setCycles] = useState<ChallengeCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      if (mode === "local") {
        const active = localDb.getActiveCycle();
        setCycle(active);
        setCycles(localDb.getCycles());
        setChallenges(active ? localDb.getChallenges(active.id) : []);
        setCheckins(active ? localDb.getCheckins(active.id) : []);
        setLastSyncedAt(new Date().toISOString());
        return;
      }
      const data = await fetchSupabase();
      setCycle(data.cycle);
      setChallenges(data.challenges);
      setCheckins(data.checkins);
      setCycles(data.cycles);
      setLastSyncedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
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
    const cycleId = cycle?.id;
    if (!supabase || !cycleId) return;

    const channel = supabase
      .channel(`cycle-${cycleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_checkins", filter: `cycle_id=eq.${cycleId}` },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenges", filter: `cycle_id=eq.${cycleId}` },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_cycles" },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mode, cycle?.id, refresh]);

  const setCheckin = useCallback(
    async (input: {
      challenge_id: string;
      user_id: string;
      date: string;
      status: CheckinStatus;
      proof_url?: string | null;
    }) => {
      if (!cycle) throw new Error("No active cycle");

      setCheckins((prev) => {
        const idx = prev.findIndex(
          (c) =>
            c.challenge_id === input.challenge_id &&
            c.user_id === input.user_id &&
            c.date === input.date
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            status: input.status,
            proof_url:
              input.proof_url !== undefined ? input.proof_url : next[idx].proof_url,
            updated_at: new Date().toISOString(),
          };
          return next;
        }
        return [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            cycle_id: cycle.id,
            challenge_id: input.challenge_id,
            user_id: input.user_id,
            date: input.date,
            status: input.status,
            proof_url: input.proof_url ?? null,
            updated_at: new Date().toISOString(),
          },
        ];
      });

      if (mode === "local") {
        localDb.upsertCheckin({
          ...input,
          cycle_id: cycle.id,
          proof_url: input.proof_url,
        });
        setLastSyncedAt(new Date().toISOString());
        return;
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");

      const payload: Record<string, unknown> = {
        cycle_id: cycle.id,
        challenge_id: input.challenge_id,
        user_id: input.user_id,
        date: input.date,
        status: input.status,
        updated_at: new Date().toISOString(),
      };
      if (input.proof_url !== undefined) payload.proof_url = input.proof_url;

      const { error: upsertError } = await supabase
        .from("daily_checkins")
        .upsert(payload, { onConflict: "challenge_id,user_id,date" });

      if (upsertError) {
        await refresh();
        throw upsertError;
      }
      setLastSyncedAt(new Date().toISOString());
    },
    [cycle, mode, refresh]
  );

  const uploadProof = useCallback(
    async (input: {
      challenge_id: string;
      user_id: string;
      date: string;
      file: File;
    }) => {
      if (!cycle) throw new Error("No active cycle");

      if (mode === "local") {
        const dataUrl = await fileToDataUrl(input.file);
        await setCheckin({
          challenge_id: input.challenge_id,
          user_id: input.user_id,
          date: input.date,
          status: "completed",
          proof_url: dataUrl,
        });
        return dataUrl;
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");

      const ext = (input.file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${cycle.id}/${input.user_id}/${input.date}-${input.challenge_id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("proofs")
        .upload(path, input.file, { upsert: true, contentType: input.file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("proofs").getPublicUrl(path);
      const url = data.publicUrl;
      await setCheckin({
        challenge_id: input.challenge_id,
        user_id: input.user_id,
        date: input.date,
        status: "completed",
        proof_url: url,
      });
      return url;
    },
    [cycle, mode, setCheckin]
  );

  const updateChallenge = useCallback(
    async (challenge: Challenge) => {
      if (mode === "local") {
        localDb.updateChallenge(challenge);
        await refresh();
        return;
      }
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      const { error: updateError } = await supabase
        .from("challenges")
        .update({
          title: challenge.title,
          description: challenge.description,
          applies_to: challenge.applies_to,
          metadata: challenge.metadata,
          sort_order: challenge.sort_order,
          enabled: challenge.enabled,
        })
        .eq("id", challenge.id);
      if (updateError) throw updateError;
      await refresh();
    },
    [mode, refresh]
  );

  const addChallenge = useCallback(
    async (challenge: Omit<Challenge, "id" | "cycle_id">) => {
      if (!cycle) throw new Error("No active cycle");
      if (mode === "local") {
        localDb.addChallenge({ ...challenge, cycle_id: cycle.id });
        await refresh();
        return;
      }
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      const { error: insertError } = await supabase.from("challenges").insert({
        cycle_id: cycle.id,
        ...challenge,
      });
      if (insertError) throw insertError;
      await refresh();
    },
    [cycle, mode, refresh]
  );

  const startNewCycle = useCallback(
    async (opts: {
      name: string;
      start_date?: string;
      challenges: Omit<Challenge, "id" | "cycle_id">[];
    }) => {
      const start = opts.start_date ?? todayISO();
      if (mode === "local") {
        localDb.startNewCycle({
          name: opts.name,
          start_date: start,
          challenges: opts.challenges,
        });
        await refresh();
        return;
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");

      if (cycle) {
        const { error: archiveError } = await supabase
          .from("challenge_cycles")
          .update({ status: "archived" })
          .eq("id", cycle.id);
        if (archiveError) throw archiveError;
      }

      const endDate = new Date(start + "T12:00:00");
      endDate.setDate(endDate.getDate() + 29);
      const end = endDate.toISOString().slice(0, 10);

      const { data: newCycle, error: createError } = await supabase
        .from("challenge_cycles")
        .insert({
          name: opts.name,
          start_date: start,
          end_date: end,
          status: "active",
        })
        .select("*")
        .single();

      if (createError) throw createError;

      if (opts.challenges.length > 0) {
        const { error: chError } = await supabase.from("challenges").insert(
          opts.challenges.map((ch, i) => ({
            cycle_id: newCycle.id,
            title: ch.title,
            description: ch.description,
            applies_to: ch.applies_to,
            metadata: ch.metadata ?? {},
            sort_order: ch.sort_order ?? i + 1,
            enabled: ch.enabled ?? true,
          }))
        );
        if (chError) throw chError;
      }

      await refresh();
    },
    [cycle, mode, refresh]
  );

  const resetFreshStart = useCallback(async () => {
    const start = todayISO();
    const endDate = new Date(start + "T12:00:00");
    endDate.setDate(endDate.getDate() + 29);
    const end = endDate.toISOString().slice(0, 10);

    if (mode === "local") {
      localDb.resetFreshStart(start);
      try {
        localStorage.removeItem("thirty-days-note-seen:" + USER_IDS.Ali);
        localStorage.removeItem("thirty-days-note-seen:" + USER_IDS.Hajar);
      } catch {
        /* ignore */
      }
      await refresh();
      return;
    }

    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");
    if (!cycle) throw new Error("No active cycle");

    const { error: checkinsError } = await supabase
      .from("daily_checkins")
      .delete()
      .eq("cycle_id", cycle.id);
    if (checkinsError) throw checkinsError;

    const { error: notesError } = await supabase.from("notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (notesError) throw notesError;

    const { error: cycleError } = await supabase
      .from("challenge_cycles")
      .update({ start_date: start, end_date: end, name: "Cycle 1" })
      .eq("id", cycle.id);
    if (cycleError) throw cycleError;

    try {
      localStorage.removeItem("thirty-days-note-seen:" + USER_IDS.Ali);
      localStorage.removeItem("thirty-days-note-seen:" + USER_IDS.Hajar);
    } catch {
      /* ignore */
    }

    await refresh();
  }, [cycle, mode, refresh]);

  return {
    cycle,
    challenges,
    checkins,
    cycles,
    loading,
    error,
    mode,
    lastSyncedAt,
    refresh,
    setCheckin,
    uploadProof,
    updateChallenge,
    addChallenge,
    startNewCycle,
    resetFreshStart,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
