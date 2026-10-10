import { memo, useState, type KeyboardEvent } from 'react';
import { ROW_HEIGHT } from '@/features/piano-roll/constants';
import { PianoKey } from '@/features/piano-roll/components/grid/PianoKey';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';

export const PianoKeys = memo(function PianoKeys({
    highestPitch,
    height,
    onPreview,
}: {
    highestPitch: number;
    height: number;
    onPreview?: (pitch: number) => void;
}) {
    const rows = Math.min(Math.ceil(height / ROW_HEIGHT), highestPitch + 1);
    const lowestPitch = highestPitch - rows + 1;
    const [focusedPitch, setFocusedPitch] = useState(highestPitch);
    const activePitch = Math.min(
        highestPitch,
        Math.max(lowestPitch, focusedPitch),
    );
    const reducedMotion = usePrefersReducedMotion();
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
        next = Math.min(highestPitch, Math.max(lowestPitch, next));
        event.currentTarget
            .querySelector<HTMLButtonElement>(`[data-piano-pitch="${next}"]`)
            ?.focus({ preventScroll: true });
    };
    return (
        <div
            className="piano-keys h-full overflow-hidden"
            role="group"
            aria-label="Piano keys"
            aria-description="Press Enter or Space to preview. Use Up and Down arrows to choose a key."
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
