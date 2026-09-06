"use client";

import { create } from "zustand";

export type Telemetry = {
  speed: number;
  signedSpeed: number;
  braking: boolean;
  gear: number;
  rpm: number;
  boost: number;
  throttle: number;
  tireSlip: number;
  angle: number;
  score: number;
  multiplier: number;
  drifting: boolean;
  grounded: number;
  controllerConnected: boolean;
  controllerName: string;
  adaptiveTriggerActive: boolean;
};

export const initialTelemetry: Telemetry = {
  speed: 0,
  signedSpeed: 0,
  braking: false,
  gear: 1,
  rpm: 950,
  boost: 0,
  throttle: 0,
  tireSlip: 0,
  angle: 0,
  score: 0,
  multiplier: 1,
  drifting: false,
  grounded: 0,
  controllerConnected: false,
  controllerName: "",
  adaptiveTriggerActive: false,
};

export type AssistLevel = "arcade" | "sport" | "pro";

export function initAssistFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem("genting_drift_assist");
    if (saved === "arcade" || saved === "sport" || saved === "pro") {
      useGameStore.setState({ assistLevel: saved });
    }
  } catch {}
}

type GameState = Telemetry & {
  paused: boolean;
  resetId: number;
  assistLevel: AssistLevel;
  setPaused: (paused: boolean) => void;
  setAssistLevel: (level: AssistLevel) => void;
  reset: () => void;
};

// Physics writes via setState; the HUD subscribes imperatively, avoiding 60Hz React renders.
export const useGameStore = create<GameState>((set) => ({
  ...initialTelemetry,
  paused: false,
  resetId: 0,
  assistLevel: "sport",
  setPaused: (paused) => set({ paused }),
  setAssistLevel: (assistLevel) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("genting_drift_assist", assistLevel);
      } catch {}
    }
    set({ assistLevel });
  },
  reset: () =>
    set((state) => ({
      ...initialTelemetry,
      controllerConnected: state.controllerConnected,
      controllerName: state.controllerName,
      adaptiveTriggerActive: state.adaptiveTriggerActive,
      assistLevel: state.assistLevel,
      paused: false,
      resetId: state.resetId + 1,
    })),
}));
