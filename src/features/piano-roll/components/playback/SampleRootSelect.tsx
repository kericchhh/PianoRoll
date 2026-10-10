import { useId } from 'react';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { pitchToNoteName } from '@/features/piano-roll/utils/notes/pitchToNoteName';
import {
    MIN_SAMPLE_ROOT,
    MAX_SAMPLE_ROOT,
} from '@/features/piano-roll/audio/customSample';

type Props = {
    value: number;
    hasSample: boolean;
    onChange: (pitch: number) => void;
    disabled?: boolean;
};

export function SampleRootSelect({
    value,
    hasSample,
    onChange,
    disabled,
}: Props) {
    const id = useId();
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>Sample root pitch</Label>
            <Select
                value={String(value)}
                onValueChange={(pitch) => onChange(Number(pitch))}
                disabled={disabled}
            >
                <SelectTrigger
                    id={id}
                    className="w-full"
                    aria-describedby={`${id}-hint`}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {Array.from(
                        { length: MAX_SAMPLE_ROOT - MIN_SAMPLE_ROOT + 1 },
                        (_, index) => MIN_SAMPLE_ROOT + index,
                    ).map((pitch) => (
                        <SelectItem key={pitch} value={String(pitch)}>
                            {pitchToNoteName(pitch)} (MIDI {pitch})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p id={`${id}-hint`} className="text-sm text-muted-foreground">
                {hasSample
                    ? 'The recording’s original pitch (MIDI 32–95). Changing it retunes the imported instrument.'
                    : 'Sets the root pitch for your next single-sample import. The current instrument keeps its tuning.'}
            </p>
        </div>
    );
}
