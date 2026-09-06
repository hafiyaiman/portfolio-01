// Audio/telemetry drivetrain, independent of the arcade tire-force model.
const RATIOS = [3.5, 2.25, 1.62, 1.25, 1];
const UPSHIFT_SPEEDS = [12, 22, 33, 45];
const limit = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function selectGear(speed: number, current: number) {
  const gear = limit(current, 1, 5);
  if (gear < 5 && speed > UPSHIFT_SPEEDS[gear - 1]) return gear + 1;
  // Separate thresholds prevent repeated shift sounds at one speed boundary.
  if (gear > 1 && speed < UPSHIFT_SPEEDS[gear - 2] - 3) return gear - 1;
  return gear;
}

export function engineRpm(speed: number, gear: number, throttle: number, grounded: number) {
  const wheelRpm = Math.abs(speed) / (2 * Math.PI * 0.32) * 60;
  const coupled = wheelRpm * (gear === -1 ? 3.2 : RATIOS[limit(gear, 1, 5) - 1]) * 4.1;
  const freeRev = grounded === 0 ? throttle * 5000 : throttle * Math.max(0, 1 - Math.abs(speed) / 8) * 1600;
  return limit(Math.max(950, coupled) + freeRev, 950, 7600);
}
