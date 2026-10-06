import { useCallback, useRef, useState } from 'react';
import type { Note, PianoRollView } from '@/features/piano-roll/types';
import { clampScroll } from '@/features/piano-roll/utils/viewport/clampScroll';
import { clampScale } from '@/features/piano-roll/utils/viewport/clampScale';
import { revealNotes } from '@/features/piano-roll/utils/viewport/revealNotes';
import { useElementSize } from '@/shared/hooks/useElementSize';
import {
    INITIAL_HIGHEST_PITCH,
    ROW_HEIGHT,
    VIEWPORT_HEIGHT,
    VIEWPORT_WIDTH,
} from '@/features/piano-roll/constants';

export function usePianoRollViewport(endTick: number) {
    const editorRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(0.5);
    const scrollRef = useRef(0);
    const [highestPitch, setHighestPitch] = useState(INITIAL_HIGHEST_PITCH);
    const { width, height } = useElementSize(editorRef, {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
    });

    const getView = useCallback(
        (): PianoRollView => ({
            pixelsPerTick: scaleRef.current,
            scrollOffsetX: scrollRef.current,
            highestVisiblePitch: highestPitch,
            rowHeight: ROW_HEIGHT,
        }),
        [highestPitch],
    );

    const reveal = useCallback(
        (notes: readonly Note[]) => {
            const view = revealNotes(notes, getView(), width, height, endTick);
            scrollRef.current = view.scrollOffsetX;
            setHighestPitch(view.highestVisiblePitch);
        },
        [endTick, getView, height, width],
    );

    const clamp = useCallback(() => {
        scaleRef.current = clampScale(scaleRef.current, endTick, width);
        scrollRef.current = clampScroll(
            scrollRef.current,
            endTick,
            scaleRef.current,
            width,
        );
    }, [endTick, width]);

    return {
        editorRef,
        scaleRef,
        scrollRef,
        highestPitch,
        width,
        height,
        getView,
        reveal,
        clamp,
    };
}
