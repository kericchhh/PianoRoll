import { useId, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    DEFAULT_NOTE_DURATION_TICKS,
    INITIAL_HIGHEST_PITCH,
    SNAP_TICKS,
} from '@/features/piano-roll/constants';

type Props = {
    endTick: number;
    onAdd: (tick: number, pitch: number, selected: boolean) => boolean;
};
export function NoteInsertionForm({ endTick, onAdd }: Props) {
    const [error, setError] = useState('');
    const pitchId = useId();
    const tickId = useId();
    return (
        <form
            aria-label="Add a note"
            className="note-insertion-form flex flex-wrap items-center gap-x-6 gap-y-2"
            onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const added = onAdd(
                    Number(data.get('tick')),
                    Number(data.get('pitch')),
                    true,
                );
                setError(
                    added
                        ? ''
                        : 'The note must fit inside the selected timeline.',
                );
            }}
        >
            <div className="flex items-center gap-2">
                <Label
                    htmlFor={pitchId}
                    className="text-xs text-muted-foreground"
                >
                    New note pitch
                </Label>
                <Input
                    id={pitchId}
                    className="w-20"
                    name="pitch"
                    type="number"
                    min={0}
                    max={127}
                    step={1}
                    defaultValue={INITIAL_HIGHEST_PITCH}
                    required
                />
            </div>
            <div className="flex items-center gap-2">
                <Label
                    htmlFor={tickId}
                    className="text-xs text-muted-foreground"
                >
                    Start tick
                </Label>
                <Input
                    id={tickId}
                    className="w-24"
                    name="tick"
                    type="number"
                    min={0}
                    max={endTick - DEFAULT_NOTE_DURATION_TICKS}
                    step={SNAP_TICKS}
                    defaultValue={0}
                    required
                />
            </div>
            <Button
                type="submit"
                variant="outline"
                className="border-primary text-primary"
            >
                Add note
            </Button>
            {error && <p role="alert">{error}</p>}
        </form>
    );
}
