import { expect, test } from 'vitest';
import { getNoteEditMode } from '@/features/piano-roll/utils/notes/getNoteEditMode';
import type { PianoRollView } from '@/features/piano-roll/types';

const note = { startTick: 120, durationTicks: 120 };
const view: PianoRollView = {
    pixelsPerTick: 0.5,
    scrollOffsetX: 0,
    highestVisiblePitch: 72,
    rowHeight: 20,
};

test('the body moves and the final six CSS pixels resize', () => {
    expect(getNoteEditMode(note, 150, view, 600)).toBe('move');
    expect(getNoteEditMode(note, 227, view, 600)).toBe('move');
    expect(getNoteEditMode(note, 228, view, 600)).toBe('resize');
    expect(getNoteEditMode(note, 239, view, 600)).toBe('resize');
    expect(getNoteEditMode(note, 240, view, 600)).toBe('move');
});

test('the actual endpoint must be visible, including the right boundary', () => {
    expect(getNoteEditMode(note, 239, view, 119)).toBe('move');
    expect(getNoteEditMode(note, 239, view, 120)).toBe('resize');
    expect(
        getNoteEditMode(note, 239, { ...view, scrollOffsetX: 120 }, 600),
    ).toBe('move');
    expect(
        getNoteEditMode(note, 239, { ...view, scrollOffsetX: 121 }, 600),
    ).toBe('move');
    expect(
        getNoteEditMode(note, 239, { ...view, scrollOffsetX: 60 }, 600),
    ).toBe('resize');
});

test('CSS scaling preserves the six CSS pixel target', () => {
    expect(getNoteEditMode(note, 215, view, 600, 2)).toBe('move');
    expect(getNoteEditMode(note, 216, view, 600, 2)).toBe('resize');
    expect(getNoteEditMode(note, 233, view, 600, 0.5)).toBe('move');
    expect(getNoteEditMode(note, 234, view, 600, 0.5)).toBe('resize');
});

test('a narrow note reserves its first half for moving at minimum zoom', () => {
    const narrowView = { ...view, pixelsPerTick: 0.02 };
    expect(getNoteEditMode(note, 179, narrowView, 600)).toBe('move');
    expect(getNoteEditMode(note, 180, narrowView, 600)).toBe('resize');
    expect(getNoteEditMode(note, 239, narrowView, 600)).toBe('resize');
});

test('zoom changes tick distance while the CSS target remains fixed', () => {
    const zoom = { ...view, pixelsPerTick: 2 };
    expect(getNoteEditMode(note, 236, zoom, 600)).toBe('move');
    expect(getNoteEditMode(note, 237, zoom, 600)).toBe('resize');
});

test('invalid scales never advertise resizing', () => {
    expect(getNoteEditMode(note, 239, { ...view, pixelsPerTick: 0 }, 600)).toBe(
        'move',
    );
    expect(getNoteEditMode(note, 239, view, 600, 0)).toBe('move');
});
