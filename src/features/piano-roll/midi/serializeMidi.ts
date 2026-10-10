import { Midi } from '@tonejs/midi';
import type { Note } from '@/features/piano-roll/types';
import { BEATS_PER_BAR, PPQ } from '@/features/piano-roll/constants';
import { groupMidiNotes } from './groupMidiNotes';

export type MidiExport = {
    bytes: Uint8Array;
    noteCount: number;
    omittedNoteCount: number;
};

function validateNote(note: Note): void {
    if (
        !Number.isInteger(note.pitch) ||
        note.pitch < 0 ||
        note.pitch > 127 ||
        !Number.isSafeInteger(note.startTick) ||
        note.startTick < 0 ||
        !Number.isSafeInteger(note.durationTicks) ||
        note.durationTicks <= 0 ||
        !Number.isSafeInteger(note.startTick + note.durationTicks) ||
        !Number.isInteger(note.velocity) ||
        note.velocity < 0 ||
        note.velocity > 127
    )
        throw new RangeError('Cannot export invalid note data.');
}

export function serializeMidi(notes: readonly Note[], bpm: number): MidiExport {
    if (!Number.isFinite(bpm) || bpm <= 0)
        throw new RangeError('Cannot export an invalid tempo.');
    for (const note of notes) validateNote(note);
    const audible = notes.filter((note) => note.velocity > 0);
    const groups = groupMidiNotes(audible);
    const midi = new Midi();
    midi.header.fromJSON({
        ...midi.header.toJSON(),
        name: 'Piano roll',
        ppq: PPQ,
        tempos: [{ ticks: 0, bpm }],
        timeSignatures: [{ ticks: 0, timeSignature: [BEATS_PER_BAR, 4] }],
    });
    // Keep even an empty export a valid piano MIDI file.
    if (groups.length === 0) groups.push([]);
    for (const [index, group] of groups.entries()) {
        const track = midi.addTrack();
        track.name = groups.length === 1 ? 'Piano' : `Piano ${index + 1}`;
        track.instrument.number = 0;
        for (const note of group) {
            track.addNote({
                midi: note.pitch,
                ticks: note.startTick,
                durationTicks: note.durationTicks,
                velocity: note.velocity / 127,
            });
        }
    }
    return {
        bytes: midi.toArray(),
        noteCount: audible.length,
        omittedNoteCount: notes.length - audible.length,
    };
}
