import { expect, test } from 'vitest';
import { validateMidiTrack } from '@/features/piano-roll/midi/validateMidiTrack';
import { parseMidi } from '@/features/piano-roll/midi/parseMidi';

test('validates channel data, running status, sysex and meta events before library decoding', () => {
    const bytes = new Uint8Array([
        0, 0x90, 60, 100, 120, 60, 0, 0, 0xc0, 0, 0, 0xd0, 20, 0, 0xf0, 2, 1,
        0xf7, 0, 0xff, 1, 2, 65, 66, 0, 0xff, 0x2f, 0,
    ]);
    expect(validateMidiTrack(bytes)).toBe(1);
});

test.each([
    [0, 0xff, 0x7f, 0x8f, 0xff, 0xff, 0xff, 0x78],
    [0x80, 0x80, 0x80, 0x80, 0],
    [0, 0xff, 1, 12, 65],
    [0, 0x90, 60],
    [0, 60, 100],
    [0, 0x90, 128, 100],
    [0, 0xff, 0x2f, 0, 0],
    [0, 0x90, 60, 100],
])(
    'rejects malformed event bytes %j without entering the upstream parser',
    (...data: number[]) => {
        expect(() => validateMidiTrack(new Uint8Array(data))).toThrow(/event/);
    },
);

test('a framed meta-length overflow that hangs midi-file is rejected synchronously', () => {
    const payload = [0, 255, 127, 143, 255, 255, 255, 120];
    const bytes = new Uint8Array([
        77,
        84,
        104,
        100,
        0,
        0,
        0,
        6,
        0,
        0,
        0,
        1,
        1,
        224,
        77,
        84,
        114,
        107,
        0,
        0,
        0,
        payload.length,
        ...payload,
    ]);
    expect(() => parseMidi(bytes)).toThrow(/event/);
});

test('zero tempo cannot cause the library to drop note tracks and clear a composition', () => {
    const payload = [
        0, 255, 81, 3, 0, 0, 0, 0, 144, 60, 127, 120, 128, 60, 0, 0, 255, 47, 0,
    ];
    const bytes = new Uint8Array([
        77,
        84,
        104,
        100,
        0,
        0,
        0,
        6,
        0,
        1,
        0,
        1,
        1,
        224,
        77,
        84,
        114,
        107,
        0,
        0,
        0,
        payload.length,
        ...payload,
    ]);
    expect(() => parseMidi(bytes)).toThrow(/event/);
});

test('known metadata payload lengths are checked before library conversion', () => {
    expect(() =>
        validateMidiTrack(new Uint8Array([0, 255, 81, 2, 1, 1, 0, 255, 47, 0])),
    ).toThrow(/event/);
    expect(
        validateMidiTrack(
            new Uint8Array([0, 255, 81, 3, 7, 161, 32, 0, 255, 47, 0]),
        ),
    ).toBe(0);
});
