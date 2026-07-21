import { Check, Circle, X } from "lucide-react";
import type { CheckinStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const config: Record<
  CheckinStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  completed: {
    label: "Done",
    icon: Check,
    className: "bg-[var(--ok-soft)] text-[var(--ok-deep)] border-[var(--ok)]/30",
  },
  failed: {
    label: "Failed",
    icon: X,
    className: "bg-[var(--fail-soft)] text-[var(--fail-deep)] border-[var(--fail)]/30",
  },
  pending: {
    label: "Pending",
    icon: Circle,
    className: "bg-[var(--surface-raised)] text-[var(--muted)] border-[var(--line)]",
  },
};

export function StatusBadge({
  status,
  compact = false,
}: {
  status: CheckinStatus;
  compact?: boolean;
}) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        c.className
      )}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.5} />
      {c.label}
    </span>
  );
}

export function StatusDot({ status }: { status: CheckinStatus }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        status === "completed" && "bg-[var(--ok)]",
        status === "failed" && "bg-[var(--fail)]",
        status === "pending" && "bg-[var(--line-strong)]"
      )}
      aria-label={status}
    />
  );
}
