"use client";

import { useEffect, useRef } from "react";
import { useGameStore, type Telemetry } from "../stores/useGameStore";
import { drivingInput } from "./useDrivingInput";
import { useCameraStore } from "../camera/useCameraStore";

const STICK_DEADZONE = 0.08;
const TRIGGER_DEADZONE = 0.04;
const HAPTIC_INTERVAL_MS = 35; // ~28 Hz haptic update rate

// WebHID DualSense device interface for browsers supporting navigator.hid
type HIDDeviceLike = {
  opened: boolean;
  open: () => Promise<void>;
  sendReport: (reportId: number, data: BufferSource) => Promise<void>;
};

let dualSenseDevice: HIDDeviceLike | null = null;

/** Requests USB connection to Sony DualSense controller for native mechanical adaptive triggers. */
export async function connectDualSenseHID(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("hid" in navigator)) return false;
  try {
    const nav = navigator as unknown as {
      hid: { requestDevice: (opts: unknown) => Promise<HIDDeviceLike[]> };
    };
    const devices = await nav.hid.requestDevice({
      filters: [
        { vendorId: 0x054c, productId: 0x0ce6 }, // DualSense Wireless Controller (USB)
        { vendorId: 0x054c, productId: 0x0df2 }, // DualSense Edge Controller (USB)
      ],
    });
    if (devices.length > 0) {
      dualSenseDevice = devices[0];
      if (!dualSenseDevice.opened) {
        await dualSenseDevice.open();
      }
      useGameStore.setState({ adaptiveTriggerActive: true });
      return true;
    }
  } catch (err) {
    console.warn("DualSense WebHID connection error:", err);
  }
  return false;
}

/** Sends mechanical trigger resistance report to DualSense over USB HID. */
async function sendDualSenseReport(
  leftMode: number,
  leftParams: number[],
  rightMode: number,
  rightParams: number[],
) {
  if (!dualSenseDevice || !dualSenseDevice.opened) return;
  try {
    const report = new Uint8Array(63);
    report[0] = 0x02; // Report ID
    report[1] = 0xff; // Valid flags

    // Right trigger (Throttle): offsets 11 to 21
    report[11] = rightMode;
    for (let i = 0; i < rightParams.length && i < 10; i++) {
      report[12 + i] = rightParams[i];
    }

    // Left trigger (Brake): offsets 22 to 32
    report[22] = leftMode;
    for (let i = 0; i < leftParams.length && i < 10; i++) {
      report[23 + i] = leftParams[i];
    }

    await dualSenseDevice.sendReport(0x02, report);
  } catch {
    // Ignore transient HID write hiccups
  }
}

let userSelectedSlot: number | null = null;

export function setSelectedGamepadSlot(slot: number | null) {
  userSelectedSlot = slot;
}

export function getSelectedGamepadSlot(): number | null {
  return userSelectedSlot;
}

/**
 * Robustly finds the active controller.
 * Filters out virtual keyboard HID devices (e.g. OBINS AnnePro2) and prioritizes:
 * 1. User-selected slot (if clicked in Diagnostics)
 * 2. Active input auto-switch (whichever controller is currently being pressed or moved)
 * 3. Real standard gamepads (Xbox, PlayStation, etc.)
 */
export function getActiveGamepad(): Gamepad | null {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  try {
    const list = navigator.getGamepads();
    if (!list || list.length === 0) return null;

    // 1. Explicit user selection from Diagnostics modal:
    if (userSelectedSlot !== null && list[userSelectedSlot]) {
      const g = list[userSelectedSlot];
      if (g) return g;
    }

    // 2. Dynamic active input auto-detection:
    // If user is currently touching sticks or pressing buttons on a gamepad, lock to it!
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      if (!g) continue;
      // Skip virtual keyboard / mouse HID gamepads from stealing focus
      if (/annepro|keyboard|mouse/i.test(g.id)) continue;

      const hasButton =
        g.buttons && g.buttons.some((b) => b && (b.pressed || b.value > 0.08));
      const hasStick = g.axes && g.axes.some((a) => Math.abs(a) > 0.12);
      if (hasButton || hasStick) {
        userSelectedSlot = i;
        return g;
      }
    }

    // 3. Priority match: prefer Xbox, XInput, DualSense, PlayStation, Gamepad devices
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      if (!g) continue;
      if (
        /xbox|xinput|360|dualsense|playstation|gamepad/i.test(g.id) &&
        !/annepro|keyboard|mouse/i.test(g.id)
      ) {
        return g;
      }
    }

    // 4. Any non-keyboard device with standard mapping or >= 4 axes
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      if (g && !/annepro|keyboard|mouse/i.test(g.id)) {
        return g;
      }
    }

    // 5. Fallback
    return list[0] || null;
  } catch (err) {
    console.warn("Error querying gamepads:", err);
  }
  return null;
}

/**
 * Controller hook: listens to gamepad events, polls Gamepad API every frame,
 * merges analog stick/trigger inputs into `drivingInput`, and provides adaptive trigger + rumble feedback.
 */
export function useGamepad() {
  const lastHapticTime = useRef(0);
  const prevButtons = useRef<{
    pause: boolean;
    reset: boolean;
    camera: boolean;
  }>({
    pause: false,
    reset: false,
    camera: false,
  });

  useEffect(() => {
    let animId: number;

    const onConnect = (e: GamepadEvent) => {
      const gp = e.gamepad;
      if (!gp) return;
      const isDualSense = /dualsense|054c|ps5/i.test(gp.id);
      useGameStore.setState({
        controllerConnected: true,
        controllerName: gp.id.replace(/\s*\(.*?\)/g, "").trim() || "Controller",
        adaptiveTriggerActive: isDualSense || !!dualSenseDevice,
      });
    };

    const onDisconnect = () => {
      const gp = getActiveGamepad();
      if (!gp) {
        useGameStore.setState({
          controllerConnected: false,
          controllerName: "",
          adaptiveTriggerActive: false,
        });
        drivingInput.steerAxis = 0;
        drivingInput.throttleAxis = 0;
        drivingInput.brakeAxis = 0;
        drivingInput.controllerHandbrake = false;
      }
    };

    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);

    const poll = (time: number) => {
      const gp = getActiveGamepad();

      if (!gp) {
        if (useGameStore.getState().controllerConnected) {
          useGameStore.setState({
            controllerConnected: false,
            controllerName: "",
            adaptiveTriggerActive: false,
          });
        }
        drivingInput.steerAxis = 0;
        drivingInput.throttleAxis = 0;
        drivingInput.brakeAxis = 0;
        drivingInput.controllerHandbrake = false;
        animId = requestAnimationFrame(poll);
        return;
      }

      // Ensure store reflects connection and current controller name
      const currentName = useGameStore.getState().controllerName;
      const targetName =
        gp.id.replace(/\s*\(.*?\)/g, "").trim() || "Controller";
      if (
        !useGameStore.getState().controllerConnected ||
        currentName !== targetName
      ) {
        const isDualSense = /dualsense|054c|ps5/i.test(gp.id);
        useGameStore.setState({
          controllerConnected: true,
          controllerName: targetName,
          adaptiveTriggerActive: isDualSense || !!dualSenseDevice,
        });
      }

      // --- 1. Steering: Left Stick X (axes[0]) + D-Pad fallback ---
      const rawStick = gp.axes[0] ?? 0;
      if (Math.abs(rawStick) > STICK_DEADZONE) {
        const norm =
          (Math.abs(rawStick) - STICK_DEADZONE) / (1 - STICK_DEADZONE);
        // Stick left (-1) -> steer +1 (left); stick right (+1) -> steer -1 (right)
        drivingInput.steerAxis = -Math.sign(rawStick) * Math.min(1, norm);
      } else if (gp.buttons[14]?.pressed) {
        // D-pad Left
        drivingInput.steerAxis = 1;
      } else if (gp.buttons[15]?.pressed) {
        // D-pad Right
        drivingInput.steerAxis = -1;
      } else {
        drivingInput.steerAxis = 0;
      }

      // --- 2. Throttle: Right Trigger (buttons[7]) + D-pad Up fallback ---
      // Respect analog trigger values: do NOT force 100% just because button.pressed is true!
      const rtRaw =
        typeof gp.buttons[7]?.value === "number" && gp.buttons[7].value > 0
          ? gp.buttons[7].value
          : gp.buttons[7]?.pressed
            ? 1
            : 0;

      if (rtRaw > TRIGGER_DEADZONE) {
        const normT = (rtRaw - TRIGGER_DEADZONE) / (1 - TRIGGER_DEADZONE);
        // Adaptive progressive sports-car throttle curve:
        // Gentle initial travel (0-30%) for surgical drift feathering & low-speed modulation,
        // progressively opening up to full power as the trigger is pulled deep.
        const clampedT = Math.min(1, Math.max(0, normT));
        drivingInput.throttleAxis = Math.pow(clampedT, 1.45);
      } else if (gp.buttons[12]?.pressed) {
        // D-pad Up
        drivingInput.throttleAxis = 1;
      } else {
        drivingInput.throttleAxis = 0;
      }

      // --- 3. Brake: Left Trigger (buttons[6]) + D-pad Down fallback ---
      const ltRaw =
        typeof gp.buttons[6]?.value === "number" && gp.buttons[6].value > 0
          ? gp.buttons[6].value
          : gp.buttons[6]?.pressed
            ? 1
            : 0;

      if (ltRaw > TRIGGER_DEADZONE) {
        const normB = (ltRaw - TRIGGER_DEADZONE) / (1 - TRIGGER_DEADZONE);
        // Progressive hydraulic brake curve
        const clampedB = Math.min(1, Math.max(0, normB));
        drivingInput.brakeAxis = Math.pow(clampedB, 1.3);
      } else if (gp.buttons[13]?.pressed) {
        // D-pad Down
        drivingInput.brakeAxis = 1;
      } else {
        drivingInput.brakeAxis = 0;
      }

      // --- 4. Handbrake: A (0), B (1), X (2), or RB (5) ---
      const handbrakePressed =
        !!gp.buttons[0]?.pressed ||
        !!gp.buttons[1]?.pressed ||
        !!gp.buttons[2]?.pressed ||
        !!gp.buttons[5]?.pressed;
      drivingInput.controllerHandbrake = handbrakePressed;

      // --- 5. Buttons: Start (Pause), Back/Select (Reset), Y (Camera) ---
      const pausePressed = !!gp.buttons[9]?.pressed;
      if (pausePressed && !prevButtons.current.pause) {
        useGameStore.getState().setPaused(!useGameStore.getState().paused);
      }
      prevButtons.current.pause = pausePressed;

      const resetPressed = !!gp.buttons[8]?.pressed;
      if (resetPressed && !prevButtons.current.reset) {
        useGameStore.getState().reset();
      }
      prevButtons.current.reset = resetPressed;

      const cameraPressed = !!gp.buttons[3]?.pressed;
      if (cameraPressed && !prevButtons.current.camera) {
        useCameraStore.getState().toggleMode();
      }
      prevButtons.current.camera = cameraPressed;

      // --- 6. Adaptive Trigger & Haptic Feedback ---
      if (
        time - lastHapticTime.current > HAPTIC_INTERVAL_MS &&
        !useGameStore.getState().paused
      ) {
        lastHapticTime.current = time;
        const telemetry = useGameStore.getState();
        dispatchHaptics(gp, telemetry);
      }

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);

    return () => {
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
      cancelAnimationFrame(animId);
      drivingInput.steerAxis = 0;
      drivingInput.throttleAxis = 0;
      drivingInput.brakeAxis = 0;
    };
  }, []);
}

/**
 * Calculates adaptive trigger resistance intensities & rumble magnitudes based on car telemetry.
 */
function dispatchHaptics(gp: Gamepad, telemetry: Telemetry) {
  const { rpm, throttle, tireSlip, braking, drifting, angle, speed } =
    telemetry;

  // --- Right Trigger (Throttle / Turbo Boost Feedback) ---
  let rightTriggerIntensity = 0;

  if (throttle > 0.05) {
    if (rpm < 3200) {
      // Off-boost turbo lag resistance: firm trigger resistance representing closed turbine
      const lagFactor = 1 - (rpm - 950) / (3200 - 950);
      rightTriggerIntensity = 0.35 + 0.3 * Math.max(0, Math.min(1, lagFactor));
    } else if (rpm >= 3200 && rpm < 4200) {
      // Spool zone: trigger resistance softens as boost builds
      rightTriggerIntensity = 0.25 * (1 - (rpm - 3200) / 1000);
    } else {
      // Full boost plateau: responsive travel with boost pulsation
      rightTriggerIntensity = 0.15;
    }

    // Dynamic boost feedback: pulse right trigger with manifold pressure
    const boostBuzz = (telemetry.boost || 0) * 0.35;
    rightTriggerIntensity = Math.max(rightTriggerIntensity, boostBuzz);

    // Wheelspin / Oversteer Kickback: pulse right trigger when rear breaks loose
    if (tireSlip > 0.2 || drifting) {
      rightTriggerIntensity = Math.min(
        1,
        rightTriggerIntensity + 0.45 * Math.min(1, tireSlip * 2),
      );
    }
  }

  // --- Left Trigger (Brake / ABS Bite Feedback) ---
  let leftTriggerIntensity = 0;
  if (braking || drivingInput.brakeAxis > 0.05) {
    const brakePressure = Math.max(drivingInput.brakeAxis, braking ? 0.7 : 0);
    // Progressive hydraulic pedal firmness
    leftTriggerIntensity = 0.2 + 0.5 * brakePressure;

    // ABS / lockup pulse when braking at speed with significant tire slip
    if (speed > 8 && (tireSlip > 0.25 || brakePressure > 0.75)) {
      const absPulse = Math.sin(Date.now() * 0.04) > 0 ? 0.85 : 0.25;
      leftTriggerIntensity = Math.max(leftTriggerIntensity, absPulse);
    }
  }

  // --- Main Motors Rumble (Chassis lateral G & Redline Buzz) ---
  const driftIntensity = clamp(Math.abs(angle) / 50, 0, 1);
  const strongMagnitude = clamp(
    (drifting ? driftIntensity * 0.45 : 0) + (braking ? 0.35 : 0),
    0,
    1,
  );
  // High RPM buzz approaching 7,900 RPM cut
  const rpmRatio = clamp((rpm - 6000) / 1900, 0, 1);
  const weakMagnitude = clamp(
    rpmRatio * 0.4 + (tireSlip > 0.15 ? tireSlip * 0.35 : 0),
    0,
    1,
  );

  // --- WebHID DualSense Mechanical Adaptive Triggers (if connected over USB) ---
  if (dualSenseDevice && dualSenseDevice.opened) {
    if (rightTriggerIntensity > 0.3) {
      const force = Math.round(rightTriggerIntensity * 7);
      sendDualSenseReport(
        leftTriggerIntensity > 0.3 ? 1 : 0,
        [0x02, Math.round(leftTriggerIntensity * 7)],
        1,
        [0x01, force],
      );
    } else {
      sendDualSenseReport(
        leftTriggerIntensity > 0.3 ? 1 : 0,
        [0x02, Math.round(leftTriggerIntensity * 7)],
        0,
        [],
      );
    }
  }

  // --- Gamepad API Vibration Actuator (Trigger-Rumble / Dual-Rumble) ---
  const actuator = (
    gp as unknown as {
      vibrationActuator?: GamepadHapticActuator & { effects?: string[] };
    }
  ).vibrationActuator;
  if (!actuator || !actuator.playEffect) return;

  const effects = actuator.effects;
  if (Array.isArray(effects) && effects.includes("trigger-rumble")) {
    // Chromium trigger-rumble: independent trigger haptics!
    actuator.playEffect(
      "trigger-rumble" as unknown as GamepadHapticEffectType,
      {
        duration: 60,
        startDelay: 0,
        leftTrigger: leftTriggerIntensity,
        rightTrigger: rightTriggerIntensity,
        strongMagnitude,
        weakMagnitude,
      } as unknown as GamepadEffectParameters,
    );
  } else {
    // Standard dual-rumble (Xbox 360, Xbox One, PS4/PS5 standard rumble)
    actuator.playEffect("dual-rumble", {
      duration: 60,
      startDelay: 0,
      strongMagnitude: Math.max(strongMagnitude, leftTriggerIntensity * 0.7),
      weakMagnitude: Math.max(weakMagnitude, rightTriggerIntensity * 0.7),
    });
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}
