"use client";

import { useEffect } from "react";
import { useGameStore } from "../stores/useGameStore";
import { useAudioStore } from "./useAudioStore";
import { VehicleSound } from "./VehicleSound";

export function GameAudio() {
  useEffect(() => {
    let sound: VehicleSound | undefined;
    let frame = 0;
    let disposed = false;
    let resuming = false;
    useAudioStore.setState({ status: "locked" });

    const update = () => {
      const settings = useAudioStore.getState();
      sound?.update({ ...useGameStore.getState(), paused: useGameStore.getState().paused || document.hidden }, settings.volume, settings.muted);
    };
    const tick = () => { update(); frame = requestAnimationFrame(tick); };
    const unlock = () => {
      if (disposed || resuming) return;
      let context: AudioContext | undefined;
      try {
        if (!sound) {
          context = new AudioContext({ latencyHint: "interactive" });
          sound = new VehicleSound(context);
          sound.context.onstatechange = () => {
            if (!disposed && sound) useAudioStore.setState({ status: sound.context.state === "running" ? "ready" : "locked" });
          };
          frame = requestAnimationFrame(tick);
        }
        // resume must be called synchronously within the user's gesture.
        resuming = true;
        void sound.context.resume().then(() => {
          if (!disposed) { useAudioStore.setState({ status: "ready" }); update(); }
        }).catch(() => {
          if (!disposed) useAudioStore.setState({ status: "locked" });
        }).finally(() => { resuming = false; });
      } catch {
        if (context) void context.close().catch(() => {});
        useAudioStore.setState({ status: "unavailable" });
      }
    };
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-driving-game]") && !event.target.closest("[data-audio-controls]")) unlock();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"].includes(event.code)) unlock();
    };
    const visibility = () => {
      if (document.hidden) {
        update();
        if (sound?.context.state === "running") void sound.context.suspend().catch(() => {});
      }
    };
    // The sound button is also keyboard-accessible; click is a trusted activation gesture.
    window.addEventListener("genting-enable-audio", unlock);
    window.addEventListener("pointerdown", pointer);
    window.addEventListener("keydown", keyboard);
    document.addEventListener("visibilitychange", visibility);
    const unsubscribeGame = useGameStore.subscribe((state, previous) => {
      if (
        state.paused !== previous.paused ||
        state.resetId !== previous.resetId ||
        state.softResetId !== previous.softResetId
      ) update();
    });
    const unsubscribeAudio = useAudioStore.subscribe((state, previous) => {
      if (state.muted !== previous.muted || state.volume !== previous.volume) update();
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("genting-enable-audio", unlock);
      window.removeEventListener("pointerdown", pointer);
      window.removeEventListener("keydown", keyboard);
      document.removeEventListener("visibilitychange", visibility);
      unsubscribeGame();
      unsubscribeAudio();
      if (sound) { sound.context.onstatechange = null; sound.dispose(); }
    };
  }, []);
  return null;
}
