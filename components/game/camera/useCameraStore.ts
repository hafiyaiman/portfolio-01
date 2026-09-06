"use client";

import { create } from "zustand";

export const useCameraStore = create<{
  mode: "follow" | "free";
  toggleMode: () => void;
}>((set) => ({
  mode: "follow",
  toggleMode: () => set((state) => ({ mode: state.mode === "follow" ? "free" : "follow" })),
}));
