import { InteractionHint } from '@/shared/components/InteractionHint';

export function EditorFooter() {
    return (
        <footer className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border bg-secondary px-4 py-2 text-xs text-muted-foreground">
            <InteractionHint>
                Click to draw. Drag a note to move it.
            </InteractionHint>
            <InteractionHint>
                Shift-drag to pan. Ctrl-wheel to zoom.
            </InteractionHint>
            <InteractionHint>
                Ctrl / ⌘+C and +V copy and paste notes.
            </InteractionHint>
            <InteractionHint>Space plays / pauses.</InteractionHint>
            <InteractionHint className="hidden lg:inline">
                Ctrl / ⌘-drag empty grid to select notes.
            </InteractionHint>
        </footer>
    );
}
