import { expect, test } from 'vitest';
import {
    FX_PRESETS,
    matchingFxPreset,
} from '@/features/piano-roll/audio/fxPresets';
import { parseFxSettings } from '@/features/piano-roll/audio/fxSettings';

test('every preset is valid, distinct, and recognized from its settings', () => {
    expect(FX_PRESETS.map((preset) => preset.id)).toEqual([
        'clean',
        'room',
        'echo',
        'wide',
    ]);
    for (const preset of FX_PRESETS) {
        const settings = parseFxSettings(preset.settings);
        expect(matchingFxPreset(settings)).toBe(preset.id);
    }
});

test('a manual edit becomes Custom and matching values restore the preset', () => {
    const room = parseFxSettings(FX_PRESETS[1].settings);
    expect(
        matchingFxPreset({
            ...room,
            reverb: { ...room.reverb, mix: room.reverb.mix + 1 },
        }),
    ).toBeNull();
    expect(matchingFxPreset(room)).toBe('room');
});
