export const BAR_COUNTS = [4, 8, 16, 32] as const;
export const INITIAL_BAR_COUNT = 8;
export const PPQ = 480;
export const BEATS_PER_BAR = 4;
export const SNAP_OPTIONS = [
    { label: '1/4', ticks: 480 },
    { label: '1/8', ticks: 240 },
    { label: '1/16', ticks: 120 },
] as const;
export type SnapTicks = (typeof SNAP_OPTIONS)[number]['ticks'];
export const DEFAULT_SNAP_TICKS: SnapTicks = 120;
export const MIN_NOTE_DURATION_TICKS = 120;
export const DEFAULT_NOTE_VELOCITY = 100;
export const DEFAULT_BPM = 120;
export const MIN_BPM = 30;
export const MAX_BPM = 300;
export const GRID_STEPS = [PPQ / 4, PPQ / 2, PPQ, PPQ * BEATS_PER_BAR];
