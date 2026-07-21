"use client";

import { LayoutGrid, CalendarDays, Settings2, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTab = "today" | "board" | "history" | "settings";

const tabs: { id: AppTab; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "history", label: "History", icon: CalendarDays },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--bg)]/92 backdrop-blur-md"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                isActive ? "text-[var(--ink)]" : "text-[var(--muted)]"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn("h-5 w-5", isActive && "text-[var(--accent)]")}
                strokeWidth={isActive ? 2.4 : 2}
              />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
