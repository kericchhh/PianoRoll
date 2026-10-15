import { useCallback, type RefObject } from 'react';
import type { GestureMode } from '@/features/piano-roll/types';
import { clampScale } from '@/features/piano-roll/utils/viewport/clampScale';
import { clampScroll } from '@/features/piano-roll/utils/viewport/clampScroll';
import { scrollAfterZoom } from '@/features/piano-roll/utils/viewport/scrollAfterZoom';

type Options = {
    scaleRef: RefObject<number>;
    scrollRef: RefObject<number>;
    width: number;
    endTick: number;
    gestureModeRef: RefObject<GestureMode>;
    requestRedraw: () => void;
    announce: (text: string) => void;
};

export function useViewportActions({
    scaleRef,
    scrollRef,
    width,
    endTick,
    gestureModeRef,
    requestRedraw,
    announce,
}: Options) {
    const zoom = useCallback(
        (factor: number) => {
            if (gestureModeRef.current !== 'idle' || width <= 0) return;
            const previous = scaleRef.current;
            const next = clampScale(previous * factor, endTick, width);
            if (next === previous) return;
            scrollRef.current = clampScroll(
                scrollAfterZoom(width / 2, scrollRef.current, previous, next),
                endTick,
                next,
                width,
            );
            scaleRef.current = next;
            requestRedraw();
            announce(
                `Timeline view: ${Math.round(width / next)} ticks visible`,
            );
        },
        [
            announce,
            endTick,
            gestureModeRef,
            requestRedraw,
            scaleRef,
            scrollRef,
            width,
        ],
    );
    const pan = useCallback(
        (direction: number) => {
            if (gestureModeRef.current !== 'idle' || width <= 0) return;
            const next = clampScroll(
                scrollRef.current + (direction * width) / 2,
                endTick,
                scaleRef.current,
                width,
            );
            if (next === scrollRef.current) return;
            scrollRef.current = next;
            requestRedraw();
            announce(
                `Timeline view starts at tick ${Math.round(next / scaleRef.current)}`,
            );
        },
        [
            announce,
            endTick,
            gestureModeRef,
            requestRedraw,
            scaleRef,
            scrollRef,
            width,
        ],
    );

    return {
        zoomIn: () => zoom(1.25),
        zoomOut: () => zoom(1 / 1.25),
        panLeft: () => pan(-1),
        panRight: () => pan(1),
    };
}
