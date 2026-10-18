export type FxSettings = {
    reverb: { enabled: boolean; room: number; mix: number };
    delay: { enabled: boolean; time: number; mix: number };
    chorus: { enabled: boolean; depth: number; mix: number };
};

export const DEFAULT_FX_SETTINGS: FxSettings = {
    reverb: { enabled: false, room: 2, mix: 22 },
    delay: { enabled: false, time: 240, mix: 18 },
    chorus: { enabled: false, depth: 45, mix: 20 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inRange(value: unknown, minimum: number, maximum: number) {
    return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= minimum &&
        value <= maximum
    );
}

function percentage(value: unknown) {
    return inRange(value, 0, 100) && Number.isInteger(value);
}

export function parseFxSettings(value: unknown): FxSettings {
    if (!isRecord(value)) throw new Error('The saved FX settings are invalid.');
    const { reverb, delay, chorus } = value;
    if (
        !isRecord(reverb) ||
        typeof reverb.enabled !== 'boolean' ||
        !inRange(reverb.room, 0.5, 5) ||
        !percentage(reverb.mix) ||
        !isRecord(delay) ||
        typeof delay.enabled !== 'boolean' ||
        !inRange(delay.time, 80, 750) ||
        !Number.isInteger(delay.time) ||
        !percentage(delay.mix) ||
        !isRecord(chorus) ||
        typeof chorus.enabled !== 'boolean' ||
        !percentage(chorus.depth) ||
        !percentage(chorus.mix)
    ) {
        throw new Error('The saved FX settings are invalid.');
    }
    return {
        reverb: {
            enabled: reverb.enabled,
            room: reverb.room as number,
            mix: reverb.mix as number,
        },
        delay: {
            enabled: delay.enabled,
            time: delay.time as number,
            mix: delay.mix as number,
        },
        chorus: {
            enabled: chorus.enabled,
            depth: chorus.depth as number,
            mix: chorus.mix as number,
        },
    };
}
