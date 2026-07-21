"use client";

import type { DisplayName } from "@/lib/types";
import { useNoteAlerts } from "@/hooks/use-note-alerts";
import { NotePopup } from "@/components/note-popup";

export function NoteAlertHost({
  displayName,
  userId,
}: {
  displayName: DisplayName;
  userId: string;
}) {
  const { popupNote, otherName, dismiss } = useNoteAlerts(displayName, userId);

  return <NotePopup note={popupNote} fromName={otherName} onDismiss={dismiss} />;
}
