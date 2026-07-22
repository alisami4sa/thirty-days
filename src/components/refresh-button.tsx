"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { hardReloadApp, softRefresh } from "@/lib/reload";

export function RefreshButton({
  onRefresh,
  className,
  label,
}: {
  onRefresh: () => Promise<void>;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            await softRefresh(onRefresh);
          } finally {
            setBusy(false);
          }
        })();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        void hardReloadApp();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)]/90 text-[var(--ink)] shadow-sm transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 active:scale-95",
        label ? "h-10 px-3 text-xs font-semibold" : "h-10 w-10",
        className
      )}
      aria-label={label ?? "Refresh data. Long-press to reload the app."}
      title="Tap: refresh data · Long-press: reload app"
    >
      <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} strokeWidth={2.2} />
      {label}
    </button>
  );
}

export function ReloadAppButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void hardReloadApp();
      }}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50",
        className
      )}
    >
      <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
      Reload app
    </button>
  );
}
