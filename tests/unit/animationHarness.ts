import { vi } from 'vitest';

export function animationHarness() {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    let now = 0;
    vi.stubGlobal(
        'requestAnimationFrame',
        vi.fn((callback: FrameRequestCallback) => {
            frames.set(++nextId, callback);
            return nextId;
        }),
    );
    vi.stubGlobal(
        'cancelAnimationFrame',
        vi.fn((id: number) => frames.delete(id)),
    );
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const context = {
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        setTransform: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        context as unknown as CanvasRenderingContext2D,
    );
    const canvas = document.createElement('canvas');
    return {
        canvasRef: { current: canvas },
        canvas,
        context,
        frames,
        advance(ms = 16) {
            now += ms;
            const pending = [...frames.entries()];
            for (const [id, callback] of pending) {
                if (!frames.delete(id)) continue;
                callback(now);
            }
        },
    };
}
