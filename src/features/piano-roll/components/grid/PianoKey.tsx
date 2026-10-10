import { memo } from 'react';
import { motion } from 'motion/react';
import { ROW_HEIGHT } from '@/features/piano-roll/constants';
import { isBlackKey } from '@/features/piano-roll/utils/notes/isBlackKey';
import { pitchToNoteName } from '@/features/piano-roll/utils/notes/pitchToNoteName';
import { usePianoKeyPress } from '@/features/piano-roll/hooks/playback/usePianoKeyPress';

type Props = {
    pitch: number;
    tabIndex: number;
    reducedMotion: boolean;
    onFocus: () => void;
    onPreview?: (pitch: number) => void;
};

export const PianoKey = memo(function PianoKey({
    pitch,
    tabIndex,
    reducedMotion,
    onFocus,
    onPreview,
}: Props) {
    const { pressed, ...events } = usePianoKeyPress(pitch, onPreview);
    const black = isBlackKey(pitch);
    return (
        <button
            type="button"
            className="piano-key"
            style={{ height: ROW_HEIGHT }}
            data-piano-pitch={pitch}
            data-pressed={pressed}
            aria-label={`Preview ${pitchToNoteName(pitch)}, MIDI pitch ${pitch}`}
            disabled={!onPreview}
            tabIndex={tabIndex}
            onFocus={onFocus}
            {...events}
        >
            <motion.span
                className={black ? 'piano-key-black' : 'piano-key-face'}
                style={{
                    transformOrigin: 'left center',
                    transformPerspective: reducedMotion ? undefined : 180,
                }}
                initial={false}
                animate={{
                    rotateY: pressed && !reducedMotion ? 8 : 0,
                    y: pressed && !reducedMotion ? 1.5 : 0,
                    z: pressed && !reducedMotion ? -2 : 0,
                    boxShadow: pressed
                        ? 'inset 0 2px 3px rgba(0, 0, 0, 0.35)'
                        : 'inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
                }}
                transition={
                    reducedMotion
                        ? { duration: 0 }
                        : {
                              type: 'spring',
                              stiffness: pressed ? 1000 : 500,
                              damping: 35,
                              mass: 0.6,
                          }
                }
            >
                {pitch % 12 === 0 && (
                    <span className="piano-key-label">
                        {pitchToNoteName(pitch)}
                    </span>
                )}
            </motion.span>
        </button>
    );
});
