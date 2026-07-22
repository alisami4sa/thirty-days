"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import type { DisplayName } from "@/lib/types";
import { NOTE_MAX_LENGTH } from "@/lib/types";
import { useNotes } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function formatNoteTime(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM · HH:mm");
  } catch {
    return iso;
  }
}

export function NotePanel({
  displayName,
  userId,
}: {
  displayName: DisplayName;
  userId: string;
}) {
  const {
    otherName,
    loading,
    error,
    latestIncoming,
    latestOutgoing,
    sendNote,
    deleteNote,
  } = useNotes(displayName, userId);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [sentFlash, setSentFlash] = useState(false);
  const reduce = useReducedMotion();

  const onSend = async () => {
    setSending(true);
    setLocalError(null);
    try {
      await sendNote(draft);
      setDraft("");
      setSentFlash(true);
      window.setTimeout(() => setSentFlash(false), 1800);
      setOpen(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {latestIncoming && !loading && (
        <blockquote className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/60 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            From {otherName} · {formatNoteTime(latestIncoming.created_at)}
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink)]">
            {latestIncoming.body}
          </p>
        </blockquote>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-35 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--ink)] text-[var(--bg)] shadow-lg transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        style={{
          right: "max(1rem, env(safe-area-inset-right))",
          bottom: "calc(5.75rem + env(safe-area-inset-bottom))",
        }}
        aria-label={`Write a note to ${otherName}`}
      >
        <MessageSquare className="h-5 w-5" strokeWidth={2.2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-note-title"
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl"
              initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Note to {otherName}
                </p>
                <h2
                  id="compose-note-title"
                  className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]"
                >
                  Leave a line
                </h2>
              </div>

              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, NOTE_MAX_LENGTH))}
                placeholder={`Write a short note to ${otherName}…`}
                rows={3}
                maxLength={NOTE_MAX_LENGTH}
                aria-label={`Note to ${otherName}`}
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--muted)]">
                  {draft.trim().length}/{NOTE_MAX_LENGTH}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={sending || !draft.trim()}
                    onClick={() => void onSend()}
                  >
                    {sending ? "Sending…" : "Send note"}
                  </Button>
                </div>
              </div>

              {latestOutgoing && (
                <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)]/50 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                      Your last note · {formatNoteTime(latestOutgoing.created_at)}
                    </p>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-[var(--muted)] underline-offset-2 hover:underline"
                      onClick={() => void deleteNote(latestOutgoing.id)}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {latestOutgoing.body}
                  </p>
                </div>
              )}

              {(localError || error) && (
                <p className="text-sm text-[var(--fail-deep)]">{localError || error}</p>
              )}
              {sentFlash && (
                <p className="text-sm font-medium text-[var(--ok-deep)]">Sent to {otherName}.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
