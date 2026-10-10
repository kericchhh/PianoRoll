import { useId } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { pitchToNoteName } from '@/features/piano-roll/utils/notes/pitchToNoteName';
import type { InstrumentFile } from '@/features/piano-roll/audio/customInstrument';

type Props = {
    entry: InstrumentFile;
    disabled: boolean;
    onPitch: (pitch: number | null) => void;
    onRemove: () => void;
};

export function InstrumentSampleRow({
    entry,
    disabled,
    onPitch,
    onRemove,
}: Props) {
    const id = useId();
    const valid =
        entry.rootPitch !== null &&
        Number.isInteger(entry.rootPitch) &&
        entry.rootPitch >= 0 &&
        entry.rootPitch <= 127;
    return (
        <li className="space-y-1 border-b border-border py-2">
            <p className="text-sm wrap-anywhere">{entry.id}</p>
            <div className="flex items-center gap-2">
                <Label htmlFor={id} className="shrink-0 text-xs">
                    MIDI pitch
                </Label>
                <Input
                    id={id}
                    type="number"
                    min={0}
                    max={127}
                    step={1}
                    value={entry.rootPitch ?? ''}
                    disabled={disabled}
                    className="w-20"
                    aria-label={`Root pitch for ${entry.id}`}
                    aria-describedby={`${id}-hint`}
                    aria-invalid={!valid}
                    onChange={(event) =>
                        onPitch(
                            event.target.value === ''
                                ? null
                                : event.target.valueAsNumber,
                        )
                    }
                />
                <span
                    id={`${id}-hint`}
                    className="min-w-0 flex-1 text-xs text-muted-foreground"
                >
                    {valid ? pitchToNoteName(entry.rootPitch!) : 'Assign 0–127'}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    aria-label={`Remove ${entry.id}`}
                    onClick={onRemove}
                >
                    <X aria-hidden="true" />
                </Button>
            </div>
        </li>
    );
}
