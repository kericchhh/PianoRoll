import { FxSection } from '@/features/piano-roll/components/fx/FxSection';
import { RotaryKnob } from '@/features/piano-roll/components/fx/RotaryKnob';
import { OutputMeter } from '@/features/piano-roll/components/fx/OutputMeter';
import { FxPresets } from '@/features/piano-roll/components/fx/FxPresets';
import { useFxStore } from '@/features/piano-roll/store/useFxStore';
import type { FxSettings } from '@/features/piano-roll/audio/fxSettings';

export function FxPanel() {
    const settings = useFxStore((state) => state.settings);
    function update<K extends keyof FxSettings>(
        effect: K,
        patch: Partial<FxSettings[K]>,
    ) {
        const current = useFxStore.getState();
        current.setSettings({
            ...current.settings,
            [effect]: { ...current.settings[effect], ...patch },
        });
    }

    return (
        <div className="fx-panel shrink-0 overflow-hidden bg-secondary">
            <header className="border-b-2 border-border px-3 py-3">
                <h2 className="text-base font-bold">FX</h2>
            </header>
            <FxSection
                name="Reverb"
                enabled={settings.reverb.enabled}
                onToggle={() =>
                    update('reverb', { enabled: !settings.reverb.enabled })
                }
            >
                <RotaryKnob
                    label="Reverb room"
                    value={settings.reverb.room}
                    min={0.5}
                    max={5}
                    step={0.1}
                    commitOnRelease
                    format={(value) => `${value.toFixed(1)} seconds`}
                    shortFormat={(value) => `${value.toFixed(1)} s`}
                    onChange={(room) => update('reverb', { room })}
                />
                <RotaryKnob
                    label="Reverb mix"
                    value={settings.reverb.mix}
                    min={0}
                    max={100}
                    step={1}
                    format={(value) => `${value}%`}
                    onChange={(mix) => update('reverb', { mix })}
                />
            </FxSection>
            <FxSection
                name="Delay"
                enabled={settings.delay.enabled}
                onToggle={() =>
                    update('delay', { enabled: !settings.delay.enabled })
                }
            >
                <RotaryKnob
                    label="Delay time"
                    value={settings.delay.time}
                    min={80}
                    max={750}
                    step={10}
                    format={(value) => `${value} milliseconds`}
                    shortFormat={(value) => `${value} ms`}
                    onChange={(time) => update('delay', { time })}
                />
                <RotaryKnob
                    label="Delay mix"
                    value={settings.delay.mix}
                    min={0}
                    max={100}
                    step={1}
                    format={(value) => `${value}%`}
                    onChange={(mix) => update('delay', { mix })}
                />
            </FxSection>
            <FxSection
                name="Chorus"
                enabled={settings.chorus.enabled}
                onToggle={() =>
                    update('chorus', { enabled: !settings.chorus.enabled })
                }
            >
                <RotaryKnob
                    label="Chorus depth"
                    value={settings.chorus.depth}
                    min={0}
                    max={100}
                    step={1}
                    format={(value) => `${value}%`}
                    onChange={(depth) => update('chorus', { depth })}
                />
                <RotaryKnob
                    label="Chorus mix"
                    value={settings.chorus.mix}
                    min={0}
                    max={100}
                    step={1}
                    format={(value) => `${value}%`}
                    onChange={(mix) => update('chorus', { mix })}
                />
            </FxSection>
            <OutputMeter />
            <FxPresets
                settings={settings}
                onSelect={(preset) => useFxStore.getState().setSettings(preset)}
            />
        </div>
    );
}
