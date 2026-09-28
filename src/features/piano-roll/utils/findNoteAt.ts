import type { Note } from "@/features/piano-roll/types";

export function findNoteAt(
    notes: Record<string, Note>,
    tick: number,
    pitch: number
): Note | undefined {
    return Object.values(notes).reverse().find((note) => 
        note.pitch === pitch &&
        tick >= note.startTick &&
        tick < note.startTick + note.durationTicks
    );
}
