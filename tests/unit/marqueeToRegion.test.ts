import { expect, test } from 'vitest';
import { marqueeToRegion } from '@/features/piano-roll/utils/marqueeToRegion';
import type { PianoRollView } from '@/features/piano-roll/types';

const view: PianoRollView = {
    pixelsPerTick: 0.5,
    scrollOffsetX: 0,
    highestVisiblePitch: 72,
    rowHeight: 20,
};

test('converts a rectangle to tick and pitch bounds without snapping', () => {
    expect(
        marqueeToRegion({ startX: 33, endX: 170, startY: 10, endY: 55 }, view),
    ).toEqual({
        startTick: 66,
        endTick: 340,
        lowestPitch: 70,
        highestPitch: 72,
    });
});

test('normalizes a reverse drag and accounts for zoom and pan', () => {
    expect(
        marqueeToRegion(
            { startX: 100, endX: 25, startY: 65, endY: 5 },
            { ...view, pixelsPerTick: 0.25, scrollOffsetX: 50 },
        ),
    ).toEqual({
        startTick: 300,
        endTick: 600,
        lowestPitch: 69,
        highestPitch: 72,
    });
});

test('a rectangle ending exactly at a row boundary does not include the next row', () => {
    expect(
        marqueeToRegion({ startX: 0, endX: 60, startY: 0, endY: 20 }, view),
    ).toEqual({
        startTick: 0,
        endTick: 120,
        lowestPitch: 72,
        highestPitch: 72,
    });
    expect(
        marqueeToRegion({ startX: 0, endX: 60, startY: 20, endY: 40 }, view),
    ).toEqual({
        startTick: 0,
        endTick: 120,
        lowestPitch: 71,
        highestPitch: 71,
    });
});

test('a rectangle crossing a row boundary includes both rows', () => {
    expect(
        marqueeToRegion({ startX: 0, endX: 60, startY: 19, endY: 21 }, view),
    ).toMatchObject({ lowestPitch: 71, highestPitch: 72 });
});

test('zero-area rectangles do not produce a region', () => {
    expect(
        marqueeToRegion({ startX: 20, endX: 20, startY: 0, endY: 40 }, view),
    ).toBeNull();
    expect(
        marqueeToRegion({ startX: 0, endX: 60, startY: 20, endY: 20 }, view),
    ).toBeNull();
});

test('clamps pitch bounds to the MIDI range and rejects rows wholly outside it', () => {
    expect(
        marqueeToRegion(
            { startX: 0, endX: 60, startY: -20, endY: 40 },
            { ...view, highestVisiblePitch: 127 },
        ),
    ).toMatchObject({ lowestPitch: 126, highestPitch: 127 });
    expect(
        marqueeToRegion(
            { startX: 0, endX: 60, startY: 1440, endY: 1500 },
            view,
        ),
    ).toMatchObject({ lowestPitch: 0, highestPitch: 0 });
    expect(
        marqueeToRegion(
            { startX: 0, endX: 60, startY: 1460, endY: 1500 },
            view,
        ),
    ).toBeNull();
});
