"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
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

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [openComposer, setOpenComposer] = useState(false);

  const onSend = async () => {
    setSending(true);
    setLocalError(null);
    try {
      await sendNote(draft);
      setDraft("");
      setOpenComposer(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 px-4 py-3 text-sm text-[var(--muted)]">
        Loading notes…
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 p-4 backdrop-blur-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Note to {otherName}
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Leave a line
          </h2>
        </div>
        {!openComposer && (
          <Button size="sm" variant="secondary" onClick={() => setOpenComposer(true)}>
            Write
          </Button>
        )}
      </div>

      {latestIncoming ? (
        <blockquote className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/60 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            From {otherName} · {formatNoteTime(latestIncoming.created_at)}
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink)]">
            {latestIncoming.body}
          </p>
        </blockquote>
      ) : (
        <p className="text-sm text-[var(--muted)]">No note from {otherName} yet.</p>
      )}

      {latestOutgoing && !openComposer && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)]/50 px-3.5 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Your last note · {formatNoteTime(latestOutgoing.created_at)}
            </p>
            <button
              type="button"
              className="text-[11px] font-semibold text-[var(--muted)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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

      {openComposer && (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            placeholder={`Say something to ${otherName}…`}
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            aria-label={`Note to ${otherName}`}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[var(--muted)]">
              {draft.trim().length}/{NOTE_MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setOpenComposer(false);
                  setDraft("");
                  setLocalError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={sending || !draft.trim()}
                onClick={() => void onSend()}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {(localError || error) && (
        <p className="text-sm text-[var(--fail-deep)]">{localError || error}</p>
      )}
    </section>
  );
}
