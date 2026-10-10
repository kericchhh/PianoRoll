import type { Note } from '@/features/piano-roll/types';
import { MAX_MIDI_TICK } from './importLimits';

export function isValidMidiNote(note: Omit<Note, 'id' | 'selected'>): boolean {
    return (
        Number.isInteger(note.pitch) &&
        note.pitch >= 0 &&
        note.pitch <= 127 &&
        Number.isSafeInteger(note.startTick) &&
        note.startTick >= 0 &&
        Number.isSafeInteger(note.durationTicks) &&
        note.durationTicks > 0 &&
        Number.isSafeInteger(note.startTick + note.durationTicks) &&
        note.startTick + note.durationTicks <= MAX_MIDI_TICK &&
        Number.isInteger(note.velocity) &&
        note.velocity >= 0 &&
        note.velocity <= 127
    );
}
