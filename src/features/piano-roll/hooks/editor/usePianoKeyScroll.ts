import { useEffect, useRef, type RefObject } from 'react';
import { useWheel } from '@use-gesture/react';
import type { GestureMode } from '@/features/piano-roll/types';
import { pitchScrollDelta } from '@/features/piano-roll/utils/viewport/pitchScroll';

type Options = {
    target: RefObject<HTMLDivElement | null>;
    height: number;
    onScroll?: (rows: number) => void;
    beforeScroll: (rows: number) => void;
    gestureModeRef?: RefObject<GestureMode>;
};

export function usePianoKeyScroll({
    target,
    height,
    onScroll,
    beforeScroll,
    gestureModeRef,
}: Options) {
    const remainderRef = useRef(0);
    const rowsRef = useRef(0);
    const frameRef = useRef<number | null>(null);
    useWheel(
        ({ event, last }) => {
            if (
                !onScroll ||
                last ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.shiftKey ||
                !event.deltaY
            )
                return;
            event.preventDefault();
            if (gestureModeRef && gestureModeRef.current !== 'idle') return;
            const result = pitchScrollDelta(
                event.deltaY,
                event.deltaMode,
                height,
                remainderRef.current,
            );
            remainderRef.current = result.remainder;
            rowsRef.current += result.rows;
            if (rowsRef.current === 0 || frameRef.current !== null) return;
            frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null;
                const rows = rowsRef.current;
                rowsRef.current = 0;
                if (
                    !rows ||
                    (gestureModeRef && gestureModeRef.current !== 'idle')
                )
                    return;
                beforeScroll(rows);
                onScroll(rows);
            });
        },
        { target, eventOptions: { passive: false } },
    );
    useEffect(
        () => () => {
            if (frameRef.current !== null)
                cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            rowsRef.current = 0;
            remainderRef.current = 0;
        },
        [],
    );
}
