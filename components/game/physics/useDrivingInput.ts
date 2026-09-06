"use client";

import { useEffect } from "react";
import { useGameStore } from "../stores/useGameStore";

export type DrivingAction =
  | "throttle"
  | "brake"
  | "left"
  | "right"
  | "handbrake";

export const drivingInput = {
  throttle: false,
  brake: false,
  left: false,
  right: false,
  handbrake: false,
  // Analog inputs from controller:
  steerAxis: 0, // -1 (full left) to +1 (full right)
  throttleAxis: 0, // 0 to 1
  brakeAxis: 0, // 0 to 1
  controllerHandbrake: false,
};

export function clearDrivingInput() {
  drivingInput.throttle = false;
  drivingInput.brake = false;
  drivingInput.left = false;
  drivingInput.right = false;
  drivingInput.handbrake = false;
  drivingInput.steerAxis = 0;
  drivingInput.throttleAxis = 0;
  drivingInput.brakeAxis = 0;
  drivingInput.controllerHandbrake = false;
}
const bindings: Record<string, DrivingAction> = {
  KeyW: "throttle",
  ArrowUp: "throttle",
  KeyS: "brake",
  ArrowDown: "brake",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "handbrake",
};

export function useDrivingInput() {
  useEffect(() => {
    const held = new Set<string>();
    const clear = () => {
      held.clear();
      clearDrivingInput();
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
      )
        return;
      const down = event.type === "keydown";
      if (bindings[event.code]) {
        if (event.target instanceof HTMLButtonElement && event.code === "Space")
          return;
        event.preventDefault();
        if (down) held.add(event.code);
        else held.delete(event.code);
        const action = bindings[event.code];
        drivingInput[action] = Object.keys(bindings).some(
          (code) => bindings[code] === action && held.has(code),
        );
      }
      if (down && !event.repeat && event.code === "Escape") {
        useGameStore.getState().setPaused(!useGameStore.getState().paused);
        clear();
      }
      if (down && !event.repeat && event.code === "KeyR") {
        clear();
        useGameStore.getState().reset();
      }
    };
    const blur = () => {
      clear();
      useGameStore.getState().setPaused(true);
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clear();
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
}
