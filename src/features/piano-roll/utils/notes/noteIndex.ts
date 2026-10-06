import type { Note, NoteRegion } from '@/features/piano-roll/types';

type PitchBucket = { notes: Note[]; maxEnd: number[] };
export type NoteIndex = {
    notes: Record<string, Note>;
    pitches: Map<number, PitchBucket>;
    order: Map<string, number>;
    selected: Note[];
};

export function createNoteIndex(notes: Record<string, Note>): NoteIndex {
    const pitches = new Map<number, PitchBucket>();
    const order = new Map<string, number>();
    const selected: Note[] = [];
    Object.values(notes).forEach((note, position) => {
        order.set(note.id, position);
        if (note.selected) selected.push(note);
        const bucket = pitches.get(note.pitch) ?? { notes: [], maxEnd: [] };
        bucket.notes.push(note);
        pitches.set(note.pitch, bucket);
    });
    for (const bucket of pitches.values()) {
        bucket.notes.sort((a, b) => a.startTick - b.startTick);
        let end = -Infinity;
        bucket.maxEnd = bucket.notes.map((note) => {
            end = Math.max(end, note.startTick + note.durationTicks);
            return end;
        });
    }
    return { notes, pitches, order, selected };
}

function firstGreater(values: readonly number[], value: number): number {
    let left = 0,
        right = values.length;
    while (left < right) {
        const middle = Math.floor((left + right) / 2);
        if (values[middle] <= value) left = middle + 1;
        else right = middle;
    }
    return left;
}

export function queryNoteIndex(index: NoteIndex, region: NoteRegion): Note[] {
    const result: Note[] = [];
    if (region.startTick >= region.endTick) return result;
    for (const [pitch, bucket] of index.pitches) {
        if (pitch < region.lowestPitch || pitch > region.highestPitch) continue;
        const first = firstGreater(bucket.maxEnd, region.startTick);
        for (let i = first; i < bucket.notes.length; i++) {
            const note = bucket.notes[i];
            if (note.startTick >= region.endTick) break;
            if (note.startTick + note.durationTicks > region.startTick)
                result.push(note);
        }
    }
    return result.sort(
        (a, b) => index.order.get(a.id)! - index.order.get(b.id)!,
    );
}
