export const ROTATION_PER_PIXEL = 0.12;
export const DESKTOP_FOCUS_ANGLE = 90;
export const MOBILE_FOCUS_ANGLE = 0;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getDesktopWheelLayout(viewportWidth: number) {
  const orbitRadius = Math.round(clamp(viewportWidth * 0.3, 800, 960));
  const cardWidth = Math.round(clamp(viewportWidth * 0.28, 580, 900));
  const wheelSize = Math.round(
    clamp(orbitRadius * 2 + cardWidth + 120, 1200, 1800),
  );
  const visibleWidth = Math.round(
    clamp(orbitRadius + cardWidth * 0.6, 560, 960),
  );
  const offsetX = wheelSize - visibleWidth + 480;
  const contentInset = visibleWidth - 200;

  return {
    orbitRadius,
    cardWidth,
    wheelSize,
    visibleWidth,
    offsetX,
    contentInset,
  };
}

export function getMobileWheelLayout(viewportWidth: number) {
  const orbitRadius = Math.round(clamp(viewportWidth * 0.38, 180, 320));
  const cardWidth = Math.round(clamp(viewportWidth * 0.4, 140, 220));
  const wheelSize = Math.round(clamp(viewportWidth * 1.32, 560, 920));

  return {
    orbitRadius,
    cardWidth,
    wheelSize,
  };
}
