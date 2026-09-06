"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  useGameStore,
  initAssistFromStorage,
  type Telemetry,
  type AssistLevel,
} from "../stores/useGameStore";
import { NFSGaugeCluster } from "./NFSGaugeCluster";
import {
  clearDrivingInput,
  drivingInput,
  type DrivingAction,
} from "../physics/useDrivingInput";
import { AudioControls } from "../audio/AudioControls";
import { useCameraStore } from "../camera/useCameraStore";
import {
  connectDualSenseHID,
  setSelectedGamepadSlot,
  getSelectedGamepadSlot,
} from "../physics/useGamepad";

const button =
  "border-2 border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-xs font-bold uppercase tracking-widest shadow-[3px_3px_0_var(--line)] transition-colors hover:bg-[var(--accent)] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]";

function TouchButton({
  action,
  children,
}: {
  action: DrivingAction;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`${button} touch-none select-none active:bg-[var(--accent)] active:text-black`}
      aria-label={action}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drivingInput[action] = true;
      }}
      onPointerUp={() => {
        drivingInput[action] = false;
      }}
      onPointerCancel={() => {
        drivingInput[action] = false;
      }}
      onLostPointerCapture={() => {
        drivingInput[action] = false;
      }}
    >
      {children}
    </button>
  );
}

function ControllerDiagnosticsModal({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<{
    supported: boolean;
    secure: boolean;
    slots: {
      index: number;
      id: string;
      connected: boolean;
      axes: number[];
      activeButtons: number[];
    }[];
  }>({ supported: false, secure: false, slots: [] });

  useEffect(() => {
    let animId: number;
    const poll = () => {
      const supported =
        typeof navigator !== "undefined" && !!navigator.getGamepads;
      const secure = typeof window !== "undefined" && window.isSecureContext;
      const raw = supported ? navigator.getGamepads() : null;
      const slots: {
        index: number;
        id: string;
        connected: boolean;
        axes: number[];
        activeButtons: number[];
      }[] = [];
      if (raw) {
        for (let i = 0; i < raw.length; i++) {
          const g = raw[i];
          if (g) {
            const axes = Array.from(g.axes || []).map(
              (a) => Math.round(a * 100) / 100,
            );
            const activeButtons: number[] = [];
            if (g.buttons) {
              g.buttons.forEach((b, bIdx) => {
                if (b && (b.pressed || b.value > 0.1)) activeButtons.push(bIdx);
              });
            }
            slots.push({
              index: i,
              id: g.id || `Slot ${i}`,
              connected: !!g.connected,
              axes,
              activeButtons,
            });
          }
        }
      }
      setInfo({ supported, secure, slots });
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, []);

  const testVibration = () => {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const list = navigator.getGamepads();
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      if (
        g &&
        (
          g as unknown as {
            vibrationActuator?: {
              playEffect: (type: string, opts: unknown) => void;
            };
          }
        ).vibrationActuator?.playEffect
      ) {
        (
          g as unknown as {
            vibrationActuator: {
              playEffect: (type: string, opts: unknown) => void;
            };
          }
        ).vibrationActuator.playEffect("dual-rumble", {
          duration: 600,
          strongMagnitude: 0.8,
          weakMagnitude: 0.8,
        });
        break;
      }
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg border-2 border-[var(--accent)] bg-[var(--panel)] p-6 shadow-[10px_10px_0_#18181b]">
        <div className="flex items-center justify-between border-b border-[var(--line)]/50 pb-3">
          <h2 className="font-heading text-lg uppercase tracking-wider text-[var(--accent)]">
            🎮 Controller Diagnostics
          </h2>
          <button
            onClick={onClose}
            className={`${button} py-1 px-3 text-[10px]`}
          >
            ✕ Close
          </button>
        </div>

        <div className="my-4 space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-2 border border-[var(--line)]/30 bg-black/30 p-2.5 text-[11px]">
            <div>
              Browser Gamepad API:{" "}
              <span
                className={
                  info.supported
                    ? "font-bold text-green-400"
                    : "font-bold text-red-400"
                }
              >
                {info.supported ? "Supported ✓" : "Not Supported ✗"}
              </span>
            </div>
            <div>
              Security Context:{" "}
              <span
                className={
                  info.secure
                    ? "font-bold text-green-400"
                    : "font-bold text-yellow-400"
                }
              >
                {info.secure ? "Secure (HTTPS / Local) ✓" : "Insecure HTTP ⚠"}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold uppercase tracking-widest text-[var(--muted)]">
                Detected Gamepad Devices ({info.slots.length})
              </p>
              <span className="text-[10px] text-zinc-400 animate-pulse">
                Live Polling (30 Hz)...
              </span>
            </div>

            {info.slots.length > 0 ? (
              <div className="space-y-3">
                {info.slots.map((slot) => {
                  const currentSelected = getSelectedGamepadSlot();
                  const isSelected =
                    currentSelected === slot.index ||
                    (currentSelected === null &&
                      /xbox|360|xinput/i.test(slot.id)) ||
                    (currentSelected === null &&
                      slot.index === 2 &&
                      info.slots.length >= 3);

                  return (
                    <div
                      key={slot.index}
                      className={`p-3.5 transition-colors ${
                        isSelected
                          ? "border-2 border-emerald-400 bg-emerald-950/40 shadow-[3px_3px_0_#10b981]"
                          : "border border-zinc-700 bg-black/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`font-bold ${
                              isSelected ? "text-emerald-400" : "text-zinc-200"
                            }`}
                          >
                            {slot.id}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Slot {slot.index} ·{" "}
                            {slot.connected ? "Connected" : "Disconnected"}
                          </p>
                        </div>
                        <div>
                          {isSelected ? (
                            <span className="inline-block bg-emerald-500 text-black font-extrabold text-[10px] px-2 py-0.5 uppercase tracking-wider">
                              ACTIVE GAMEPAD ✓
                            </span>
                          ) : (
                            <button
                              onClick={() => setSelectedGamepadSlot(slot.index)}
                              className="bg-zinc-800 text-white border border-zinc-600 px-2.5 py-1 text-[10px] uppercase font-bold hover:bg-emerald-500 hover:text-black hover:border-emerald-400 cursor-pointer"
                            >
                              Select This Slot
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5 space-y-1 text-[11px]">
                        <p className="text-zinc-300">
                          <strong className="text-white">Axes:</strong> [
                          {slot.axes.map((a, idx) => `A${idx}:${a}`).join(" ")}]
                        </p>
                        <p className="text-zinc-300">
                          <strong className="text-white">
                            Active Buttons:
                          </strong>{" "}
                          {slot.activeButtons.length > 0
                            ? slot.activeButtons.map((b) => `B${b}`).join(", ")
                            : "None (idle)"}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={testVibration}
                  className={`${button} w-full text-center py-2.5 text-xs text-emerald-400 border-emerald-500`}
                >
                  ⚡ Test Controller Vibration (Rumble)
                </button>
              </div>
            ) : (
              <div className="border border-yellow-500/40 bg-yellow-950/20 p-4 text-left">
                <p className="font-bold text-yellow-400">
                  No Controller Detected in Browser Slots Yet
                </p>
                <div className="mt-2.5 space-y-2 text-[11px] text-zinc-300 leading-relaxed">
                  <p>
                    <strong className="text-white">1. Press Any Button:</strong>{" "}
                    In Windows Chrome/Edge, controllers are hidden until you
                    click this page and press{" "}
                    <kbd className="border border-white/40 px-1 font-bold">
                      A
                    </kbd>
                    ,{" "}
                    <kbd className="border border-white/40 px-1 font-bold">
                      B
                    </kbd>
                    , or pull{" "}
                    <kbd className="border border-white/40 px-1 font-bold">
                      RT
                    </kbd>
                    .
                  </p>
                  <p>
                    <strong className="text-white">
                      2. Check Steam Input:
                    </strong>{" "}
                    If Steam is running in your Windows tray, Steam often
                    intercepts Xbox 360 controllers in exclusive desktop mode.
                    Right-click Steam in your taskbar tray and select{" "}
                    <em>Exit Steam</em> to test.
                  </p>
                  <p>
                    <strong className="text-white">
                      3. Check Xbox Ring LED:
                    </strong>{" "}
                    On your Xbox 360 controller, is Player 1 (top-left) solid
                    green? If all 4 LEDs are flashing, the controller is looking
                    for its receiver.
                  </p>
                  <p>
                    <strong className="text-white">
                      4. Hardware Verification:
                    </strong>{" "}
                    Open{" "}
                    <a
                      href="https://hardwaretester.com/gamepad"
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-[var(--accent)] font-bold"
                    >
                      hardwaretester.com/gamepad ↗
                    </a>{" "}
                    in a new tab to see if your browser sees the controller.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameHUD() {
  const root = useRef<HTMLDivElement>(null);
  const score = useRef<HTMLSpanElement>(null);
  const angle = useRef<HTMLSpanElement>(null);
  const multiplier = useRef<HTMLSpanElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const resume = useRef<HTMLButtonElement>(null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const controllerBadge = useRef<HTMLButtonElement>(null);
  const controllerDot = useRef<HTMLSpanElement>(null);
  const controllerNameSpan = useRef<HTMLSpanElement>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const paused = useGameStore((state) => state.paused);
  const assistLevel = useGameStore((state) => state.assistLevel);
  const cameraMode = useCameraStore((state) => state.mode);

  const cycleAssistLevel = () => {
    const next: Record<AssistLevel, AssistLevel> = {
      arcade: "sport",
      sport: "pro",
      pro: "arcade",
    };
    useGameStore.getState().setAssistLevel(next[assistLevel]);
  };

  useEffect(() => {
    initAssistFromStorage();
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from("[data-enter]", {
          y: 16,
          opacity: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: "power2.out",
        });
      },
      root,
    );
    const update = (state: Telemetry) => {
      if (score.current)
        score.current.textContent = Math.floor(state.score).toLocaleString();
      if (angle.current)
        angle.current.textContent = `${Math.round(Math.abs(state.angle))}°`;
      if (multiplier.current)
        multiplier.current.textContent = `×${state.multiplier.toFixed(1)}`;
      if (popup.current)
        popup.current.style.opacity = state.drifting ? "1" : "0";
      if (controllerBadge.current && controllerNameSpan.current) {
        if (state.controllerConnected) {
          controllerBadge.current.className =
            "pointer-events-auto flex cursor-pointer items-center gap-2 border-2 border-emerald-400 bg-emerald-950/60 px-3 py-2 text-[10px] uppercase tracking-widest text-emerald-400 shadow-[3px_3px_0_#10b981] transition-colors hover:bg-emerald-900/60";
          controllerNameSpan.current.textContent = `🎮 ${state.controllerName || "Xbox Controller"} Connected`;
          if (controllerDot.current) {
            controllerDot.current.className =
              "inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]";
          }
        } else {
          controllerBadge.current.className =
            "pointer-events-auto flex cursor-pointer items-center gap-2 border border-[var(--muted)]/40 bg-[var(--panel)]/80 px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--muted)] shadow-[3px_3px_0_var(--line)] transition-colors hover:border-emerald-400 hover:text-white";
          controllerNameSpan.current.textContent =
            "🎮 Controller: Press any button";
          if (controllerDot.current) {
            controllerDot.current.className =
              "inline-block h-2 w-2 rounded-full bg-zinc-600";
          }
        }
      }
    };
    update(useGameStore.getState());
    const unsubscribe = useGameStore.subscribe(update);
    return () => {
      unsubscribe();
      media.revert();
    };
  }, []);

  useEffect(() => {
    if (!paused) return;
    const trigger = pauseButton.current;
    clearDrivingInput();
    resume.current?.focus();
    return () => {
      trigger?.focus();
    };
  }, [paused]);

  return (
    <div
      ref={root}
      className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 font-mono text-[var(--ink)] sm:p-7"
    >
      <header data-enter className="flex items-start justify-between gap-4">
        <div className="border-l-4 border-[var(--accent)] bg-[var(--panel)]/90 px-4 py-3">
          <p className="text-[10px] tracking-[0.25em] text-[var(--accent)]">
            MALAYSIA / TOUGE 01
          </p>
          <h1 className="mt-1 font-heading text-xl uppercase sm:text-3xl">
            Genting Drift
          </h1>
          <p className="mt-2 text-[10px] uppercase tracking-widest">
            Mountain loop / free run
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start">
          <button
            suppressHydrationWarning
            onClick={cycleAssistLevel}
            className="pointer-events-auto flex cursor-pointer items-center gap-2 border border-[var(--muted)]/40 bg-[var(--panel)]/80 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] shadow-[3px_3px_0_var(--line)] transition-colors hover:border-[var(--accent)] hover:text-white"
            title="Click to cycle handling assist: Arcade / Sport / Pro"
            aria-label={`Handling level: ${assistLevel}. Click to change.`}
          >
            <span suppressHydrationWarning>
              {assistLevel === "arcade" && "🔰 Mode: Arcade"}
              {assistLevel === "sport" && "⚡ Mode: Sport"}
              {assistLevel === "pro" && "🔥 Mode: Pro"}
            </span>
          </button>
          <button
            ref={controllerBadge}
            onClick={() => setShowDiagnostics(true)}
            className="pointer-events-auto flex cursor-pointer items-center gap-2 border border-[var(--muted)]/40 bg-[var(--panel)]/80 px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--muted)] shadow-[3px_3px_0_var(--line)] transition-colors hover:border-[var(--accent)] hover:text-white"
            title="Click for Controller Diagnostics & Testing"
          >
            <span
              ref={controllerDot}
              className="inline-block h-2 w-2 rounded-full bg-zinc-600"
            />
            <span ref={controllerNameSpan}>
              🎮 Controller: Press any button
            </span>
          </button>
          <AudioControls className={button} />
          <button
            ref={pauseButton}
            onClick={() => useGameStore.getState().setPaused(true)}
            className={`pointer-events-auto ${button}`}
          >
            Pause <span className="hidden sm:inline">[ESC]</span>
          </button>
        </div>
      </header>

      <div
        ref={popup}
        className="absolute top-[32%] left-1/2 -translate-x-1/2 -rotate-3 border-2 border-black bg-[var(--accent)] px-6 py-3 text-center text-black opacity-0 shadow-[6px_6px_0_#18181b]"
        aria-hidden="true"
      >
        <p className="text-xs font-bold tracking-[0.2em]">DRIFT LINK</p>
        <span ref={multiplier} className="text-5xl font-black">
          ×1.0
        </span>
      </div>

      <footer data-enter>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div className="border-2 border-[var(--line)] bg-[var(--panel)] p-4 shadow-[5px_5px_0_var(--line)]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Drift points
            </p>
            <span
              ref={score}
              className="text-3xl font-bold tabular-nums sm:text-4xl"
            >
              0
            </span>
            <p className="mt-2 text-[10px] uppercase tracking-widest">
              Slip angle <span ref={angle}>0°</span>
            </p>
          </div>
          <NFSGaugeCluster />
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-between gap-4">
          <div className="flex gap-2">
            <TouchButton action="left">Left</TouchButton>
            <TouchButton action="right">Right</TouchButton>
            <button
              aria-label={`Camera: ${cameraMode === "follow" ? "Follow" : "Free View"}. Switch to ${cameraMode === "follow" ? "Free View" : "Follow"}`}
              aria-pressed={cameraMode === "free"}
              onClick={() => useCameraStore.getState().toggleMode()}
              className={button}
            >
              {cameraMode === "follow" ? "Follow" : "Free View"}
            </button>
          </div>
          <div className="flex gap-2">
            <TouchButton action="brake">Brake / Rev</TouchButton>
            <TouchButton action="handbrake">Drift</TouchButton>
            <TouchButton action="throttle">Gas</TouchButton>
          </div>
        </div>
        <p className="mt-3 text-center text-[9px] uppercase tracking-widest text-white/80">
          {cameraMode === "free"
            ? "Free View: drag / swipe to orbit, scroll / pinch to zoom"
            : "Follow: camera automatically follows the car"}{" "}
          · V: switch mode · C: rear view
        </p>
        <p className="mt-2 hidden text-center text-[10px] uppercase tracking-widest text-white/80 sm:block">
          Keyboard: W/S: Gas/Brake · A/D: Steer · Space: Handbrake · R: Reset
          <br className="my-0.5" />
          Controller: RT: Gas (Adaptive) · LT: Brake (ABS) · Left Stick: Steer ·
          A / X / RB: Drift · Start: Pause · Mode: {assistLevel.toUpperCase()}
        </p>
      </footer>

      {paused && (
        <div
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const nodes =
              event.currentTarget.querySelectorAll<HTMLElement>("button, a");
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <div className="w-full max-w-md border-2 border-[var(--line)] bg-[var(--panel)] p-7 shadow-[8px_8px_0_var(--accent)]">
            <p className="text-xs tracking-widest text-[var(--accent)]">
              TAKE A BREATHER
            </p>
            <h2 id="pause-title" className="mt-3 font-heading text-4xl">
              Run paused.
            </h2>
            <p className="my-4 text-sm leading-relaxed text-[var(--muted)]">
              Carry speed into the bend. Feather the throttle on-boost, tap the
              handbrake, then counter-steer with the analog stick to hold your
              drift angle.
            </p>

            <div className="mb-4 border-2 border-[var(--line)] bg-black/40 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
                Handling & Steering Level
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["arcade", "sport", "pro"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => useGameStore.getState().setAssistLevel(lvl)}
                    className={`border px-2 py-2 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                      assistLevel === lvl
                        ? "border-[var(--accent)] bg-[var(--accent)] text-black shadow-[2px_2px_0_var(--line)]"
                        : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {lvl === "arcade" && "🔰 Arcade"}
                    {lvl === "sport" && "⚡ Sport"}
                    {lvl === "pro" && "🔥 Pro"}
                  </button>
                ))}
              </div>
              <p
                suppressHydrationWarning
                className="mt-2 text-[10px] leading-snug text-[var(--muted)]"
              >
                {assistLevel === "arcade" &&
                  "Arcade: Smooth steering, speed-damping & auto-catch counter-steer. Perfect for casual play & keyboard."}
                {assistLevel === "sport" &&
                  "Sport: Fast drift rack & wide angle-kit with natural counter-steer. Balanced for gamepads."}
                {assistLevel === "pro" &&
                  "Pro: 100% direct mechanical steering rack & full ~57° lock. Zero assists, pure simulation."}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <button
                ref={resume}
                className={button}
                onClick={() => useGameStore.getState().setPaused(false)}
              >
                Resume run
              </button>
              <button
                className={button}
                onClick={() => setShowDiagnostics(true)}
              >
                🎮 Test & Diagnose Controller
              </button>
              <button
                className={button}
                onClick={async () => {
                  const connected = await connectDualSenseHID();
                  if (connected) {
                    alert(
                      "PS5 DualSense WebHID connected! Mechanical adaptive triggers active.",
                    );
                  }
                }}
              >
                🎮 Enable PS5 DualSense Triggers (USB)
              </button>
              <button
                className={button}
                onClick={() => useGameStore.getState().reset()}
              >
                Reset car & score
              </button>
              <Link href="/" className={`${button} text-center`}>
                Exit to portfolio
              </Link>
            </div>
            <p className="mt-6 text-[10px] leading-relaxed text-[var(--muted)]">
              S15 model by{" "}
              <a
                className="underline"
                href="https://sketchfab.com/ZapupaNekra"
                target="_blank"
                rel="noreferrer"
              >
                ZapupaNekra
              </a>
              ,{" "}
              <a
                className="underline"
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
              . Assembled and materials adapted for this game.{" "}
              <a
                className="underline"
                href="/models/CREDITS.md"
                target="_blank"
                rel="noreferrer"
              >
                Full credits
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {showDiagnostics && (
        <ControllerDiagnosticsModal onClose={() => setShowDiagnostics(false)} />
      )}
    </div>
  );
}
