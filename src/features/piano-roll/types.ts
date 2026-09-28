export interface Note {
    id: string;
    pitch: number;
    startTick: number;
    durationTicks: number;
    velocity: number;
    selected: boolean
};

export interface NoteStoreState {
    notes: Record<string, Note>;
    addNote: (note: Note) => void
};

export interface PianoRollView {
    pixelsPerTick: number;
    scrollOffsetX: number;
    highestVisiblePitch: number;
    rowHeight: number
}
