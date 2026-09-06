type TireTelemetry = {
  speed: number;
  angle: number;
  tireSlip: number;
  grounded: number;
  braking: boolean;
};

function ramp(value: number, low: number, high: number) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

export function tireMix(state: TireTelemetry, active: boolean) {
  const speed = Math.abs(state.speed) / 3.6;
  const slip = Math.max(0, Math.min(1, state.tireSlip));
  const lateralSpeed = speed * Math.abs(Math.sin(state.angle * Math.PI / 180));
  const slide = ramp(lateralSpeed, 0.8, 3.5);
  const skid = state.braking ? ramp(slip, 0.25, 0.8) * 0.7 : 0;
  const intensity = active && state.grounded >= 2
    ? ramp(speed, 2.5, 12) * ramp(slip, 0.16, 0.85) * Math.max(slide, skid)
    : 0;
  return { intensity, slip, speed, playbackRate: 0.94 + slip * 0.12 + Math.min(speed, 40) * 0.002 };
}
