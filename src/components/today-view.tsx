"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Challenge, DisplayName } from "@/lib/types";
import { challengeAppliesTo, proteinTarget } from "@/lib/types";
import { cycleDayNumber, cycleTotalDays, formatDayLabel, todayISO } from "@/lib/dates";
import { dayProgress, statusOf } from "@/lib/stats";
import type { CycleData } from "@/hooks/use-cycle-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { SuccessBurst, useSuccessBurst } from "@/components/success-burst";
import { NotePanel } from "@/components/note-panel";
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
  const { cycle, challenges, checkins, setCheckin } = data;
  const today = todayISO();
  const { fire, burstKey } = useSuccessBurst();
  const [busyId, setBusyId] = useState<string | null>(null);

  const mine = useMemo(
    () => challenges.filter((c) => challengeAppliesTo(c, displayName)),
    [challenges, displayName]
  );

  const progress = useMemo(
    () => dayProgress(checkins, challenges, displayName, today),
    [checkins, challenges, displayName, today]
  );

  if (!cycle) {
    return (
      <EmptyState title="No active cycle" body="Start a 30-day cycle from Settings." />
    );
  }

  const dayNum = cycleDayNumber(cycle, today);
  const total = cycleTotalDays(cycle);
  const inCycle = today >= cycle.start_date && today <= cycle.end_date;

  const onStatus = async (challenge: Challenge, status: "completed" | "failed") => {
    setBusyId(challenge.id);
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

  return (
    <div className="space-y-6 pb-28">
      <SuccessBurst burstKey={burstKey} />
      <header className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          {cycle.name} · Day {Math.min(Math.max(dayNum, 1), total)}/{total}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Today, {displayName}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {formatDayLabel(today)} · {progress.done}/{progress.total} complete
        </p>
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

      <NotePanel displayName={displayName} userId={userId} />

      <ul className="space-y-3">
        {mine.map((challenge) => {
          const status = statusOf(checkins, challenge.id, userId, today);
          const target = proteinTarget(challenge, displayName);
          return (
            <li
              key={challenge.id}
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
                  </p>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="success"
                  size="lg"
                  disabled={!inCycle || busyId === challenge.id}
                  onClick={() => void onStatus(challenge, "completed")}
                  aria-label={`Mark ${challenge.title} completed`}
                >
                  Complete
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
