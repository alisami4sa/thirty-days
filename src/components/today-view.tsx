"use client";

import { useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import type { Challenge, DisplayName } from "@/lib/types";
import { challengeAppliesTo, proteinTarget } from "@/lib/types";
import { cycleDayNumber, cycleTotalDays, formatDayLabel, todayISO } from "@/lib/dates";
import { dayProgress, getCheckin, statusOf } from "@/lib/stats";
import {
  aheadLine,
  challengeNeedsProof,
} from "@/lib/insights";
import type { CycleData } from "@/hooks/use-cycle-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { SuccessBurst, useSuccessBurst } from "@/components/success-burst";
import { NotePanel } from "@/components/note-panel";
import { RefreshButton } from "@/components/refresh-button";
import { cn } from "@/lib/utils";

export function TodayView({
  data,
  displayName,
  userId,
}: {
  data: CycleData;
  displayName: DisplayName;
  userId: string;
}) {
  const { cycle, challenges, checkins, setCheckin, uploadProof, mode, lastSyncedAt, refresh } = data;
  const today = todayISO();
  const { fire, burstKey } = useSuccessBurst();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const mine = useMemo(
    () => challenges.filter((c) => challengeAppliesTo(c, displayName)),
    [challenges, displayName]
  );

  const progress = useMemo(
    () => dayProgress(checkins, challenges, displayName, today),
    [checkins, challenges, displayName, today]
  );

  const nextPending = useMemo(
    () => mine.find((c) => statusOf(checkins, c.id, userId, today) === "pending") ?? null,
    [mine, checkins, userId, today]
  );

  const standings = useMemo(
    () => aheadLine(checkins, challenges, today),
    [checkins, challenges, today]
  );

  const syncedLabel = useMemo(() => {
    if (!lastSyncedAt) return mode === "supabase" ? "Connecting…" : "Local";
    try {
      return `${mode === "supabase" ? "Live" : "Local"} · synced ${format(parseISO(lastSyncedAt), "HH:mm:ss")}`;
    } catch {
      return mode === "supabase" ? "Live" : "Local";
    }
  }, [lastSyncedAt, mode]);

  if (!cycle) {
    return (
      <EmptyState title="No active cycle" body="Start a 30-day cycle from Settings." />
    );
  }

  const dayNum = cycleDayNumber(cycle, today);
  const total = cycleTotalDays(cycle);
  const inCycle = today >= cycle.start_date && today <= cycle.end_date;

  const onStatus = async (challenge: Challenge, status: "completed" | "failed") => {
    if (status === "completed" && challengeNeedsProof(challenge)) {
      fileRefs.current[challenge.id]?.click();
      return;
    }
    setBusyId(challenge.id);
    setProofError(null);
    try {
      await setCheckin({
        challenge_id: challenge.id,
        user_id: userId,
        date: today,
        status,
      });
      if (status === "completed") fire();
    } finally {
      setBusyId(null);
    }
  };

  const onProofSelected = async (challenge: Challenge, file: File | null) => {
    if (!file) return;
    setBusyId(challenge.id);
    setProofError(null);
    try {
      await uploadProof({
        challenge_id: challenge.id,
        user_id: userId,
        date: today,
        file,
      });
      fire();
    } catch (e) {
      setProofError(
        e instanceof Error
          ? e.message
          : "Could not upload proof. Run supabase/migrations/004_proofs.sql if needed."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-40">
      <SuccessBurst burstKey={burstKey} />
      <header className="pt-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            {cycle.name} · Day {Math.min(Math.max(dayNum, 1), total)}/{total}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium text-[var(--muted)]" title="Realtime sync status">
              {syncedLabel}
            </p>
            <RefreshButton onRefresh={refresh} />
          </div>
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Today, {displayName}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {formatDayLabel(today)} · {progress.done}/{progress.total} complete
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--ink-soft)]">{standings}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <motion.div
            className="h-full rounded-full bg-[var(--accent)]"
            initial={{ width: 0 }}
            animate={{
              width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%",
            }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </header>

      {!inCycle && (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          Today is outside the active cycle window ({cycle.start_date} → {cycle.end_date}).
        </p>
      )}

      {proofError && (
        <p className="rounded-xl bg-[var(--fail-soft)] px-4 py-3 text-sm text-[var(--fail-deep)]">
          {proofError}
        </p>
      )}

      <NotePanel displayName={displayName} userId={userId} />

      <ul className="space-y-3">
        {mine.map((challenge) => {
          const status = statusOf(checkins, challenge.id, userId, today);
          const target = proteinTarget(challenge, displayName);
          const needsProof = challengeNeedsProof(challenge);
          const checkin = getCheckin(checkins, challenge.id, userId, today);
          return (
            <li
              key={challenge.id}
              id={`challenge-${challenge.id}`}
              className={cn(
                "rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 p-4 backdrop-blur-sm",
                status === "completed" && "border-[var(--ok)]/35",
                status === "failed" && "border-[var(--fail)]/35"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    {challenge.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                    {challenge.description}
                    {target != null && (
                      <span className="mt-1 block font-medium text-[var(--ink-soft)]">
                        Target: {target}g protein
                      </span>
                    )}
                    {needsProof && (
                      <span className="mt-1 block text-xs font-semibold text-[var(--accent)]">
                        Photo proof required
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={status} />
              </div>

              {checkin?.proof_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={checkin.proof_url}
                  alt={`${challenge.title} proof`}
                  className="mt-3 max-h-48 w-full rounded-xl object-cover"
                />
              )}

              {needsProof && (
                <input
                  ref={(el) => {
                    fileRefs.current[challenge.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) =>
                    void onProofSelected(challenge, e.target.files?.[0] ?? null)
                  }
                />
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="success"
                  size="lg"
                  disabled={!inCycle || busyId === challenge.id}
                  onClick={() => void onStatus(challenge, "completed")}
                  aria-label={`Mark ${challenge.title} completed`}
                >
                  {needsProof ? "Complete + photo" : "Complete"}
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  disabled={!inCycle || busyId === challenge.id}
                  onClick={() => void onStatus(challenge, "failed")}
                  aria-label={`Mark ${challenge.title} failed`}
                >
                  Fail
                </Button>
              </div>
              {status !== "pending" && (
                <button
                  type="button"
                  className="mt-2 w-full py-2 text-center text-xs font-semibold text-[var(--muted)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  onClick={() =>
                    void setCheckin({
                      challenge_id: challenge.id,
                      user_id: userId,
                      date: today,
                      status: "pending",
                      proof_url: null,
                    })
                  }
                >
                  Reset to pending
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {mine.length === 0 && (
        <EmptyState title="Nothing for you today" body="No enabled challenges apply to your profile." />
      )}

      {inCycle && nextPending && (
        <div
          className="fixed inset-x-0 z-30 border-t border-[var(--line)] bg-[var(--bg)]/95 px-4 pt-3 backdrop-blur-md"
          style={{ bottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-lg items-center gap-3 pb-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Next up
              </p>
              <p className="truncate font-semibold text-[var(--ink)]">{nextPending.title}</p>
            </div>
            <Button
              size="sm"
              variant="success"
              disabled={busyId === nextPending.id}
              onClick={() => {
                document.getElementById(`challenge-${nextPending.id}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                void onStatus(nextPending, "completed");
              }}
            >
              {challengeNeedsProof(nextPending) ? "Photo" : "Done"}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busyId === nextPending.id}
              onClick={() => void onStatus(nextPending, "failed")}
            >
              Fail
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-10 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}
