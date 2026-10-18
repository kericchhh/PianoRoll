import { expect, test } from 'vitest';
import { peakDb, segmentsForDb } from '@/features/piano-roll/audio/outputLevel';

test('peak level clamps silence and full scale to the meter range', () => {
    expect(peakDb(null)).toBe(-48);
    expect(peakDb(new Float32Array([0, 0]))).toBe(-48);
    expect(peakDb(new Float32Array([0.5, -0.25]))).toBeCloseTo(-6.02, 2);
    expect(peakDb(new Float32Array([1.2]))).toBe(0);
});

test('twelve meter segments cover minus 48 through zero dBFS', () => {
    expect(segmentsForDb(-48)).toBe(0);
    expect(segmentsForDb(-36)).toBe(3);
    expect(segmentsForDb(-24)).toBe(6);
    expect(segmentsForDb(0)).toBe(12);
});
