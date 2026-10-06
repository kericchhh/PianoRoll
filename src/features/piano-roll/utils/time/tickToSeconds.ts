export function tickToSeconds(ticks: number, ppq: number, bpm: number): number {
    return (ticks / ppq) * (60 / bpm);
}
