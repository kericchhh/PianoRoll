import { expect, test } from 'vitest';
import { isValidBpm } from '@/features/piano-roll/utils/time/isValidBpm';

test.each([30, 93, 120, 177, 300])(
    'accepts integer BPM %i within the supported interval',
    (value) => {
        expect(isValidBpm(value)).toBe(true);
    },
);
test.each([
    29,
    301,
    0,
    -1,
    120.5,
    NaN,
    Infinity,
    -Infinity,
    '120',
    '',
    null,
    undefined,
])('rejects invalid BPM %j', (value) => {
    expect(isValidBpm(value)).toBe(false);
});
