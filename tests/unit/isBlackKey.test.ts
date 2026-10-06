import { expect, test } from 'vitest';
import { isBlackKey } from '@/features/piano-roll/utils/isBlackKey';

test('black-key classification repeats for each MIDI octave', () => {
    const blackClasses = [1, 3, 6, 8, 10];
    for (let pitch = 0; pitch <= 127; pitch++) {
        expect(isBlackKey(pitch), `pitch ${pitch}`).toBe(
            blackClasses.includes(pitch % 12),
        );
    }
});
