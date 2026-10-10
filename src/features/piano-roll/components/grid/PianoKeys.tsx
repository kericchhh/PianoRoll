import {
    memo,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type RefObject,
} from 'react';
import { ROW_HEIGHT } from '@/features/piano-roll/constants';
import { PianoKey } from '@/features/piano-roll/components/grid/PianoKey';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';
import { usePianoKeyScroll } from '@/features/piano-roll/hooks/editor/usePianoKeyScroll';
import type { GestureMode } from '@/features/piano-roll/types';
import { clampHighestPitch } from '@/features/piano-roll/utils/viewport/pitchScroll';

export const PianoKeys = memo(function PianoKeys({
    highestPitch,
    height,
    onPreview,
    onScrollPitch,
    gestureModeRef,
}: {
    highestPitch: number;
    height: number;
    onPreview?: (pitch: number) => void;
    onScrollPitch?: (rows: number) => void;
    gestureModeRef?: RefObject<GestureMode>;
}) {
    const keysRef = useRef<HTMLDivElement>(null);
    const pendingFocusRef = useRef<number | null>(null);
    const rows = Math.min(Math.ceil(height / ROW_HEIGHT), highestPitch + 1);
    const lowestPitch = highestPitch - rows + 1;
    const [focusedPitch, setFocusedPitch] = useState(highestPitch);
    const activePitch = Math.min(
        highestPitch,
        Math.max(lowestPitch, focusedPitch),
    );
    const reducedMotion = usePrefersReducedMotion();
    usePianoKeyScroll({
        target: keysRef,
        height,
        onScroll: onScrollPitch,
        gestureModeRef,
        beforeScroll: (delta) => {
            const focused = document.activeElement;
            pendingFocusRef.current =
                focused instanceof HTMLButtonElement &&
                keysRef.current?.contains(focused) &&
                clampHighestPitch(highestPitch + delta, height) !== highestPitch
                    ? Number(focused.dataset.pianoPitch)
                    : null;
        },
    });
    useEffect(() => {
        const pitch = pendingFocusRef.current;
        if (pitch === null) return;
        pendingFocusRef.current = null;
        const next = Math.min(highestPitch, Math.max(lowestPitch, pitch));
        keysRef.current
            ?.querySelector<HTMLButtonElement>(`[data-piano-pitch="${next}"]`)
            ?.focus({ preventScroll: true });
    }, [highestPitch, lowestPitch]);
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (
            !(event.target instanceof HTMLButtonElement) ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.shiftKey
        )
            return;
        const pitch = Number(event.target.dataset.pianoPitch);
        let next = pitch;
        if (event.key === 'ArrowUp') next++;
        else if (event.key === 'ArrowDown') next--;
        else if (event.key === 'Home') next = highestPitch;
        else if (event.key === 'End') next = lowestPitch;
        else return;
        event.preventDefault();
        if (
            onScrollPitch &&
            next >= 0 &&
            next <= 127 &&
            (next > highestPitch || next < lowestPitch)
        ) {
            if (gestureModeRef && gestureModeRef.current !== 'idle') return;
            pendingFocusRef.current = next;
            onScrollPitch(next > highestPitch ? 1 : -1);
            return;
        }
        next = Math.min(highestPitch, Math.max(lowestPitch, next));
        event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-piano-pitch="${next}"]`)
            ?.focus({ preventScroll: true });
    };
    return (
        <div
            ref={keysRef}
            className="piano-keys h-full overflow-hidden"
            role="group"
            aria-label="Piano keys"
            aria-description="Press Enter or Space to preview. Use Up and Down arrows to choose a key and scroll at the edges. Scroll over the keys to change the visible pitches."
            onKeyDown={onKeyDown}
        >
            {Array.from({ length: rows }, (_, row) => {
                const pitch = highestPitch - row;
                return (
                    <PianoKey
                        key={pitch}
                        pitch={pitch}
                        tabIndex={pitch === activePitch ? 0 : -1}
                        reducedMotion={reducedMotion}
                        onFocus={() => setFocusedPitch(pitch)}
                        onPreview={onPreview}
                    />
                );
            })}
        </div>
    );
});
