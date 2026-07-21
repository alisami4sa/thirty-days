"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { DisplayName, Note } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function NotePopup({
  note,
  fromName,
  onDismiss,
}: {
  note: Note | null;
  fromName: DisplayName;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-popup-title"
          onClick={onDismiss}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              New note
            </p>
            <h2
              id="note-popup-title"
              className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]"
            >
              From {fromName}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">{note.body}</p>
            <Button className="mt-6 w-full" size="lg" onClick={onDismiss}>
              Got it
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
