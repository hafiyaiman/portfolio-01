"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";
import { GameHUD } from "./ui/GameHUD";
import { clearDrivingInput, useDrivingInput } from "./physics/useDrivingInput";
import { useGamepad } from "./physics/useGamepad";
import { initialTelemetry, useGameStore } from "./stores/useGameStore";
import { GameAudio } from "./audio/GameAudio";
import { loadGarageBuild, useGarageStore } from "./garage/useGarageStore";

const Garage = dynamic(() => import("./garage/Garage"), { ssr: false, loading: () => <p className="p-10 text-white">Opening workshop...</p> });

function DrivingControls() {
  useDrivingInput();
  useGamepad();
  return null;
}

const GameCanvas = dynamic(() => import("./GameCanvas"), {
  ssr: false,
  loading: () => (
    <p
      className="grid h-full place-items-center font-mono text-sm text-white"
      role="status"
    >
      Loading mountain pass...
    </p>
  ),
});

class GameBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="absolute inset-0 z-30 grid place-content-center gap-4 bg-zinc-950 p-8 text-white">
        <h1 className="text-2xl">The mountain could not load.</h1>
        <p>Check WebGL support and your connection, then try again.</p>
        <button className="border p-3" onClick={() => window.location.reload()}>
          Reload game
        </button>
        <Link href="/">Back to portfolio</Link>
      </div>
    ) : (
      this.props.children
    );
  }
}

export function GentingDriftGame() {
  const garageOpen = useGarageStore(state => state.open);
  const openGarage = () => {
    clearDrivingInput();
    useGameStore.getState().setPaused(true);
    useGarageStore.getState().setOpen(true);
  };
  const closeGarage = () => {
    clearDrivingInput();
    useGameStore.getState().reset();
    useGarageStore.getState().setOpen(false);
  };
  useEffect(() => {
    loadGarageBuild();
    useGarageStore.getState().setOpen(false);
    useGameStore.setState((state) => ({
      ...initialTelemetry,
      controllerConnected: state.controllerConnected,
      controllerName: state.controllerName,
      adaptiveTriggerActive: state.adaptiveTriggerActive,
      paused: false,
    }));
  }, []);
  return (
    <main
      data-driving-game
      aria-label="Genting Highlands drift game"
      className="relative h-dvh w-full overflow-hidden bg-[var(--panel)]"
      style={
        {
          "--panel": "oklch(0.19 0.006 286)",
          "--ink": "oklch(0.97 0.003 286)",
          "--muted": "oklch(0.72 0.014 286)",
          "--line": "oklch(0.82 0.008 286)",
          "--accent": "oklch(0.9 0.17 112)",
        } as CSSProperties
      }
    >
      <GameBoundary>
        {garageOpen ? <Garage onClose={closeGarage} /> : <>
          <DrivingControls />
          <GameCanvas />
          <GameAudio />
          <GameHUD />
          <button onClick={openGarage} className="absolute left-1/2 top-24 z-30 -translate-x-1/2 border border-lime-300/60 bg-zinc-950/90 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-lime-300 hover:bg-lime-300 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300">Garage / customize</button>
        </>}
      </GameBoundary>
    </main>
  );
}
