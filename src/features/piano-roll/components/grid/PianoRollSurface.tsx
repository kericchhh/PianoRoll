import { useId, type ReactNode } from 'react';
import type { PianoRollEditorModel } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import {
    ContextMenu,
    ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
import { PianoRollCanvas } from '@/features/piano-roll/components/grid/PianoRollCanvas';
import { SelectedNoteOverlay } from '@/features/piano-roll/components/notes/SelectedNoteOverlay';
import { NoteContextMenuContent } from '@/features/piano-roll/components/notes/NoteContextMenuContent';
import { NoteList } from '@/features/piano-roll/components/notes/NoteList';
import { EditorInstructions } from '@/features/piano-roll/components/editor/EditorInstructions';
import { EditorAnnouncement } from '@/features/piano-roll/components/editor/EditorAnnouncement';

export function PianoRollSurface({
    editor,
    playhead,
}: {
    editor: PianoRollEditorModel;
    playhead?: ReactNode;
}) {
    const instructionsId = useId();
    const {
        viewport,
        canvasRef,
        surfaceRef,
        overlayRef,
        selectedNote,
        notes,
        interactions,
    } = editor;
    const { editorRef, width, height } = viewport;

    return (
        <div
            ref={editorRef}
            role="group"
            aria-label="Piano roll editor"
            aria-describedby={instructionsId}
            aria-keyshortcuts="Space Control+c Meta+c Control+v Meta+v Control+z Meta+z Control+Shift+z Meta+Shift+z"
            tabIndex={0}
            onKeyDown={interactions.handleEditorKeyDown}
            className="group relative min-h-0 min-w-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        ref={surfaceRef}
                        className="absolute inset-0 touch-none select-none"
                        onClick={(event) => {
                            interactions.handleCanvasClick(event);
                            editorRef.current?.focus({ preventScroll: true });
                        }}
                        onContextMenuCapture={
                            interactions.handleCanvasContextMenu
                        }
                        onPointerDown={(event) => {
                            interactions.handleCanvasPointerDown(event);
                            editorRef.current?.focus({ preventScroll: true });
                        }}
                    >
                        <PianoRollCanvas
                            canvasRef={canvasRef}
                            width={width}
                            height={height}
                        />
                        {playhead}
                        {selectedNote && (
                            <SelectedNoteOverlay
                                note={selectedNote}
                                overlayRef={overlayRef}
                            />
                        )}
                    </div>
                </ContextMenuTrigger>
                <NoteContextMenuContent
                    noteId={interactions.menuNoteId}
                    onSelectNote={(id) => interactions.selectNote(id)}
                    onDeleteNote={interactions.deleteNote}
                />
            </ContextMenu>
            <EditorInstructions id={instructionsId} />
            <NoteList notes={notes} onSelect={interactions.selectNote} />
            <EditorAnnouncement announcement={interactions.announcement} />
        </div>
    );
}
