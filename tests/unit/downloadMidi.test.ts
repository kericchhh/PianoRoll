import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
    downloadMidi,
    MIDI_FILENAME,
} from '@/features/piano-roll/midi/downloadMidi';

const createObjectURL = vi.fn<(blob: Blob) => string>();
const revokeObjectURL = vi.fn();

beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL.mockReset().mockReturnValue('blob:midi');
    revokeObjectURL.mockReset();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('Blob', NodeBlob);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

test('downloads exactly the supplied bytes as audio/midi and releases its URL after handoff', async () => {
    const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
            expect(this.href).toBe('blob:midi');
            expect(this.download).toBe(MIDI_FILENAME);
            expect(this.hidden).toBe(true);
            expect(this.parentElement).toBe(document.body);
        });
    const bytes = new Uint8Array([9, 1, 2, 3, 9]).subarray(1, 4);
    downloadMidi(bytes);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('audio/midi');
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([
        1, 2, 3,
    ]);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:midi');
});

test('a failed download cleans up the anchor and URL and permits a later attempt', () => {
    const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementationOnce(() => {
            throw new Error('Download failed');
        })
        .mockImplementationOnce(() => undefined);
    expect(() => downloadMidi(new Uint8Array([1]))).toThrow('Download failed');
    expect(document.querySelector('a[download]')).toBeNull();
    downloadMidi(new Uint8Array([2]));
    vi.runAllTimers();
    expect(click).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
});
