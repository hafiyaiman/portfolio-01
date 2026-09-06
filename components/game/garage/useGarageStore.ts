"use client";
import { create } from "zustand";
import { DEFAULT_BUILD, validateBuild, type Build } from "./catalog";

export const useGarageStore = create<{ open: boolean; build: Build; setOpen: (open: boolean) => void; save: (build: Build) => void }>((set) => ({
  open: false, build: DEFAULT_BUILD,
  setOpen: open => set({ open }),
  save: build => {
    const valid = validateBuild(build);
    set({ build: valid });
    try { localStorage.setItem("genting-s15-build-v1", JSON.stringify(valid)); } catch { /* Session customization still works when storage is blocked. */ }
  },
}));
export function loadGarageBuild() {
  try { useGarageStore.setState({ build: validateBuild(JSON.parse(localStorage.getItem("genting-s15-build-v1") || "null")) }); } catch { /* Keep the original build. */ }
}
