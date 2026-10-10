import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useCustomInstrument } from '@/features/piano-roll/hooks/playback/useCustomInstrument';
import { toast } from 'sonner';
import type { CustomInstrument } from '@/features/piano-roll/audio/customInstrument';

const { decodeAudioData } = vi.hoisted(() => ({ decodeAudioData: vi.fn() }));
vi.mock('tone', () => ({ getContext: () => ({ decodeAudioData }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const buffer = {
    duration: 1,
    length: 44100,
    numberOfChannels: 2,
} as AudioBuffer;
const sample: CustomInstrument = {
    name: 'violin.wav',
    samples: [{ name: 'violin.wav', rootPitch: 60, buffer }],
};
const file = () =>
    ({
        name: 'violin.wav',
        size: 100,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
    }) as unknown as File;

beforeEach(() => {
    vi.clearAllMocks();
    decodeAudioData.mockResolvedValue(buffer);
});
afterEach(cleanup);

const folderFile = (name: string) =>
    ({
        ...file(),
        name,
        webkitRelativePath: `Synth/${name}`,
        type: 'audio/wav',
    }) as File;

test('folder selection detects pitches, lets unknown names be assigned and replaces the whole bank only after loading', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
        useCustomInstrument({ instrument: sample, onChange }),
    );
    act(() =>
        result.current.chooseFolder([
            folderFile('C4.wav'),
            folderFile('lead.wav'),
        ]),
    );
    expect(result.current.draft?.name).toBe('Synth');
    expect(result.current.draft?.files.map((entry) => entry.rootPitch)).toEqual(
        [60, null],
    );
    expect(decodeAudioData).not.toHaveBeenCalled();
    await act(() => result.current.loadFolder());
    expect(result.current.error).toMatch(/Assign/);
    expect(onChange).not.toHaveBeenCalled();
    act(() => result.current.setFilePitch('Synth/lead.wav', 72));
    await act(() => result.current.loadFolder());
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
        name: 'Synth',
        samples: [
            { name: 'C4.wav', rootPitch: 60, buffer },
            { name: 'lead.wav', rootPitch: 72, buffer },
        ],
    });
    expect(result.current.draft).toBeNull();
    expect(decodeAudioData).toHaveBeenCalledTimes(2);
    expect(sample.samples).toHaveLength(1);
});

test('duplicate roots can be removed before loading and no partial bank replaces the instrument after a failed decode', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
        useCustomInstrument({ instrument: sample, onChange }),
    );
    act(() =>
        result.current.chooseFolder([
            folderFile('Ds4.wav'),
            folderFile('Eb4.wav'),
            folderFile('C5.wav'),
        ]),
    );
    await act(() => result.current.loadFolder());
    expect(result.current.error).toMatch(/More than one/);
    expect(decodeAudioData).not.toHaveBeenCalled();
    act(() => result.current.removeFile('Synth/Eb4.wav'));
    decodeAudioData
        .mockResolvedValueOnce(buffer)
        .mockRejectedValueOnce(new Error('invalid audio'));
    await act(() => result.current.loadFolder());
    expect(result.current.error).toMatch(/Could not decode Ds4.wav/);
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.draft?.files).toHaveLength(2);
    await act(() => result.current.loadFolder());
    expect(onChange).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
});

test('canceling a folder during decode retains the active bank and ignores late completion', async () => {
    let finish!: (value: AudioBuffer) => void;
    decodeAudioData.mockReturnValueOnce(
        new Promise<AudioBuffer>((resolve) => {
            finish = resolve;
        }),
    );
    const onChange = vi.fn();
    const { result } = renderHook(() =>
        useCustomInstrument({ instrument: sample, onChange }),
    );
    act(() =>
        result.current.chooseFolder([
            folderFile('C4.wav'),
            folderFile('C5.wav'),
        ]),
    );
    let pending!: Promise<void>;
    await act(async () => {
        pending = result.current.loadFolder();
    });
    expect(result.current.isLoading).toBe(true);
    await act(() => result.current.importSample(file(), 60));
    expect(decodeAudioData).toHaveBeenCalledOnce();
    act(() => result.current.cancelFolder());
    expect(result.current.instrument).toBe(sample);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.draft).toBeNull();
    await act(async () => {
        finish(buffer);
        await pending;
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(decodeAudioData).toHaveBeenCalledOnce();
});

test('decodes once before changing the instrument and root reassignment reuses the buffer', async () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
        ({ current }) => useCustomInstrument({ instrument: current, onChange }),
        { initialProps: { current: null as CustomInstrument | null } },
    );
    const input = file();
    await act(() => result.current.importSample(input, 69));
    expect(input.arrayBuffer).toHaveBeenCalledOnce();
    expect(decodeAudioData).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
        name: 'violin.wav',
        samples: [{ name: 'violin.wav', rootPitch: 69, buffer }],
    });
    expect(result.current.isLoading).toBe(false);
    rerender({ current: sample });
    act(() => result.current.setRootPitch(71));
    expect(onChange).toHaveBeenLastCalledWith({
        ...sample,
        samples: [{ ...sample.samples[0], rootPitch: 71 }],
    });
    expect(decodeAudioData).toHaveBeenCalledOnce();
});

test('decode and duration failures leave the instrument unchanged with recoverable feedback', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
        useCustomInstrument({ instrument: sample, onChange }),
    );
    decodeAudioData.mockRejectedValueOnce(new Error('bad codec'));
    await act(() => result.current.importSample(file(), 60));
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/Could not decode/);
    expect(toast.error).toHaveBeenCalledOnce();
    decodeAudioData.mockResolvedValueOnce({ ...buffer, duration: 31 });
    await act(() => result.current.importSample(file(), 60));
    expect(result.current.error).toMatch(/30 seconds/);
    expect(onChange).not.toHaveBeenCalled();
    await act(() => result.current.importSample(file(), 60));
    expect(result.current.error).toBeNull();
    expect(onChange).toHaveBeenCalledOnce();
});

test('restore cancels a pending decode and the next import waits for it without being overwritten', async () => {
    let finish!: (value: AudioBuffer) => void;
    decodeAudioData.mockReturnValueOnce(
        new Promise<AudioBuffer>((resolve) => {
            finish = resolve;
        }),
    );
    const onChange = vi.fn();
    const { result } = renderHook(() =>
        useCustomInstrument({ instrument: sample, onChange }),
    );
    let pending!: Promise<void>;
    await act(async () => {
        pending = result.current.importSample(file(), 60);
    });
    expect(result.current.isLoading).toBe(true);
    act(() => result.current.resetSample());
    expect(onChange).toHaveBeenCalledExactlyOnceWith(null);
    const nextFile = file();
    let next!: Promise<void>;
    await act(async () => {
        next = result.current.importSample(nextFile, 70);
    });
    expect(nextFile.arrayBuffer).not.toHaveBeenCalled();
    expect(decodeAudioData).toHaveBeenCalledOnce();
    await act(async () => {
        finish(buffer);
        await Promise.all([pending, next]);
    });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith({
        name: 'violin.wav',
        samples: [{ name: 'violin.wav', rootPitch: 70, buffer }],
    });
});

test('unmount ignores late decodes and duplicate submissions are blocked', async () => {
    let finish!: (value: AudioBuffer) => void;
    decodeAudioData.mockReturnValue(
        new Promise<AudioBuffer>((resolve) => {
            finish = resolve;
        }),
    );
    const onChange = vi.fn();
    const { result, unmount } = renderHook(() =>
        useCustomInstrument({ instrument: sample, onChange }),
    );
    let pending!: Promise<void>;
    await act(async () => {
        pending = result.current.importSample(file(), 60);
    });
    await act(() => result.current.importSample(file(), 61));
    expect(decodeAudioData).toHaveBeenCalledOnce();
    unmount();
    await act(async () => {
        finish(buffer);
        await pending;
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
});
