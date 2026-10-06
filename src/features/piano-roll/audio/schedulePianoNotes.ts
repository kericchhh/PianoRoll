import * as Tone from 'tone';
import type { RefObject } from 'react';
import type { Note } from '@/features/piano-roll/types';
import { PPQ } from '@/features/piano-roll/constants';
import { getPlaybackReleases } from '@/features/piano-roll/utils/notes/playbackNotes';
import { tickToSeconds } from '@/features/piano-roll/utils/time/tickToSeconds';

type Options = {
    transport: ReturnType<typeof Tone.getTransport>;
    sampler: Tone.Sampler;
    samplerRef: RefObject<Tone.Sampler | null>;
    notes: readonly Note[];
    playbackNotesRef: RefObject<readonly Note[]>;
};

export function schedulePianoNotes({
    transport,
    sampler,
    samplerRef,
    notes,
    playbackNotesRef,
}: Options) {
    const ids: number[] = [];
    const bpm = transport.bpm.value;
    const isCurrent = () =>
        samplerRef.current === sampler && playbackNotesRef.current === notes;
    for (const release of getPlaybackReleases(notes)) {
        ids.push(
            transport.schedule(
                (time) => {
                    if (isCurrent())
                        sampler.triggerRelease(
                            Tone.Midi(release.pitch).toNote(),
                            time,
                        );
                },
                tickToSeconds(release.endTick, PPQ, bpm),
            ),
        );
    }
    for (const note of notes) {
        ids.push(
            transport.schedule(
                (time) => {
                    if (isCurrent())
                        sampler.triggerAttack(
                            Tone.Midi(note.pitch).toNote(),
                            time,
                            note.velocity / 127,
                        );
                },
                tickToSeconds(note.startTick, PPQ, bpm),
            ),
        );
    }
    return ids;
}
