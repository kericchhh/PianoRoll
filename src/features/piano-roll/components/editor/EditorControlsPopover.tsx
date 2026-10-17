import { useId } from 'react';
import { PanelTopOpen } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/shared/components/ui/popover';
import { ViewportControls } from '@/features/piano-roll/components/toolbar/ViewportControls';
import { SelectionEditControls } from '@/features/piano-roll/components/notes/SelectionEditControls';
import type { PianoRollEditorModel } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';

export function EditorControlsPopover({
    editor,
}: {
    editor: PianoRollEditorModel;
}) {
    const titleId = useId();
    return (
        <div
            className="absolute bottom-3 left-3 z-30"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
        >
            <Popover modal={false}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="rounded-full bg-secondary"
                        aria-label="Editor controls"
                        title="Editor controls"
                    >
                        <PanelTopOpen aria-hidden="true" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    side="top"
                    align="start"
                    sideOffset={8}
                    collisionPadding={12}
                    aria-labelledby={titleId}
                    aria-describedby={undefined}
                    className="w-fit bg-transparent"
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <h2 id={titleId} className="sr-only">
                        Editor controls
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="sr-only">Timeline view</h3>
                            <ViewportControls {...editor.viewportActions} />
                        </div>
                        <SelectionEditControls
                            snapTicks={editor.snapTicks}
                            hasSelection={!!editor.selectedNote}
                            moveSelection={editor.interactions.moveSelection}
                            resizeSelection={
                                editor.interactions.resizeSelection
                            }
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
