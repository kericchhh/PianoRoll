import { expect, test } from 'vitest';
import {
    prepareInstrumentFolder,
    validateInstrumentMapping,
    validateInstrumentFiles,
    MAX_INSTRUMENT_BYTES,
    type InstrumentFile,
} from '@/features/piano-roll/audio/customInstrument';
import { PIANO_SAMPLE_URLS } from '@/features/piano-roll/audio/pianoSamples';

function file(path: string, size = 100, type = ''): File {
    return {
        name: path.split('/').at(-1)!,
        webkitRelativePath: path,
        size,
        type,
    } as File;
}
const entry = (pitch: number | null): InstrumentFile => ({
    id: String(pitch),
    file: file('Synth/lead.wav'),
    rootPitch: pitch,
});

test('reads folder identity, nested relative paths and default Ds/Fs names while ignoring metadata', () => {
    const result = prepareInstrumentFolder([
        file('Synth/C4.wav'),
        file('Synth/nested/Fs4.mp3'),
        file('Synth/nested/Ds4.mp3'),
        file('Synth/README.md'),
        file('Synth/.hidden/C5.wav'),
        file('Synth/__MACOSX/._C4.wav'),
    ]);
    expect(result.name).toBe('Synth');
    expect(
        result.files.map(({ id, rootPitch }) => ({ id, rootPitch })),
    ).toEqual([
        { id: 'Synth/C4.wav', rootPitch: 60 },
        { id: 'Synth/nested/Ds4.mp3', rootPitch: 63 },
        { id: 'Synth/nested/Fs4.mp3', rootPitch: 66 },
    ]);
});

test('the actual bundled piano filenames form a valid instrument including low and high roots', () => {
    const draft = prepareInstrumentFolder(
        Object.values(PIANO_SAMPLE_URLS).map((name) => file(`Piano/${name}`)),
    );
    expect(draft.files).toHaveLength(30);
    expect(() => validateInstrumentMapping(draft.files)).not.toThrow();
    const pitches = draft.files.map((entry) => entry.rootPitch!);
    for (let pitch = 0; pitch <= 127; pitch++)
        expect(
            Math.min(...pitches.map((root) => Math.abs(root - pitch))),
        ).toBeLessThan(96);
});

test('unknown names and identical basenames in distinct subfolders keep distinct mapping identities', () => {
    const draft = prepareInstrumentFolder([
        file('Synth/soft/lead.wav'),
        file('Synth/hard/lead.wav'),
    ]);
    expect(new Set(draft.files.map((entry) => entry.id)).size).toBe(2);
    expect(draft.files.every((entry) => entry.rootPitch === null)).toBe(true);
    expect(() => validateInstrumentMapping(draft.files)).toThrow(/Assign/);
});

test('rejects unknown pitches, enharmonic duplicates and banks that cannot cover all editor keys', () => {
    for (const pitch of [null, NaN, -1, 128, 60.5])
        expect(() => validateInstrumentMapping([entry(pitch)])).toThrow(
            /Assign/,
        );
    const duplicated = prepareInstrumentFolder([
        file('Synth/Ds4.wav'),
        file('Synth/Eb4.wav'),
    ]);
    expect(() => validateInstrumentMapping(duplicated.files)).toThrow(
        /More than one/,
    );
    for (const pitch of [0, 31, 96, 127])
        expect(() => validateInstrumentMapping([entry(pitch)])).toThrow(
            /cover every/,
        );
    expect(() =>
        validateInstrumentMapping([entry(0), entry(127)]),
    ).not.toThrow();
});

test('rejects missing audio, oversized files, excessive counts and aggregate file bytes before decoding', () => {
    expect(() => prepareInstrumentFolder([file('Synth/README.md')])).toThrow(
        /containing audio/,
    );
    expect(() => prepareInstrumentFolder([file('Synth/C4.wav', 0)])).toThrow(
        /20 MB/,
    );
    expect(() =>
        validateInstrumentFiles(Array.from({ length: 129 }, () => entry(60))),
    ).toThrow(/128/);
    const large = Array.from({ length: 11 }, (_, pitch) => ({
        ...entry(pitch),
        file: file('Synth/C4.wav', MAX_INSTRUMENT_BYTES / 10),
    }));
    expect(() => validateInstrumentFiles(large)).toThrow(/200 MB/);
});
