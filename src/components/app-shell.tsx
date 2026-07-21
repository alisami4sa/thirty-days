"use client";

import { useState } from "react";
import { useIdentity } from "@/hooks/use-identity";
import { useCycleData } from "@/hooks/use-cycle-data";
import { IdentityPicker } from "@/components/identity-picker";
import { BottomNav, type AppTab } from "@/components/bottom-nav";
import { TodayView } from "@/components/today-view";
import { BoardView } from "@/components/board-view";
import { HistoryView } from "@/components/history-view";
import { SettingsView } from "@/components/settings-view";
import { NoteAlertHost } from "@/components/note-alert-host";

export function AppShell() {
  const hydrated = useIdentity((s) => s.hydrated);
  const displayName = useIdentity((s) => s.displayName);
  const userId = useIdentity((s) => s.userId);
  const [tab, setTab] = useState<AppTab>("today");
  const data = useCycleData();

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (!displayName || !userId) {
    return <IdentityPicker />;
  }

  return (
    <div className="relative min-h-dvh">
      <div className="atmosphere" aria-hidden />
      <div className="relative mx-auto max-w-lg px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {data.loading ? (
          <div className="flex min-h-[60dvh] items-center justify-center">
            <p className="text-sm text-[var(--muted)]">Loading cycle…</p>
          </div>
        ) : data.error ? (
          <div className="rounded-2xl border border-[var(--fail)]/30 bg-[var(--fail-soft)] px-5 py-8 text-center">
            <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fail-deep)]">
              Could not load
            </h1>
            <p className="mt-2 text-sm text-[var(--fail-deep)]">{data.error}</p>
            <button
              type="button"
              className="mt-4 text-sm font-semibold underline"
              onClick={() => void data.refresh()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {tab === "today" && (
              <TodayView data={data} displayName={displayName} userId={userId} />
            )}
            {tab === "board" && <BoardView data={data} displayName={displayName} />}
            {tab === "history" && (
              <HistoryView data={data} displayName={displayName} userId={userId} />
            )}
            {tab === "settings" && (
              <SettingsView data={data} displayName={displayName} />
            )}
          </>
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
      <NoteAlertHost displayName={displayName} userId={userId} />
    </div>
  );
}
