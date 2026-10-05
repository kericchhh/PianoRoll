import {
    ContextMenuContent,
    ContextMenuItem,
} from '@/shared/components/ui/context-menu';

type NoteContextMenuContentProps = {
    noteId: string | null;
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string) => void;
};

export function NoteContextMenuContent({
    noteId,
    onSelectNote,
    onDeleteNote,
}: NoteContextMenuContentProps) {
    return (
        <ContextMenuContent className="min-w-36">
            <ContextMenuItem
                disabled={noteId === null}
                onSelect={() => {
                    if (noteId !== null) onSelectNote(noteId);
                }}
            >
                Select note
            </ContextMenuItem>
            <ContextMenuItem
                variant="destructive"
                disabled={noteId === null}
                onSelect={() => {
                    if (noteId !== null) onDeleteNote(noteId);
                }}
            >
                Delete note
            </ContextMenuItem>
        </ContextMenuContent>
    );
}
