"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  X,
  Gauge,
  Gamepad2,
  Volume2,
  VolumeX,
  Sliders,
  RotateCcw,
  Wrench,
  Play,
  Camera,
  RefreshCw,
} from "lucide-react";
import { useGameStore, type AssistLevel } from "../stores/useGameStore";
import { useCameraStore } from "../camera/useCameraStore";
import { useControllerSettings } from "../stores/useControllerSettings";
import { connectDualSenseHID, getActiveGamepad } from "../physics/useGamepad";
import { useAudioStore } from "../audio/useAudioStore";
import { ControllerDiagnosticsModal } from "./GameHUD";
import { PauseMenuView } from "./PauseMenuView";

const resume = () => useGameStore.getState().setPaused(false);
const tabs = ["Race", "Controls", "Audio"] as const;
type Tab = (typeof tabs)[number];

export function RacingPauseMenu({ onGarage }: { onGarage: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("Race");
  const [active, setActive] = useState(0);
  const [diagnostics, setDiagnostics] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const back = useCallback(() => {
    if (confirming) { setConfirming(false); setActive(0); }
    else resume();
  }, [confirming]);
  const selectRow = useCallback((index: number) => { setActive(index); setNotice(""); }, []);

  // Stores
  const assist = useGameStore((s) => s.assistLevel);
  const controllerName = useGameStore((s) => s.controllerName);
  const controllerConnected = useGameStore((s) => s.controllerConnected);
  const score = useGameStore((s) => s.score);
  const multiplier = useGameStore((s) => s.multiplier);
  const camera = useCameraStore((s) => s.mode);
  const dpad = useControllerSettings((s) => s.dpadSteering);
  const vibration = useControllerSettings((s) => s.vibration);
  const adaptiveTriggerActive = useGameStore((s) => s.adaptiveTriggerActive);

  const audioMuted = useAudioStore((s) => s.muted);
  const audioVolume = useAudioStore((s) => s.volume);
  const audioStatus = useAudioStore((s) => s.status);

  // Focus container on mount for keyboard listening
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Handling cycler
  const cycleAssist = useCallback(
    (direction: 1 | -1) => {
      const levels: AssistLevel[] = ["arcade", "sport", "pro"];
      const currentIndex = levels.indexOf(assist);
      const nextIndex =
        (currentIndex + direction + levels.length) % levels.length;
      useGameStore.getState().setAssistLevel(levels[nextIndex]);
    },
    [assist],
  );

  // Volume adjuster
  const adjustVolume = useCallback(
    (delta: number) => {
      const nextVol = Math.max(
        0,
        Math.min(1, Math.round((audioVolume + delta) * 100) / 100),
      );
      useAudioStore.getState().setVolume(nextVol);
    },
    [audioVolume],
  );

  interface MenuRowItem {
    label: string;
    value?: string;
    subtitle?: string;
    isCycler?: boolean;
    actionLabel?: string;
    icon?: React.ReactNode;
    help: string;
    run: () => void;
    prev?: () => void;
    next?: () => void;
  }

  const raceRows: MenuRowItem[] = useMemo(
    () => [
      {
        label: "Resume driving",
        actionLabel: "CONTINUE >",
        icon: <Play size={15} className="fill-current" />,
        help: "Continue your current run.",
        run: resume,
      },
      {
        label: "Workshop",
        actionLabel: "CUSTOMIZE >",
        icon: <Wrench size={15} />,
        help: "Change paint, body parts and performance upgrades.",
        run: onGarage,
      },
      {
        label: "Handling",
        value: assist.toUpperCase(),
        subtitle: "Driving assistance level.",
        isCycler: true,
        icon: <Gauge size={15} />,
        help:
          assist === "arcade"
            ? "Arcade: High electronic stability control, automatic counter-steering assistance, forgiving drift angles."
            : assist === "sport"
              ? "Sport: Balanced drift physics with moderate slip angles and responsive weight transfer."
              : "Pro: Full physics simulation without assists. Demands manual counter-steer and precision throttle.",
        run: () => cycleAssist(1),
        prev: () => cycleAssist(-1),
        next: () => cycleAssist(1),
      },
      {
        label: "Camera",
        value: camera === "follow" ? "CHASE CAM" : "FREE ORBIT",
        subtitle: "Driving camera.",
        isCycler: true,
        icon: <Camera size={15} />,
        help:
          camera === "follow"
            ? "Dynamic chase camera smoothly tracking car momentum and drift angle."
            : "Free orbit camera allowing manual view rotation.",
        run: () => useCameraStore.getState().toggleMode(),
        prev: () => useCameraStore.getState().toggleMode(),
        next: () => useCameraStore.getState().toggleMode(),
      },
      {
        label: "Recover car",
        actionLabel: "RECOVER >",
        icon: <RotateCcw size={15} />,
        help: "Return the car to the nearest road. Keep your score.",
        run: () => useGameStore.getState().resetInPlace(),
      },
      {
        label: "Restart run",
        actionLabel: "RESTART >",
        icon: <RefreshCw size={15} />,
        help: "Return to the start and clear your score.",
        run: () => {
          setConfirming(true);
          setActive(0);
          setNotice("");
        },
      },
    ],
    [assist, camera, cycleAssist, onGarage],
  );

  const controlsRows: MenuRowItem[] = useMemo(
    () => [
      {
        label: "CONTROLLER PROFILE",
        value: controllerConnected ? "CONNECTED" : "KEYBOARD / AUTO",
        actionLabel: "VIEW >",
        icon: <Gamepad2 size={15} />,
        help: controllerName
          ? `Active device: ${controllerName}. Full analog trigger and thumbstick support enabled.`
          : "Connect any Xbox, PlayStation, or generic gamepad and press any button, or drive using WASD/arrows.",
        run: () => setDiagnostics(true),
      },
      {
        label: "DRIVING LAYOUT",
        value: "STANDARD",
        actionLabel: "INFO >",
        icon: <Sliders size={15} />,
        help: "Standard racing layout: RT gas throttle, LT progressive brake/reverse, Left Stick steering.",
        run: () =>
          setNotice("Standard layout is the active precision driving profile."),
      },
      {
        label: "D-PAD STEERING",
        value: dpad ? "ENABLED" : "DISABLED",
        isCycler: true,
        icon: <Sliders size={15} />,
        help: "Permit D-pad Left and Right buttons to steer simultaneously with the analog thumbstick.",
        run: () => useControllerSettings.setState({ dpadSteering: !dpad }),
        prev: () => useControllerSettings.setState({ dpadSteering: !dpad }),
        next: () => useControllerSettings.setState({ dpadSteering: !dpad }),
      },
      {
        label: "HAPTIC VIBRATION",
        value: vibration ? "ENABLED" : "DISABLED",
        isCycler: true,
        icon: <Gamepad2 size={15} />,
        help: "Rumble motors deliver tactile road friction, curb vibration, and lateral drift slip feedback.",
        run: () => useControllerSettings.setState({ vibration: !vibration }),
        prev: () => useControllerSettings.setState({ vibration: !vibration }),
        next: () => useControllerSettings.setState({ vibration: !vibration }),
      },
      {
        label: "ADAPTIVE TRIGGERS",
        value: adaptiveTriggerActive ? "ACTIVE (USB)" : "CONNECT USB",
        actionLabel: adaptiveTriggerActive ? "ACTIVE >" : "CONNECT ↗",
        icon: <Gamepad2 size={15} />,
        help: "Hardware mechanical resistance on L2/R2 simulating turbo spool backpressure and progressive ABS brake bite.",
        run: async () => {
          const connected = await connectDualSenseHID();
          setNotice(
            connected
              ? "DualSense mechanical adaptive triggers connected and calibrated."
              : "No DualSense device opened. Please plug in your controller via USB in a Chromium browser.",
          );
        },
      },
      {
        label: "INPUT DIAGNOSTICS",
        actionLabel: "OPEN ↗",
        icon: <Sliders size={15} />,
        help: "Open the live hardware diagnostics monitor to test button responsiveness, trigger axes, and vibration.",
        run: () => setDiagnostics(true),
      },
    ],
    [
      adaptiveTriggerActive,
      controllerConnected,
      controllerName,
      dpad,
      vibration,
    ],
  );

  const audioRows: MenuRowItem[] = useMemo(
    () => [
      {
        label: "Engine & tire audio",
        value:
          audioStatus === "locked"
            ? "UNLOCK"
            : audioMuted
              ? "MUTED"
              : "ENABLED",
        isCycler: true,
        icon: audioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />,
        help:
          audioStatus === "locked"
            ? "Browser audio policy requires user interaction. Click to start the audio synthesizer."
            : "Procedural SR20DET engine sound, turbo spool whistle, blow-off valve, and tire screech audio.",
        run: () => {
          if (audioStatus === "ready") {
            useAudioStore.getState().toggleMuted();
          } else {
            useAudioStore.setState({ muted: false });
            window.dispatchEvent(new Event("genting-enable-audio"));
          }
        },
      },
      {
        label: "Master volume",
        value: `${Math.round(audioVolume * 100)}%`,
        isCycler: true,
        icon: <Sliders size={15} />,
        help: "Adjust the master output volume for engine combustion, mechanical transmission whine, and tire slip.",
        run: () => adjustVolume(0.1),
        prev: () => adjustVolume(-0.05),
        next: () => adjustVolume(0.05),
      },
    ],
    [adjustVolume, audioMuted, audioStatus, audioVolume],
  );

  const driveRows = useMemo(() => [raceRows[0], raceRows[1], raceRows[4], raceRows[5], raceRows[2], raceRows[3]], [raceRows]);
  const confirmationRows: MenuRowItem[] = useMemo(() => [
    { label: "Keep current run", icon: <X size={18} />, help: "Cancel and keep your current run and score.", run: () => { setConfirming(false); setActive(0); } },
    { label: "Restart from the beginning", icon: <RefreshCw size={18} />, help: "Clear this run’s score and return to the start.", run: () => useGameStore.getState().reset() },
  ], []);
  const currentRows = confirming ? confirmationRows : tab === "Race" ? driveRows : tab === "Controls" ? controlsRows : audioRows;

  const navigateRow = useCallback((direction: number) => {
    const next = (active + direction + currentRows.length) % currentRows.length;
    setActive(next);
    containerRef.current?.querySelector<HTMLElement>(`[data-pause-row="${next}"]`)?.focus({ preventScroll: true });
  }, [active, currentRows.length]);

  useEffect(() => {
    if (!diagnostics) containerRef.current?.querySelector<HTMLElement>(`[data-pause-row="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, tab, confirming, diagnostics]);

  useEffect(() => {
    if (!diagnostics) return;
    const container = containerRef.current;
    container?.querySelector<HTMLElement>('[role="dialog"] button')?.focus();
    return () => { container?.focus(); };
  }, [diagnostics]);

  useEffect(() => {
    containerRef.current?.querySelector<HTMLElement>('[data-pause-row="0"]')?.focus({ preventScroll: true });
  }, [confirming, tab]);

  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab);
    setActive(0);
    setNotice("");
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Do not let pause shortcuts reach the game's global driving listeners.
      e.stopPropagation();
      if (e.key === "Tab") {
        const root = diagnostics ? containerRef.current?.querySelector<HTMLElement>('[role="dialog"]') : containerRef.current;
        const elements = Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select') ?? []);
        const first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === containerRef.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        return;
      }
      if ((e.key === "Enter" || e.key === " ") && (e.target as HTMLElement).closest("button, a")) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (diagnostics) setDiagnostics(false);
        else back();
        return;
      }
      if (diagnostics) return;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        navigateRow(-1);
        return;
      }

      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        navigateRow(1);
        return;
      }

      if (!confirming && (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")) {
        e.preventDefault();
        const row = currentRows[active];
        if (row?.prev) {
          row.prev();
        } else if (tab !== "Race") {
          const tabIndex = tabs.indexOf(tab);
          handleTabChange(tabs[(tabIndex - 1 + tabs.length) % tabs.length]);
        }
        return;
      }

      if (!confirming && (e.key === "ArrowRight" || e.key === "d" || e.key === "D")) {
        e.preventDefault();
        const row = currentRows[active];
        if (row?.next) {
          row.next();
        } else if (row?.isCycler) {
          row.run();
        } else if (tab !== "Audio") {
          const tabIndex = tabs.indexOf(tab);
          handleTabChange(tabs[(tabIndex + 1) % tabs.length]);
        }
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        currentRows[active]?.run();
        return;
      }

      if (!confirming && (e.key === "q" || e.key === "Q" || e.key === "PageUp")) {
        e.preventDefault();
        const tabIndex = tabs.indexOf(tab);
        handleTabChange(tabs[(tabIndex - 1 + tabs.length) % tabs.length]);
        return;
      }

      if (!confirming && (e.key === "e" || e.key === "E" || e.key === "PageDown")) {
        e.preventDefault();
        const tabIndex = tabs.indexOf(tab);
        handleTabChange(tabs[(tabIndex + 1) % tabs.length]);
        return;
      }

      if (!confirming && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        useGameStore.getState().resetInPlace();
      }
    },
    [active, currentRows, diagnostics, handleTabChange, tab, confirming, back, navigateRow],
  );

  // Gamepad polling loop
  const padHistory = useRef({ lastDirTime: 0, wasSelect: true, wasBack: true, wasLeftBumper: true, wasRightBumper: true, wasLeftDir: false, wasRightDir: false });
  useEffect(() => {
    let frame = 0;
    let { lastDirTime, wasSelect, wasBack, wasLeftBumper, wasRightBumper, wasLeftDir, wasRightDir } = padHistory.current;

    const poll = (time: number) => {
      const gp = getActiveGamepad();
      if (gp && diagnostics) {
        const isBack = !!gp.buttons[1]?.pressed || !!gp.buttons[9]?.pressed;
        if (isBack && !wasBack) setDiagnostics(false);
        wasBack = isBack;
        wasSelect = !!gp.buttons[0]?.pressed;
      }
      if (gp && !diagnostics) {
        // Vertical navigation
        const up = !!gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
        const down = !!gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
        const vertDir = up ? -1 : down ? 1 : 0;

        if (vertDir !== 0 && time - lastDirTime > 180) {
          navigateRow(vertDir);
          lastDirTime = time;
        }

        // Horizontal adjustment
        const left = !!gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
        const right = !!gp.buttons[15]?.pressed || gp.axes[0] > 0.5;

        if (left && !wasLeftDir) {
          const row = currentRows[active];
          if (row?.prev) row.prev();
        }
        if (right && !wasRightDir) {
          const row = currentRows[active];
          if (row?.next) row.next();
          else if (row?.isCycler) row.run();
        }
        wasLeftDir = left;
        wasRightDir = right;

        // Bumpers
        const lb = !!gp.buttons[4]?.pressed;
        const rb = !!gp.buttons[5]?.pressed;
        if (!confirming && lb && !wasLeftBumper) {
          setTab(
            (t) => tabs[(tabs.indexOf(t) - 1 + tabs.length) % tabs.length],
          );
          setActive(0);
          setNotice("");
        }
        if (!confirming && rb && !wasRightBumper) {
          setTab((t) => tabs[(tabs.indexOf(t) + 1) % tabs.length]);
          setActive(0);
          setNotice("");
        }
        wasLeftBumper = lb;
        wasRightBumper = rb;

        // Button A (0)
        const isSelect = !!gp.buttons[0]?.pressed;
        if (isSelect && !wasSelect) {
          currentRows[active]?.run();
        }
        wasSelect = isSelect;

        // Button B (1) / Start (9)
        const isBack = !!gp.buttons[1]?.pressed || !!gp.buttons[9]?.pressed;
        if (isBack && !wasBack) {
          back();
        }
        wasBack = isBack;
      }
      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => {
      padHistory.current = { lastDirTime, wasSelect, wasBack, wasLeftBumper, wasRightBumper, wasLeftDir, wasRightDir };
      cancelAnimationFrame(frame);
    };
  }, [active, currentRows, diagnostics, confirming, back, navigateRow]);

  return <PauseMenuView containerRef={containerRef} onKeyDown={handleKeyDown}
    tab={tab} setTab={handleTabChange} active={active} setActive={selectRow}
    rows={currentRows} notice={notice} score={score} multiplier={multiplier}
    assist={assist} controllerConnected={controllerConnected} controllerName={controllerName}
    resume={back} confirming={confirming}>
    {diagnostics && <ControllerDiagnosticsModal onClose={() => setDiagnostics(false)} />}
  </PauseMenuView>;
}
