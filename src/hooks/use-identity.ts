"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DisplayName } from "@/lib/types";
import { USER_IDS } from "@/lib/types";

interface IdentityState {
  displayName: DisplayName | null;
  userId: string | null;
  hydrated: boolean;
  setIdentity: (name: DisplayName) => void;
  clearIdentity: () => void;
  setHydrated: (v: boolean) => void;
}

function syncCookie(name: DisplayName | null) {
  if (typeof document === "undefined") return;
  if (!name) {
    document.cookie = "thirty_days_user=; path=/; max-age=0";
    return;
  }
  document.cookie = `thirty_days_user=${name}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export const useIdentity = create<IdentityState>()(
  persist(
    (set) => ({
      displayName: null,
      userId: null,
      hydrated: false,
      setIdentity: (name) => {
        syncCookie(name);
        set({ displayName: name, userId: USER_IDS[name] });
      },
      clearIdentity: () => {
        syncCookie(null);
        set({ displayName: null, userId: null });
      },
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "thirty-days-identity",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (state?.displayName) syncCookie(state.displayName);
      },
    }
  )
);
