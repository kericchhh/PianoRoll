import { useEffect, useRef, useState, type RefObject } from 'react';
import * as Tone from 'tone';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { tickToSeconds } from '@/features/piano-roll/utils/tickToSeconds';
import { PPQ } from '@/features/piano-roll/constants';
import type { Note } from '@/features/piano-roll/types';
import {
    getNotesToRetrigger,
    getPlaybackEndTick,
    getPlaybackReleases,
} from '@/features/piano-roll/utils/playbackNotes';

export function usePlayback(samplerRef: RefObject<Tone.Sampler | null>) {
    const [isPlaying, setIsPlaying] = useState(false);
    const scheduledIdRef = useRef<number[]>([]);
    const playbackNotesRef = useRef<readonly Note[]>([]);
    const finishRef = useRef<{
        timeoutId: number | null;
        generation: number;
    }>({ timeoutId: null, generation: 0 });

    useEffect(() => {
        const transport = Tone.getTransport();
        const context = Tone.getContext();
        const scheduledIds = scheduledIdRef.current;
        const finish = finishRef.current;

        return () => {
            finish.generation++;
            if (finish.timeoutId !== null) {
                context.clearTimeout(finish.timeoutId);
                finish.timeoutId = null;
            }
            transport.stop();
            for (const id of scheduledIds) transport.clear(id);
            scheduledIds.length = 0;
        };
    }, []);

    function togglePlayback() {
        const sampler = samplerRef.current;
        if (!sampler?.loaded) return;
        const transport = Tone.getTransport();
        const context = Tone.getContext();
        const finish = finishRef.current;
        finish.generation++;
        if (finish.timeoutId !== null) {
            context.clearTimeout(finish.timeoutId);
            finish.timeoutId = null;
        }
        const time = Tone.now();

        if (transport.state !== 'stopped') {
            const positionTick =
                (transport.getTicksAtTime(time) / transport.PPQ) * PPQ;
            if (positionTick >= getPlaybackEndTick(playbackNotesRef.current)) {
                transport.stop(time);
                sampler.releaseAll(time);
                for (const id of scheduledIdRef.current) transport.clear(id);
                scheduledIdRef.current.length = 0;
                playbackNotesRef.current = [];
                setIsPlaying(false);
                return;
            }
            if (transport.state === 'paused') {
                for (const note of getNotesToRetrigger(
                    playbackNotesRef.current,
                    positionTick,
                )) {
                    sampler.triggerAttack(
                        Tone.Midi(note.pitch).toNote(),
                        time,
                        note.velocity / 127,
                    );
                }
                transport.start(time);
                setIsPlaying(true);
                return;
            }
        }

        if (transport.state === 'started') {
            transport.pause(time);
            sampler.releaseAll(time);
            setIsPlaying(false);
            return;
        }
        for (const id of scheduledIdRef.current) transport.clear(id);
        scheduledIdRef.current.length = 0;
        const bpm = transport.bpm.value;
        const notes = Object.values(useNoteStore.getState().notes);
        playbackNotesRef.current = notes;
        if (notes.length === 0) {
            setIsPlaying(false);
            return;
        }
        for (const release of getPlaybackReleases(notes)) {
            const id = transport.schedule(
                (time) => {
                    if (
                        samplerRef.current !== sampler ||
                        playbackNotesRef.current !== notes
                    )
                        return;
                    sampler.triggerRelease(
                        Tone.Midi(release.pitch).toNote(),
                        time,
                    );
                },
                tickToSeconds(release.endTick, PPQ, bpm),
            );
            scheduledIdRef.current.push(id);
        }
        for (const note of notes) {
            const velocity = note.velocity / 127;
            const pitch = Tone.Midi(note.pitch).toNote();
            const startTime = tickToSeconds(note.startTick, PPQ, bpm);
            const eventId = transport.schedule((time) => {
                if (
                    samplerRef.current !== sampler ||
                    playbackNotesRef.current !== notes
                )
                    return;
                sampler.triggerAttack(pitch, time, velocity);
            }, startTime);
            scheduledIdRef.current.push(eventId);
        }
        const endId = transport.schedule(
            (endTime) => {
                if (
                    samplerRef.current !== sampler ||
                    playbackNotesRef.current !== notes ||
                    transport.state !== 'started'
                ) {
                    return;
                }
                const generation = finish.generation;
                if (finish.timeoutId !== null) {
                    context.clearTimeout(finish.timeoutId);
                }
                finish.timeoutId = context.setTimeout(
                    () => {
                        if (
                            finish.generation !== generation ||
                            samplerRef.current !== sampler ||
                            playbackNotesRef.current !== notes
                        ) {
                            return;
                        }
                        finish.timeoutId = null;
                        finish.generation++;
                        transport.stop(endTime);
                        for (const id of scheduledIdRef.current)
                            transport.clear(id);
                        scheduledIdRef.current.length = 0;
                        playbackNotesRef.current = [];
                        setIsPlaying(false);
                    },
                    Math.max(0, endTime - context.immediate()),
                );
            },
            tickToSeconds(getPlaybackEndTick(notes), PPQ, bpm),
        );
        scheduledIdRef.current.push(endId);
        transport.start(undefined, 0);
        setIsPlaying(true);
    }

    return { isPlaying, togglePlayback };
}
