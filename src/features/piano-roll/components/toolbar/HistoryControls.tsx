import type { KeyboardEventHandler } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';

type Props = {
    onUndo: () => void;
    onRedo: () => void;
    onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

export function HistoryControls({ onUndo, onRedo, onKeyDown }: Props) {
    const canUndo = useNoteStore((state) => state.undoStack.length > 0);
    const canRedo = useNoteStore((state) => state.redoStack.length > 0);
    return (
        <div
            role="group"
            aria-label="Edit history"
            className="ml-auto flex gap-2"
            onKeyDown={(event) => {
                if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key.toLowerCase() === 'z'
                )
                    onKeyDown(event);
            }}
        >
            <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Undo"
                aria-keyshortcuts="Control+z Meta+z"
                aria-disabled={!canUndo}
                tabIndex={canUndo ? 0 : -1}
                title="Undo (Ctrl/Cmd+Z)"
                className="aria-disabled:cursor-default aria-disabled:opacity-40"
                onClick={() => {
                    if (canUndo) onUndo();
                }}
            >
                <Undo2 aria-hidden="true" />
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Redo"
                aria-keyshortcuts="Control+Shift+z Meta+Shift+z"
                aria-disabled={!canRedo}
                tabIndex={canRedo ? 0 : -1}
                title="Redo (Ctrl/Cmd+Shift+Z)"
                className="aria-disabled:cursor-default aria-disabled:opacity-40"
                onClick={() => {
                    if (canRedo) onRedo();
                }}
            >
                <Redo2 aria-hidden="true" />
            </Button>
        </div>
    );
}
