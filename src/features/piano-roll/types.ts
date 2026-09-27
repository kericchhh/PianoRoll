export interface Note {
    id: string;
    pitch: number;
    startTick: number;
    durationTicks: number;
    velocity: number;
    selected: boolean
};

export interface PianoRollView {
    pixelsPerTick: number;
    scrollOffsetX: number;
    highestVisiblePitch: number;
    rowHeight: number
}
