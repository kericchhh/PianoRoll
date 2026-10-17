import { useId } from 'react';
import {
    SNAP_OPTIONS,
    type SnapTicks,
} from '@/features/piano-roll/constants/music';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';

type Props = {
    value: SnapTicks;
    onValueChange: (value: SnapTicks) => void;
};

export function SnapSelect({ value, onValueChange }: Props) {
    const id = useId();
    return (
        <div className="flex items-center gap-3">
            <Label htmlFor={id} className="text-xs text-muted-foreground">
                Snap
            </Label>
            <Select
                value={String(value)}
                onValueChange={(next) => {
                    const option = SNAP_OPTIONS.find(
                        (item) => String(item.ticks) === next,
                    );
                    if (option) onValueChange(option.ticks);
                }}
            >
                <SelectTrigger id={id} className="w-24">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {SNAP_OPTIONS.map((option) => (
                        <SelectItem
                            key={option.ticks}
                            value={String(option.ticks)}
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
