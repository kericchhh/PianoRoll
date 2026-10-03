export interface Note {
  id: string;
  pitch: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  selected: boolean;
}

export interface NoteStoreState {
  notes: Record<string, Note>;
  addNote: (note: Note) => void;
  selectNote: (id: string) => void;
  selectNotes: (ids: readonly string[]) => void;
  toggleNoteSelection: (id: string) => void;
  moveNote: (id: string, startTick: number, pitch: number) => void;
  moveNotes: (
    positions: readonly Pick<Note, 'id' | 'startTick' | 'pitch'>[],
  ) => void;
  resizeNote: (id: string, durationTicks: number) => void;
  resizeNotes: (
    durations: readonly Pick<Note, 'id' | 'durationTicks'>[],
  ) => void;
  deleteNote: (id: string) => void;
  deleteNotes: (ids: readonly string[]) => void;
}

export interface PianoRollView {
  pixelsPerTick: number;
  scrollOffsetX: number;
  highestVisiblePitch: number;
  rowHeight: number;
}

export interface MarqueeRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface NoteRegion {
  startTick: number;
  endTick: number;
  lowestPitch: number;
  highestPitch: number;
}

export type GestureMode =
  'idle' | 'move' | 'resize' | 'marquee' | 'pan' | 'select';
