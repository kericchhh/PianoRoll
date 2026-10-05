import { memo } from 'react';
import { ROW_HEIGHT } from '@/features/piano-roll/constants';

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

export const PianoKeys = memo(function PianoKeys({
    highestPitch,
    height,
}: {
    highestPitch: number;
    height: number;
}) {
    const rows = Math.min(Math.ceil(height / ROW_HEIGHT), highestPitch + 1);
    return (
        <div className="piano-keys h-full overflow-hidden" aria-hidden="true">
            {Array.from({ length: rows }, (_, row) => {
                const pitch = highestPitch - row;
                const black = BLACK_KEYS.has(pitch % 12);
                return (
                    <div
                        key={pitch}
                        className="piano-key"
                        style={{ height: ROW_HEIGHT }}
                    >
                        {black && <span className="piano-key-black" />}
                        {pitch % 12 === 0 && (
                            <span className="piano-key-label">
                                C{Math.floor(pitch / 12) - 1}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
});
