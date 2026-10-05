import { expect, test } from 'vitest';
import { isNoteResizeHandle } from '@/features/piano-roll/utils/isNoteResizeHandle';

const note = { startTick: 120, durationTicks: 120 };

test('uses the final six CSS pixels inside the true note endpoint', () => {
    expect(isNoteResizeHandle(note, 228, 0.5)).toBe(true);
    expect(isNoteResizeHandle(note, 239, 0.5)).toBe(true);
    expect(isNoteResizeHandle(note, 227, 0.5)).toBe(false);
    expect(isNoteResizeHandle(note, 150, 0.5)).toBe(false);
});

test('the half-open endpoint belongs to an adjacent note rather than the preceding handle', () => {
    expect(isNoteResizeHandle(note, 240, 0.5)).toBe(false);
    expect(isNoteResizeHandle(note, 241, 0.5)).toBe(false);
});

test('CSS scaling preserves the same six-pixel pointer target', () => {
    expect(isNoteResizeHandle(note, 216, 0.5, 2)).toBe(true);
    expect(isNoteResizeHandle(note, 215, 0.5, 2)).toBe(false);
});

test('narrow notes reserve their first half for movement', () => {
    expect(isNoteResizeHandle(note, 180, 0.02)).toBe(true);
    expect(isNoteResizeHandle(note, 179, 0.02)).toBe(false);
    expect(isNoteResizeHandle(note, 121, 0.02)).toBe(false);
});
