export function snapTick(tick: number, stepTicks: number): number {
    return Math.round(tick / stepTicks) * stepTicks;
}
