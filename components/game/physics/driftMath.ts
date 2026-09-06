export const PHYSICS_DT = 1 / 120;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Signed tire slip in radians; the denominator stays stable near standstill. */
export function slipAngle(lateralVelocity: number, forwardVelocity: number) {
  return Math.atan2(lateralVelocity, Math.max(Math.abs(forwardVelocity), 1.5));
}

/** A compact Pacejka-style curve with hysteresis between static and sliding grip. */
export function tireForce(angle: number, load: number, sliding: boolean, handbrake: boolean) {
  const demand = Math.abs(11 * angle);
  const broken = handbrake || (sliding ? demand > 0.5 : demand > 1.05);
  const mu = handbrake ? 0.3 : broken ? 0.68 : 1.05;
  return { lateral: -mu * load * Math.sin(1.3 * Math.atan(11 * angle)), limit: mu * load, sliding: broken };
}

/** Points are integrated in seconds, independent of render rate. No reverse/spin farming. */
export function driftScore(angle: number, speed: number, duration: number, dt: number, grounded: number, forward: number) {
  const degrees = Math.abs(angle) * 180 / Math.PI;
  const active = grounded >= 3 && forward > 0 && speed > 8 && degrees >= 12 && degrees <= 70;
  const multiplier = active ? 1 + 3 * clamp((degrees - 12) / 48, 0, 1) + Math.min(duration / 4, 2) : 1;
  return { active, multiplier, points: active ? speed * multiplier * dt * 10 : 0 };
}
