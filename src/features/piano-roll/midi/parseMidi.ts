import { Midi } from '@tonejs/midi';
import { PPQ } from '@/features/piano-roll/constants';
import type { Note } from '@/features/piano-roll/types';
import { validateMidi } from './validateMidi';
import { isValidMidiNote } from './isValidMidiNote';

export type ImportedNote = Omit<Note, 'id' | 'selected'>;
export type MidiImport = { notes: ImportedNote[]; endTick: number };

export function parseMidi(bytes: Uint8Array): MidiImport {
    validateMidi(bytes);
    const midi = new Midi(bytes);
    const scale = PPQ / midi.header.ppq;
    const notes: ImportedNote[] = [];
    let endTick = 0;
    for (const track of midi.tracks) {
        for (const note of track.notes) {
            const startTick = Math.round(note.ticks * scale);
            const endpoint = Math.round(
                (note.ticks + note.durationTicks) * scale,
            );
            const durationTicks = Math.max(1, endpoint - startTick);
            const velocity = Math.round(note.velocity * 127);
            const imported = {
                pitch: note.midi,
                startTick,
                durationTicks,
                velocity,
            };
            if (!isValidMidiNote(imported))
                throw new Error('The MIDI file contains invalid note data.');
            notes.push(imported);
            endTick = Math.max(endTick, startTick + durationTicks);
        }
    }
    notes.sort((a, b) => a.startTick - b.startTick || b.pitch - a.pitch);
    return { notes, endTick };
}
