import { InteractionHint } from '@/shared/components/InteractionHint';
import { RepositoryLink } from './RepositoryLink';

export function EditorFooter() {
    return (
        <footer className="flex items-center gap-3 border-t border-border bg-secondary px-4 py-1 text-xs text-muted-foreground">
            <div className="flex flex-1 flex-wrap gap-x-6 gap-y-1">
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
            </div>
            <RepositoryLink />
        </footer>
    );
}
