import {
    useEffect,
    useRef,
    useState,
    useCallback,
    type RefObject,
} from 'react';
import * as Tone from 'tone';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { tickToSeconds } from '@/features/piano-roll/utils/time/tickToSeconds';
import { PPQ } from '@/features/piano-roll/constants';
import type { Note } from '@/features/piano-roll/types';
import type { PlaybackState } from '@/features/piano-roll/audio/playbackTypes';
import { schedulePianoNotes } from '@/features/piano-roll/audio/schedulePianoNotes';
import {
    getNotesToRetrigger,
    getPlaybackEndTick,
} from '@/features/piano-roll/utils/notes/playbackNotes';

export function usePlayback(samplerRef: RefObject<Tone.Sampler | null>) {
    const [playbackState, setPlaybackState] =
        useState<PlaybackState>('stopped');
    const scheduledIdRef = useRef<number[]>([]);
    const playbackNotesRef = useRef<readonly Note[]>([]);
    const finishRef = useRef<{
        timeoutId: number | null;
        generation: number;
    }>({ timeoutId: null, generation: 0 });

    const getPlaybackTick = useCallback((): number => {
        const transport = Tone.getTransport();
        const transportTick = transport.getTicksAtTime(Tone.immediate());

        return transportTick * (PPQ / transport.PPQ);
    }, []);

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
                setPlaybackState('stopped');
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
                setPlaybackState('playing');
                return;
            }
        }

        if (transport.state === 'started') {
            transport.pause(time);
            sampler.releaseAll(time);
            setPlaybackState('paused');
            return;
        }
        for (const id of scheduledIdRef.current) transport.clear(id);
        scheduledIdRef.current.length = 0;
        const bpm = transport.bpm.value;
        const notes = Object.values(useNoteStore.getState().notes);
        playbackNotesRef.current = notes;
        if (notes.length === 0) {
            setPlaybackState('stopped');
            return;
        }
        scheduledIdRef.current.push(
            ...schedulePianoNotes({
                transport,
                sampler,
                samplerRef,
                notes,
                playbackNotesRef,
            }),
        );
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
                        setPlaybackState('stopped');
                    },
                    Math.max(0, endTime - context.immediate()),
                );
            },
            tickToSeconds(getPlaybackEndTick(notes), PPQ, bpm),
        );
        scheduledIdRef.current.push(endId);
        transport.start(undefined, 0);
        setPlaybackState('playing');
    }

    return {
        isPlaying: playbackState === 'playing',
        playbackState,
        togglePlayback,
        getPlaybackTick,
    };
}
