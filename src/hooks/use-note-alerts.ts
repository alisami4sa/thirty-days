"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DisplayName, Note } from "@/lib/types";
import { useNotes } from "@/hooks/use-notes";

const seenKey = (userId: string) => `thirty-days-note-seen:${userId}`;
const notifyKey = "thirty-days-note-notify";

export function getNoteNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(notifyKey) === "1";
}

export function setNoteNotifyEnabled(on: boolean) {
  localStorage.setItem(notifyKey, on ? "1" : "0");
}

export async function ensureNoteNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") {
    setNoteNotifyEnabled(true);
    return "granted";
  }
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  setNoteNotifyEnabled(result === "granted");
  return result;
}

function fireBrowserNotify(from: DisplayName, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getNoteNotifyEnabled()) return;

  try {
    const n = new Notification(`Note from ${from}`, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "thirty-days-note",
      renotify: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Safari / older WebViews may throw
  }
}

export function useNoteAlerts(displayName: DisplayName, userId: string) {
  const { otherName, latestIncoming, loading } = useNotes(displayName, userId);
  const [popupNote, setPopupNote] = useState<Note | null>(null);
  const primed = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!primed.current) {
      primed.current = true;
      if (latestIncoming) {
        localStorage.setItem(seenKey(userId), latestIncoming.id);
      }
      return;
    }

    if (!latestIncoming) return;

    const seen = localStorage.getItem(seenKey(userId));
    if (seen === latestIncoming.id) return;

    localStorage.setItem(seenKey(userId), latestIncoming.id);
    setPopupNote(latestIncoming);
    fireBrowserNotify(otherName, latestIncoming.body);
  }, [loading, latestIncoming, userId, otherName]);

  const dismiss = useCallback(() => {
    if (popupNote) {
      localStorage.setItem(seenKey(userId), popupNote.id);
    }
    setPopupNote(null);
  }, [popupNote, userId]);

  return { popupNote, otherName, dismiss };
}
