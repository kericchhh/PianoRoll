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
import {
    DEFAULT_SNAP_TICKS,
    type SnapTicks,
} from '@/features/piano-roll/constants/music';

type Props = {
    hasSelection: boolean;
    snapTicks?: SnapTicks;
    moveSelection: (tickDelta: number, pitchDelta: number) => void;
    resizeSelection: (tickDelta: number) => void;
};

export function SelectionEditControls({
    hasSelection,
    snapTicks = DEFAULT_SNAP_TICKS,
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
            action: () => moveSelection(-snapTicks, 0),
        },
        {
            label: 'Move later',
            Icon: ArrowRight,
            action: () => moveSelection(snapTicks, 0),
        },
        {
            label: 'Shorten notes',
            Icon: FoldHorizontal,
            action: () => resizeSelection(-snapTicks),
        },
        {
            label: 'Lengthen notes',
            Icon: UnfoldHorizontal,
            action: () => resizeSelection(snapTicks),
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
                position and duration change by {snapTicks} ticks.
            </span>
        </div>
    );
}
