"use client";

import { useMemo } from "react";
import type { DisplayName } from "@/lib/types";
import { challengeAppliesTo, proteinTarget, USER_IDS } from "@/lib/types";
import { cycleDates, cycleDayNumber, cycleTotalDays, todayISO } from "@/lib/dates";
import { completionRate, currentStreak, dayProgress, statusOf } from "@/lib/stats";
import type { CycleData } from "@/hooks/use-cycle-data";
import { StatusDot } from "@/components/status-badge";
import { RefreshButton } from "@/components/refresh-button";
import { cn } from "@/lib/utils";

export function BoardView({
  data,
  displayName,
}: {
  data: CycleData;
  displayName: DisplayName;
}) {
  const { cycle, challenges, checkins, refresh } = data;
  const today = todayISO();

  const dates = useMemo(() => (cycle ? cycleDates(cycle) : []), [cycle]);
  const enabled = useMemo(() => challenges.filter((c) => c.enabled), [challenges]);

  const stats = useMemo(() => {
    if (!cycle) return null;
    return {
      ali: {
        pct: completionRate(checkins, enabled, "Ali", dates, today),
        streak: currentStreak(checkins, enabled, "Ali", dates, today),
        today: dayProgress(checkins, enabled, "Ali", today),
      },
      hajar: {
        pct: completionRate(checkins, enabled, "Hajar", dates, today),
        streak: currentStreak(checkins, enabled, "Hajar", dates, today),
        today: dayProgress(checkins, enabled, "Hajar", today),
      },
    };
  }, [cycle, checkins, enabled, dates, today]);

  if (!cycle || !stats) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-10 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          No board yet
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Start a cycle to compare day by day.</p>
      </div>
    );
  }

  const dayNum = Math.min(Math.max(cycleDayNumber(cycle, today), 1), cycleTotalDays(cycle));
  const lead =
    stats.ali.pct === stats.hajar.pct
      ? "Tied"
      : stats.ali.pct > stats.hajar.pct
        ? "Ali leads"
        : "Hajar leads";

  return (
    <div className="space-y-6 pb-28">
      <header>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Competitive board · Day {dayNum}/{cycleTotalDays(cycle)}
          </p>
          <RefreshButton onRefresh={refresh} />
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Ali vs Hajar
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{lead} · {cycle.name}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <PersonStat
          name="Ali"
          highlight={displayName === "Ali"}
          pct={stats.ali.pct}
          streak={stats.ali.streak}
          todayDone={stats.ali.today.done}
          todayTotal={stats.ali.today.total}
        />
        <PersonStat
          name="Hajar"
          highlight={displayName === "Hajar"}
          pct={stats.hajar.pct}
          streak={stats.hajar.streak}
          todayDone={stats.hajar.today.done}
          todayTotal={stats.hajar.today.total}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70">
        <div className="grid grid-cols-[minmax(0,1.4fr)_1fr_1fr] gap-0 border-b border-[var(--line)] bg-[var(--surface-raised)]/80 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          <span>Challenge</span>
          <span className="text-center">Ali</span>
          <span className="text-center">Hajar</span>
        </div>

        <ul>
          {enabled.map((challenge) => {
            const aliApplies = challengeAppliesTo(challenge, "Ali");
            const hajarApplies = challengeAppliesTo(challenge, "Hajar");
            const aliStatus = aliApplies
              ? statusOf(checkins, challenge.id, USER_IDS.Ali, today)
              : null;
            const hajarStatus = hajarApplies
              ? statusOf(checkins, challenge.id, USER_IDS.Hajar, today)
              : null;
            const aliTarget = proteinTarget(challenge, "Ali");
            const hajarTarget = proteinTarget(challenge, "Hajar");

            return (
              <li
                key={challenge.id}
                className="grid grid-cols-[minmax(0,1.4fr)_1fr_1fr] items-center gap-0 border-b border-[var(--line)] px-3 py-3 last:border-b-0"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate font-semibold text-[var(--ink)]">{challenge.title}</p>
                  {(aliTarget != null || hajarTarget != null) && (
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {aliApplies && aliTarget != null && `Ali ${aliTarget}g`}
                      {aliApplies && hajarApplies && aliTarget != null && hajarTarget != null && " · "}
                      {hajarApplies && hajarTarget != null && `Hajar ${hajarTarget}g`}
                    </p>
                  )}
                  {aliApplies !== hajarApplies && (
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {aliApplies ? "Ali only" : "Hajar only"}
                    </p>
                  )}
                </div>
                <Cell status={aliStatus} />
                <Cell status={hajarStatus} />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Day strip
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Full-day wins (every assigned challenge completed).
        </p>
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-1.5">
            {dates.map((date) => {
              const aliWin =
                enabled
                  .filter((c) => challengeAppliesTo(c, "Ali"))
                  .every((c) => statusOf(checkins, c.id, USER_IDS.Ali, date) === "completed") &&
                enabled.some((c) => challengeAppliesTo(c, "Ali"));
              const hajarWin =
                enabled
                  .filter((c) => challengeAppliesTo(c, "Hajar"))
                  .every((c) => statusOf(checkins, c.id, USER_IDS.Hajar, date) === "completed") &&
                enabled.some((c) => challengeAppliesTo(c, "Hajar"));
              const isToday = date === today;
              const n = cycleDayNumber(cycle, date);
              return (
                <div
                  key={date}
                  className={cn(
                    "flex w-10 flex-col items-center gap-1 rounded-lg border px-1 py-2",
                    isToday
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--surface)]"
                  )}
                  title={date}
                >
                  <span className="text-[10px] font-semibold text-[var(--muted)]">{n}</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      aliWin ? "bg-[var(--ok)]" : "bg-[var(--line-strong)]"
                    )}
                  />
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      hajarWin ? "bg-[var(--ok)]" : "bg-[var(--line-strong)]"
                    )}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-[var(--muted)]">
            <span>Top dot Ali · Bottom Hajar</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function PersonStat({
  name,
  highlight,
  pct,
  streak,
  todayDone,
  todayTotal,
}: {
  name: string;
  highlight: boolean;
  pct: number;
  streak: number;
  todayDone: number;
  todayTotal: number;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        highlight
          ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
          : "border-[var(--line)] bg-[var(--surface)]/70"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{name}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">{pct}%</p>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {streak} day streak · Today {todayDone}/{todayTotal}
      </p>
    </div>
  );
}

function Cell({ status }: { status: ReturnType<typeof statusOf> | null }) {
  if (status == null) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-[var(--muted)]">—</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <StatusDot status={status} />
      <span className="text-[10px] font-semibold capitalize text-[var(--muted)]">{status}</span>
    </div>
  );
}
