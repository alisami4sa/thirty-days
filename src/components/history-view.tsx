"use client";

import { useMemo, useState } from "react";
import type { DisplayName } from "@/lib/types";
import { challengeAppliesTo, proteinTarget, USER_IDS } from "@/lib/types";
import {
  cycleDates,
  cycleDayNumber,
  formatDayLabel,
  todayISO,
} from "@/lib/dates";
import { dayProgress, statusOf } from "@/lib/stats";
import { isDayEditable } from "@/lib/insights";
import type { CycleData } from "@/hooks/use-cycle-data";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { SuccessBurst, useSuccessBurst } from "@/components/success-burst";
import { RefreshButton } from "@/components/refresh-button";
import { cn } from "@/lib/utils";

export function HistoryView({
  data,
  displayName,
  userId,
}: {
  data: CycleData;
  displayName: DisplayName;
  userId: string;
}) {
  const { cycle, challenges, checkins, setCheckin, refresh } = data;
  const today = todayISO();
  const dates = useMemo(() => (cycle ? cycleDates(cycle) : []), [cycle]);
  const [selected, setSelected] = useState(today);
  const { fire, burstKey } = useSuccessBurst();
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeDate = dates.includes(selected)
    ? selected
    : dates.includes(today)
      ? today
      : (dates[0] ?? today);

  const mine = useMemo(
    () => challenges.filter((c) => challengeAppliesTo(c, displayName)),
    [challenges, displayName]
  );

  if (!cycle) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-10 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          No history
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">An active cycle is required.</p>
      </div>
    );
  }

  const editable = isDayEditable(cycle, activeDate, today);
  const progress = dayProgress(checkins, challenges, displayName, activeDate);

  const onStatus = async (
    challengeId: string,
    status: "completed" | "failed" | "pending"
  ) => {
    setBusyId(challengeId);
    try {
      await setCheckin({
        challenge_id: challengeId,
        user_id: userId,
        date: activeDate,
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
      <header>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            History · {cycle.name}
          </p>
          <RefreshButton onRefresh={refresh} />
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Browse days
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Past days lock after midnight. Only today stays editable.
        </p>
      </header>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {dates.map((date) => {
            const n = cycleDayNumber(cycle, date);
            const p = dayProgress(checkins, challenges, displayName, date);
            const isSelected = date === activeDate;
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                className={cn(
                  "flex w-14 flex-col items-center rounded-xl border px-1 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  isSelected
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
                )}
              >
                <span className={cn("text-[10px] font-semibold", !isSelected && "text-[var(--muted)]")}>
                  D{n}
                </span>
                <span className="mt-1 text-xs font-bold">
                  {p.done}/{p.total}
                </span>
                {isToday && (
                  <span className={cn("mt-1 text-[9px] font-semibold", isSelected ? "text-[var(--bg)]/80" : "text-[var(--accent)]")}>
                    Now
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              {formatDayLabel(activeDate)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Day {cycleDayNumber(cycle, activeDate)} · {progress.done}/{progress.total} for you
            </p>
          </div>
                          {!editable && (
            <span className="text-xs font-semibold text-[var(--muted)]">
              {activeDate < today ? "Locked" : "Read-only"}
            </span>
          )}
        </div>

        <ul className="mt-4 space-y-3">
          {mine.map((challenge) => {
            const status = statusOf(checkins, challenge.id, userId, activeDate);
            const target = proteinTarget(challenge, displayName);
            const otherName: DisplayName = displayName === "Ali" ? "Hajar" : "Ali";
            const otherApplies = challengeAppliesTo(challenge, otherName);
            const otherStatus = otherApplies
              ? statusOf(checkins, challenge.id, USER_IDS[otherName], activeDate)
              : null;

            return (
              <li key={challenge.id} className="border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{challenge.title}</p>
                    {target != null && (
                      <p className="text-xs text-[var(--muted)]">Target {target}g</p>
                    )}
                    {otherStatus && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {otherName}: {otherStatus}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={status} compact />
                </div>
                {editable && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={busyId === challenge.id}
                      onClick={() => void onStatus(challenge.id, "completed")}
                    >
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId === challenge.id}
                      onClick={() => void onStatus(challenge.id, "failed")}
                    >
                      Fail
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === challenge.id}
                      onClick={() => void onStatus(challenge.id, "pending")}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
