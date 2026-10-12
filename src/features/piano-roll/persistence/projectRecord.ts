import {
    BAR_COUNTS,
    BEATS_PER_BAR,
    PPQ,
} from '@/features/piano-roll/constants';
import { isValidMidiNote } from '@/features/piano-roll/midi/isValidMidiNote';
import type { Note } from '@/features/piano-roll/types';

export type ProjectRecord = {
    id: 'local';
    version: 1;
    ppq: typeof PPQ;
    beatsPerBar: typeof BEATS_PER_BAR;
    barCount: number;
    savedAt: number;
    notes: Omit<Note, 'selected'>[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProjectRecord(value: unknown): ProjectRecord {
    if (
        !isRecord(value) ||
        value.id !== 'local' ||
        value.version !== 1 ||
        value.ppq !== PPQ ||
        value.beatsPerBar !== BEATS_PER_BAR ||
        typeof value.barCount !== 'number' ||
        !BAR_COUNTS.some((count) => count === value.barCount) ||
        typeof value.savedAt !== 'number' ||
        !Number.isFinite(value.savedAt) ||
        value.savedAt < 0 ||
        !Array.isArray(value.notes)
    ) {
        throw new Error(
            'The saved project is invalid or uses an unsupported version.',
        );
    }

    const ids = new Set<string>();
    const notes = Array.from(value.notes, (entry: unknown) => {
        if (
            !isRecord(entry) ||
            typeof entry.id !== 'string' ||
            entry.id.length === 0 ||
            ids.has(entry.id) ||
            typeof entry.pitch !== 'number' ||
            typeof entry.startTick !== 'number' ||
            typeof entry.durationTicks !== 'number' ||
            typeof entry.velocity !== 'number'
        ) {
            throw new Error(
                'The saved project contains invalid or duplicate notes.',
            );
        }
        const note = {
            id: entry.id,
            pitch: entry.pitch,
            startTick: entry.startTick,
            durationTicks: entry.durationTicks,
            velocity: entry.velocity,
        };
        if (!isValidMidiNote(note)) {
            throw new Error('The saved project contains invalid note data.');
        }
        ids.add(note.id);
        return note;
    });

    return {
        id: 'local',
        version: 1,
        ppq: PPQ,
        beatsPerBar: BEATS_PER_BAR,
        barCount: value.barCount,
        savedAt: value.savedAt,
        notes,
    };
}

export function createProjectRecord(
    notes: Record<string, Note>,
    barCount: number,
): ProjectRecord {
    return parseProjectRecord({
        id: 'local',
        version: 1,
        ppq: PPQ,
        beatsPerBar: BEATS_PER_BAR,
        barCount,
        savedAt: Date.now(),
        notes: Object.values(notes),
    });
}
