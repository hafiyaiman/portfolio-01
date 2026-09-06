export type DirectionState = { direction: 1 | -1; stoppedFor: number };

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Automatic forward/reverse selector: opposite pedal brakes before changing direction. Supports analog throttle/brake. */
export function resolveDrive(
  state: DirectionState,
  forward: boolean | number,
  reverse: boolean | number,
  signedSpeed: number,
  speed: number,
  dt: number,
) {
  const fVal =
    typeof forward === "number" ? clamp(forward, 0, 1) : forward ? 1 : 0;
  const rVal =
    typeof reverse === "number" ? clamp(reverse, 0, 1) : reverse ? 1 : 0;
  const isForward = fVal > 0.05;
  const isReverse = rVal > 0.05;
  const requested = isForward === isReverse ? 0 : isForward ? 1 : -1;
  let { direction, stoppedFor } = state;
  if (requested !== 0 && requested !== direction && speed < 0.65) {
    stoppedFor += dt;
    if (stoppedFor >= 0.3) {
      direction = requested;
      stoppedFor = 0;
    }
  } else stoppedFor = 0;

  const braking =
    (isForward && isReverse) ||
    (requested !== 0 &&
      (requested !== direction || signedSpeed * requested < -0.65));

  let brakeAmount = 0;
  if (isForward && isReverse) {
    brakeAmount = Math.max(fVal, rVal);
  } else if (
    requested !== 0 &&
    (requested !== direction || signedSpeed * requested < -0.65)
  ) {
    brakeAmount = requested === 1 ? fVal : rVal;
  }

  const throttle =
    requested === direction && !braking ? (requested === 1 ? fVal : rVal) : 0;

  return {
    direction,
    stoppedFor,
    braking,
    brakeAmount: braking ? brakeAmount || 1 : 0,
    throttle,
    force: throttle ? direction * throttle : 0,
  };
}
