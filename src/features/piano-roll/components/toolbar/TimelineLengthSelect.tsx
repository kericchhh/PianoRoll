import { useId } from 'react';
import { BAR_COUNTS } from '@/features/piano-roll/constants';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';

type Props = {
    value: number;
    onValueChange: (value: number) => void;
};

export function TimelineLengthSelect({ value, onValueChange }: Props) {
    const id = useId();
    return (
        <div className="flex items-center gap-3">
            <Label htmlFor={id} className="text-xs text-muted-foreground">
                Timeline length
            </Label>
            <Select
                value={String(value)}
                onValueChange={(nextValue) => onValueChange(Number(nextValue))}
            >
                <SelectTrigger id={id} className="w-28">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {BAR_COUNTS.map((bars) => (
                        <SelectItem key={bars} value={String(bars)}>
                            {bars} bars
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
