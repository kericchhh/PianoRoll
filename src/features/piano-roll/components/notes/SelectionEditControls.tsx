import { useId } from 'react';
import {
    ArrowDown,
    ArrowUp,
    ArrowLeft,
    ArrowRight,
    FoldHorizontal,
    UnfoldHorizontal,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { SNAP_TICKS } from '@/features/piano-roll/constants';

type Props = {
    hasSelection: boolean;
    moveSelection: (tickDelta: number, pitchDelta: number) => void;
    resizeSelection: (tickDelta: number) => void;
};

export function SelectionEditControls({
    hasSelection,
    moveSelection,
    resizeSelection,
}: Props) {
    const descriptionId = useId();
    const actions = [
        {
            label: 'Pitch down',
            Icon: ArrowDown,
            action: () => moveSelection(0, -1),
        },
        { label: 'Pitch up', Icon: ArrowUp, action: () => moveSelection(0, 1) },
        {
            label: 'Move earlier',
            Icon: ArrowLeft,
            action: () => moveSelection(-SNAP_TICKS, 0),
        },
        {
            label: 'Move later',
            Icon: ArrowRight,
            action: () => moveSelection(SNAP_TICKS, 0),
        },
        {
            label: 'Shorten notes',
            Icon: FoldHorizontal,
            action: () => resizeSelection(-SNAP_TICKS),
        },
        {
            label: 'Lengthen notes',
            Icon: UnfoldHorizontal,
            action: () => resizeSelection(SNAP_TICKS),
        },
    ];

    return (
        <div
            role="group"
            aria-label="Edit selected notes"
            aria-describedby={descriptionId}
            className="grid grid-cols-2 gap-2"
        >
            <span className="sr-only">Selected notes</span>
            {actions.map(({ label, Icon, action }) => (
                <Button
                    key={label}
                    type="button"
                    variant="outline"
                    size="icon"
                    className="bg-popover"
                    aria-label={label}
                    title={label}
                    disabled={!hasSelection}
                    onClick={action}
                >
                    <Icon aria-hidden="true" />
                </Button>
            ))}
            <span id={descriptionId} className="sr-only">
                Edit the whole selection. Pitch changes by one semitone;
                position and duration change by {SNAP_TICKS} ticks.
            </span>
        </div>
    );
}
