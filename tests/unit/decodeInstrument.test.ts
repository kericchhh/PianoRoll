import { expect, test, vi } from 'vitest';
import { decodeInstrument } from '@/features/piano-roll/audio/decodeInstrument';
import type { InstrumentDraft } from '@/features/piano-roll/audio/customInstrument';

const buffer = {
    duration: 1,
    length: 44100,
    numberOfChannels: 1,
} as AudioBuffer;
function draft(count = 2): InstrumentDraft {
    return {
        name: 'Synth',
        files: Array.from({ length: count }, (_, index) => ({
            id: `Synth/${index}.wav`,
            rootPitch: 60 + index,
            file: {
                name: `${index}.wav`,
                size: 100,
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
            } as unknown as File,
        })),
    };
}

test('decodes one file at a time, retains mapped pitches and returns a complete bank', async () => {
    let finish!: (buffer: AudioBuffer) => void;
    const decode = vi
        .fn()
        .mockReturnValueOnce(
            new Promise<AudioBuffer>((resolve) => {
                finish = resolve;
            }),
        )
        .mockResolvedValue(buffer);
    const incoming = draft();
    const onProgress = vi.fn();
    const pending = decodeInstrument(incoming, {
        decode,
        isCurrent: () => true,
        onProgress,
    });
    await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
    expect(incoming.files[1].file.arrayBuffer).not.toHaveBeenCalled();
    finish(buffer);
    expect(await pending).toEqual({
        name: 'Synth',
        samples: [
            { name: '0.wav', rootPitch: 60, buffer },
            { name: '1.wav', rootPitch: 61, buffer },
        ],
    });
    expect(decode).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls).toEqual([[1], [2]]);
});

test('cancellation ignores a late decode and does not read the next file', async () => {
    let finish!: (buffer: AudioBuffer) => void;
    const decode = vi.fn().mockReturnValue(
        new Promise<AudioBuffer>((resolve) => {
            finish = resolve;
        }),
    );
    const incoming = draft();
    let current = true;
    const onProgress = vi.fn();
    const pending = decodeInstrument(incoming, {
        decode,
        isCurrent: () => current,
        onProgress,
    });
    await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
    current = false;
    finish(buffer);
    expect(await pending).toBeNull();
    expect(incoming.files[1].file.arrayBuffer).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
});

test('a decode failure identifies the file and rejects the whole bank', async () => {
    const decode = vi
        .fn()
        .mockResolvedValueOnce(buffer)
        .mockRejectedValueOnce(new Error('bad codec'));
    await expect(
        decodeInstrument(draft(), {
            decode,
            isCurrent: () => true,
            onProgress: vi.fn(),
        }),
    ).rejects.toThrow(/Could not decode 1.wav/);
});

test('decoded memory is bounded across the bank independently of each sample budget', async () => {
    const decode = vi
        .fn()
        .mockResolvedValue({ ...buffer, length: 25 * 1024 * 1024 });
    await expect(
        decodeInstrument(draft(3), {
            decode,
            isCurrent: () => true,
            onProgress: vi.fn(),
        }),
    ).rejects.toThrow(/256 MB/);
    expect(decode).toHaveBeenCalledTimes(3);
});

test('mapping validation runs before any file reads or decoding', async () => {
    const incoming = draft();
    incoming.files[0].rootPitch = null;
    const decode = vi.fn();
    await expect(
        decodeInstrument(incoming, {
            decode,
            isCurrent: () => true,
            onProgress: vi.fn(),
        }),
    ).rejects.toThrow(/Assign/);
    expect(decode).not.toHaveBeenCalled();
    expect(incoming.files[0].file.arrayBuffer).not.toHaveBeenCalled();
});
