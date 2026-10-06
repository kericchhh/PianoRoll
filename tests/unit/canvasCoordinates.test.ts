// @vitest-environment jsdom
import { expect, test } from 'vitest';
import {
    clientToCanvasPoint,
    getCanvasScale,
} from '@/features/piano-roll/utils/coordinates/canvasCoordinates';

test('converts bordered, offset, scaled canvas coordinates', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperties(canvas, {
        clientWidth: { value: 300 },
        clientHeight: { value: 120 },
        clientLeft: { value: 1 },
        clientTop: { value: 1 },
    });
    canvas.getBoundingClientRect = () => ({ left: 50, top: 20 }) as DOMRect;
    expect(getCanvasScale(canvas, 600, 240)).toEqual({ x: 2, y: 2 });
    expect(clientToCanvasPoint(canvas, 101, 41, 600, 240)).toEqual({
        x: 100,
        y: 40,
    });
});
test('rejects a zero-sized canvas', () => {
    const canvas = document.createElement('canvas');
    expect(clientToCanvasPoint(canvas, 0, 0, 600, 240)).toBeNull();
});
