import { expect, test } from 'vitest';
import type { Note, PianoRollView } from '@/features/piano-roll/types';
import { layoutVelocityBars } from '@/features/piano-roll/utils/velocity/layoutVelocityBars';
import {
    clampVelocityHeight,
    velocityPanelBounds,
} from '@/features/piano-roll/utils/velocity/velocityMath';

const view: PianoRollView = {
    pixelsPerTick: 0.5,
    scrollOffsetX: 0,
    highestVisiblePitch: 72,
    rowHeight: 20,
};
const note = (
    id: string,
    startTick = 120,
    pitch = 60,
    velocity = 80,
): Note => ({
    id,
    startTick,
    pitch,
    velocity,
    durationTicks: 240,
    selected: false,
});

test.each([
    [800, 80, 320],
    [400, 80, 200],
    [180, 80, 84],
    [120, 24, 24],
    [96, 0, 0],
    [0, 0, 0],
])(
    'lane height respects workspace %i and permits reduced bounds when necessary',
    (workspace, min, max) => {
        expect(velocityPanelBounds(workspace)).toEqual({ min, max });
        expect(clampVelocityHeight(-1000, workspace)).toBe(min);
        expect(clampVelocityHeight(1000, workspace)).toBe(max);
        expect(clampVelocityHeight((min + max) / 2, workspace)).toBe(
            (min + max) / 2,
        );
    },
);

test('bar layout uses the grid tick scale and pan, includes the left edge and excludes offscreen onsets', () => {
    const notes = [
        note('left', 120),
        note('start', 240),
        note('inside', 480),
        note('end', 1440),
        note('right', 1500),
    ];
    const bars = layoutVelocityBars(
        notes,
        { ...view, scrollOffsetX: 120 },
        600,
    );
    expect(bars.map(({ note: source, x }) => ({ id: source.id, x }))).toEqual([
        { id: 'start', x: 0 },
        { id: 'inside', x: 120 },
    ]);
    expect(bars[0].note).toBe(notes[1]);
});

test('same-onset notes get distinct ordered bars without changing the incoming note order', () => {
    const notes = [
        note('higher', 120, 72),
        note('b', 120, 60),
        note('next', 480),
        note('a', 120, 60),
    ];
    const before = [...notes];
    const bars = layoutVelocityBars(notes, view, 600);
    expect(
        bars.map((bar) => ({ id: bar.note.id, x: bar.x, width: bar.width })),
    ).toEqual([
        { id: 'a', x: 60, width: 12 },
        { id: 'b', x: 76, width: 12 },
        { id: 'higher', x: 92, width: 12 },
        { id: 'next', x: 240, width: 12 },
    ]);
    expect(notes).toEqual(before);
});

test('dense onset groups share the available space without overlapping later onset bars or crossing the canvas edge', () => {
    const chord = Array.from({ length: 4 }, (_, index) =>
        note(`chord-${index}`, 0, 60 + index),
    );
    const bars = layoutVelocityBars([...chord, note('next', 4)], view, 4);
    for (let index = 0; index < 4; index++) {
        expect(bars[index].width).toBe(0.5);
        expect(bars[index].x).toBe(index * 0.5);
        expect(bars[index].x + bars[index].width).toBeLessThanOrEqual(2);
    }
    expect(bars[4].x).toBe(2);
    expect(bars[4].x + bars[4].width).toBeLessThanOrEqual(4);
    expect(layoutVelocityBars([], view, 600)).toEqual([]);
});
