const FLOOR_DB = -48;

export function peakDb(samples: Float32Array | null): number {
    if (!samples) return FLOOR_DB;
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    if (peak === 0) return FLOOR_DB;
    return Math.max(FLOOR_DB, Math.min(0, 20 * Math.log10(peak)));
}

export function segmentsForDb(db: number): number {
    return Math.max(0, Math.min(12, Math.ceil((db - FLOOR_DB) / 4)));
}
