import {
    FX_PRESETS,
    matchingFxPreset,
} from '@/features/piano-roll/audio/fxPresets';
import type { FxSettings } from '@/features/piano-roll/audio/fxSettings';
import { Button } from '@/shared/components/ui/button';

type Props = {
    settings: FxSettings;
    onSelect: (settings: FxSettings) => void;
};

export function FxPresets({ settings, onSelect }: Props) {
    const active = matchingFxPreset(settings);
    return (
        <section
            className="border-t border-border px-3 py-2"
            aria-label="FX presets"
        >
            <div className="mb-1 flex items-center justify-between">
                <h3 className="text-xs font-bold">Presets</h3>
                {active === null && (
                    <span className="text-xs text-muted-foreground">
                        Custom
                    </span>
                )}
            </div>
            <div className="grid grid-cols-4 gap-1">
                {FX_PRESETS.map((preset) => (
                    <Button
                        key={preset.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="fx-preset-button"
                        aria-pressed={active === preset.id}
                        onClick={() => onSelect(preset.settings)}
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>
        </section>
    );
}
