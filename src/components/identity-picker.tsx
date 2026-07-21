"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DisplayName } from "@/lib/types";
import { useIdentity } from "@/hooks/use-identity";

export function IdentityPicker() {
  const setIdentity = useIdentity((s) => s.setIdentity);
  const reduce = useReducedMotion();

  const pick = (name: DisplayName) => setIdentity(name);

  return (
    <main className="relative flex min-h-dvh flex-col justify-center px-5 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="atmosphere" aria-hidden />
      <motion.div
        className="relative mx-auto w-full max-w-md -translate-y-6"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Thirty Days
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-[0.95] tracking-tight text-[var(--ink)] sm:text-6xl">
          Who are you?
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-[var(--muted)]">
          Pick your name once. The board stays shared — only your check-ins change.
        </p>

        <div className="mt-10 grid gap-3">
          {(["Ali", "Hajar"] as DisplayName[]).map((name, i) => (
            <motion.button
              key={name}
              type="button"
              onClick={() => pick(name)}
              className="group flex h-20 items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)]/80 px-6 text-left backdrop-blur-sm transition-colors hover:border-[var(--ink)]/25 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.4 }}
            >
              <span className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                {name}
              </span>
              <span className="text-sm font-medium text-[var(--muted)] transition-colors group-hover:text-[var(--ink)]">
                Continue
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </main>
  );
}
