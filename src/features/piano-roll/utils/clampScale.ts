export function clampScale(
  scale: number,
  endTick: number,
  viewportWidth: number,
): number {
  const minimumScale = viewportWidth / endTick;
  return Math.max(minimumScale, Math.min(2, scale));
}
