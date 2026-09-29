import * as ContextMenu from "@radix-ui/react-context-menu";

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
        <ContextMenu.Portal>
            <ContextMenu.Content className="z-50 min-w-36 rounded border border-slate-500 bg-white p-1 text-slate-900 shadow-lg">
                <ContextMenu.Item
                    disabled={noteId === null}
                    onSelect={() => {
                        if (noteId !== null) onSelectNote(noteId);
                    }}
                    className="cursor-default rounded px-3 py-1.5 outline-none data-highlighted:bg-blue-700 data-highlighted:text-white data-disabled:opacity-50"
                >
                    Select note
                </ContextMenu.Item>
                <ContextMenu.Item
                    disabled={noteId === null}
                    onSelect={() => {
                        if (noteId !== null) onDeleteNote(noteId);
                    }}
                    className="cursor-default rounded px-3 py-1.5 outline-none data-highlighted:bg-blue-700 data-highlighted:text-white data-disabled:opacity-50"
                >
                    Delete note
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Portal>
    );
}
