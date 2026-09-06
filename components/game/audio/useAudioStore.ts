"use client";

import { create } from "zustand";

export const useAudioStore = create<{
  muted: boolean;
  volume: number;
  status: "locked" | "ready" | "unavailable";
  toggleMuted: () => void;
  setVolume: (volume: number) => void;
}>((set) => ({
  muted: false,
  volume: 0.65,
  status: "locked",
  toggleMuted: () => set((state) => ({ muted: !state.muted })),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
}));
