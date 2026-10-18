import {
    DEFAULT_FX_SETTINGS,
    type FxSettings,
} from '@/features/piano-roll/audio/fxSettings';

const clean = DEFAULT_FX_SETTINGS;

export const FX_PRESETS = [
    { id: 'clean', label: 'Clean', settings: clean },
    {
        id: 'room',
        label: 'Room',
        settings: {
            ...clean,
            reverb: { enabled: true, room: 2.4, mix: 26 },
        },
    },
    {
        id: 'echo',
        label: 'Echo',
        settings: {
            ...clean,
            delay: { enabled: true, time: 320, mix: 28 },
        },
    },
    {
        id: 'wide',
        label: 'Wide',
        settings: {
            ...clean,
            reverb: { enabled: true, room: 1.4, mix: 14 },
            chorus: { enabled: true, depth: 60, mix: 32 },
        },
    },
] as const satisfies ReadonlyArray<{
    id: string;
    label: string;
    settings: FxSettings;
}>;

export type FxPresetId = (typeof FX_PRESETS)[number]['id'];

function sameSettings(a: FxSettings, b: FxSettings): boolean {
    return (
        a.reverb.enabled === b.reverb.enabled &&
        a.reverb.room === b.reverb.room &&
        a.reverb.mix === b.reverb.mix &&
        a.delay.enabled === b.delay.enabled &&
        a.delay.time === b.delay.time &&
        a.delay.mix === b.delay.mix &&
        a.chorus.enabled === b.chorus.enabled &&
        a.chorus.depth === b.chorus.depth &&
        a.chorus.mix === b.chorus.mix
    );
}

export function matchingFxPreset(settings: FxSettings): FxPresetId | null {
    return (
        FX_PRESETS.find((preset) => sameSettings(settings, preset.settings))
            ?.id ?? null
    );
}
