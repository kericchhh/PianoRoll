import {
    useRef,
    useEffect,
    useState,
    useId,
    useMemo,
    useCallback,
    type ReactNode,
} from 'react';
import { clampScroll } from '@/features/piano-roll/utils/clampScroll';
import { clampScale } from '@/features/piano-roll/utils/clampScale';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type {
    PianoRollView,
    Note,
    MarqueeRect,
    NoteRegion,
} from '@/features/piano-roll/types';
import {
    ContextMenu,
    ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { NoteContextMenuContent } from '@/features/piano-roll/components/NoteContextMenuContent';
import { useNoteInteractions } from '@/features/piano-roll/hooks/useNoteInteractions';
import { useZoomPan } from '@/features/piano-roll/hooks/useZoomPan';
import {
    BAR_COUNTS,
    BEATS_PER_BAR,
    PPQ,
    INITIAL_BAR_COUNT,
    VIEWPORT_WIDTH,
    VIEWPORT_HEIGHT,
    ROW_HEIGHT,
    RULER_HEIGHT,
    INITIAL_HIGHEST_PITCH,
} from '@/features/piano-roll/constants';
import {
    createNoteIndex,
    queryNoteIndex,
} from '@/features/piano-roll/utils/noteIndex';
import { revealNotes } from '@/features/piano-roll/utils/revealNotes';
import { useCanvasRenderer } from '@/features/piano-roll/hooks/useCanvasRenderer';
import { NoteInsertionForm } from '@/features/piano-roll/components/NoteInsertionForm';
import { NoteList } from '@/features/piano-roll/components/NoteList';
import { PianoKeys } from '@/features/piano-roll/components/PianoKeys';
import { EditorToolbar } from '@/features/piano-roll/components/EditorToolbar';
import { StudioSidebar } from '@/features/piano-roll/components/StudioSidebar';
import { useElementSize } from '@/shared/hooks/useElementSize';

export function PianoRollCanvas({
    playbackControls,
    onTogglePlayback,
}: {
    playbackControls?: ReactNode;
    onTogglePlayback?: () => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rulerRef = useRef<HTMLCanvasElement>(null);
    const scaleRef = useRef(0.5);
    const scrollRef = useRef(0);
    const editorRef = useRef<HTMLDivElement>(null);
    const surfaceRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const activeNoteRef = useRef<string | null>(null);
    const [highestPitch, setHighestPitch] = useState(INITIAL_HIGHEST_PITCH);
    const dragCandidateRef = useRef<Note | null>(null);
    const previewRef = useRef<Record<string, Note> | null>(null);
    const marqueeRef = useRef<MarqueeRect | null>(null);
    const instructionsId = useId();
    const timelineId = useId();
    const [barCount, setBarCount] = useState(INITIAL_BAR_COUNT);
    const endTick = barCount * BEATS_PER_BAR * PPQ;
    const { width, height } = useElementSize(editorRef, {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
    });
    const notes = useNoteStore((state) => state.notes);
    const getPianoRollView = useCallback((): PianoRollView => {
        return {
            pixelsPerTick: scaleRef.current,
            scrollOffsetX: scrollRef.current,
            highestVisiblePitch: highestPitch,
            rowHeight: ROW_HEIGHT,
        };
    }, [highestPitch]);
    const index = useMemo(() => createNoteIndex(notes), [notes]);
    const queryNotes = useCallback(
        (region: NoteRegion) => queryNoteIndex(index, region),
        [index],
    );
    const requestRedraw = useCanvasRenderer({
        canvasRef,
        rulerRef,
        overlayRef,
        activeNoteRef,
        previewRef,
        marqueeRef,
        index,
        getView: getPianoRollView,
        width,
        height,
        endTick,
    });
    const onReveal = useCallback(
        (moved: readonly Note[]) => {
            const view = revealNotes(
                moved,
                getPianoRollView(),
                width,
                height,
                endTick,
            );
            scrollRef.current = view.scrollOffsetX;
            setHighestPitch(view.highestVisiblePitch);
            requestRedraw();
        },
        [endTick, getPianoRollView, height, requestRedraw, width],
    );
    const {
        menuNoteId,
        handleCanvasClick,
        handleCanvasContextMenu,
        handleEditorKeyDown,
        deleteNote,
        selectNote,
        announcement,
        activeNoteId,
        addNote,
        handleCanvasPointerDown,
        gestureModeRef,
        dragScaleRef,
    } = useNoteInteractions({
        canvasRef,
        getView: getPianoRollView,
        width,
        height,
        endTick,
        dragCandidateRef,
        previewRef,
        marqueeRef,
        requestRedraw,
        onReveal,
        queryNotes,
        surfaceRef,
        onTogglePlayback,
    });

    useZoomPan({
        canvasRef,
        surfaceRef,
        scaleRef,
        scrollRef,
        endTick,
        width,
        height,
        requestRedraw,
        gestureModeRef,
        dragScaleRef,
    });
    const activeNote = activeNoteId ? notes[activeNoteId] : undefined;
    const selectedNote = activeNote?.selected ? activeNote : index.selected[0];
    useEffect(() => {
        activeNoteRef.current = selectedNote?.id ?? null;
        requestRedraw();
    }, [selectedNote, requestRedraw]);
    useEffect(() => {
        scaleRef.current = clampScale(scaleRef.current, endTick, width);
        scrollRef.current = clampScroll(
            scrollRef.current,
            endTick,
            scaleRef.current,
            width,
        );
        requestRedraw();
    }, [endTick, requestRedraw, width]);

    return (
        <section
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border bg-background"
            aria-label="Piano roll workspace"
        >
            <EditorToolbar
                playbackControls={playbackControls}
                timeline={
                    <div className="flex items-center gap-3">
                        <Label
                            htmlFor={timelineId}
                            className="text-xs text-muted-foreground"
                        >
                            Timeline length
                        </Label>
                        <Select
                            value={String(barCount)}
                            onValueChange={(value) =>
                                setBarCount(Number(value))
                            }
                        >
                            <SelectTrigger id={timelineId} className="w-28">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {BAR_COUNTS.map((bars) => (
                                    <SelectItem key={bars} value={String(bars)}>
                                        {bars} bars
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                }
                insertionForm={
                    <NoteInsertionForm endTick={endTick} onAdd={addNote} />
                }
            />
            <div className="workspace-grid min-h-0 flex-1">
                <div
                    className="flex items-center justify-center border-r border-b border-border bg-secondary text-xs text-muted-foreground"
                    style={{ height: RULER_HEIGHT }}
                >
                    Keys
                </div>
                <div className="min-w-0 overflow-hidden border-b border-border bg-secondary">
                    <canvas
                        ref={rulerRef}
                        aria-hidden="true"
                        className="block"
                    />
                </div>
                <div className="min-h-0 overflow-hidden border-r border-border">
                    <PianoKeys highestPitch={highestPitch} height={height} />
                </div>
                <div
                    ref={editorRef}
                    role="group"
                    aria-label="Piano roll editor"
                    aria-describedby={instructionsId}
                    aria-keyshortcuts="Space Control+c Meta+c Control+v Meta+v"
                    tabIndex={0}
                    onKeyDown={handleEditorKeyDown}
                    className="group relative min-h-0 min-w-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <div
                                ref={surfaceRef}
                                className="absolute inset-0 touch-none select-none"
                                onClick={(event) => {
                                    handleCanvasClick(event);
                                    editorRef.current?.focus({
                                        preventScroll: true,
                                    });
                                }}
                                onContextMenuCapture={handleCanvasContextMenu}
                                onPointerDown={(event) => {
                                    handleCanvasPointerDown(event);
                                    editorRef.current?.focus({
                                        preventScroll: true,
                                    });
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    role="img"
                                    aria-label="Time grid preview"
                                    data-logical-width={width}
                                    data-logical-height={height}
                                    className="block bg-roll-background select-none"
                                />
                                {selectedNote && (
                                    <div
                                        ref={overlayRef}
                                        data-note-overlay
                                        tabIndex={0}
                                        role="group"
                                        aria-label={`Selected note: pitch ${selectedNote.pitch}, tick ${selectedNote.startTick}, duration ${selectedNote.durationTicks} ticks`}
                                        aria-keyshortcuts="Space ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Delete Control+c Meta+c Control+v Meta+v"
                                        className="absolute outline-2 outline-offset-1 outline-transparent group-focus-within:outline-ring focus-visible:outline-ring"
                                    >
                                        <span className="sr-only">
                                            Use arrow keys to move this
                                            selection, Shift+Left or Shift+Right
                                            to resize it, or Delete to remove
                                            it. Ctrl or Command+C copies the
                                            selection; Ctrl or Command+V pastes
                                            it after the selected group. Space
                                            toggles playback.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </ContextMenuTrigger>
                        <NoteContextMenuContent
                            noteId={menuNoteId}
                            onSelectNote={(id) => selectNote(id)}
                            onDeleteNote={deleteNote}
                        />
                    </ContextMenu>
                    <p id={instructionsId} className="sr-only">
                        Ctrl or Command-click toggles a note. Ctrl or
                        Command-drag empty grid selects overlapping notes. Use
                        the note-list buttons to toggle selection with the
                        keyboard, arrow keys to move selected notes, Shift+Left
                        or Shift+Right to resize them, and Delete to remove
                        them. Drag a note's right edge to resize the selection.
                        Ctrl or Command+C copies selected notes. Ctrl or
                        Command+V pastes after the selected group or last paste.
                        Space toggles playback. Enter toggles a focused
                        note-list button's selection. Use the New note pitch and
                        Start tick fields followed by Add note to insert a note.
                    </p>
                    <NoteList notes={notes} onSelect={selectNote} />
                    <p role="status" aria-atomic="true" className="sr-only">
                        <span key={announcement.sequence}>
                            {announcement.text}
                        </span>
                    </p>
                </div>
                <StudioSidebar />
            </div>
            <footer className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border bg-secondary px-4 py-2 text-xs text-muted-foreground">
                <span>Click to draw. Drag a note to move it.</span>
                <span>Shift-drag to pan. Ctrl-wheel to zoom.</span>
                <span>Ctrl / ⌘+C and +V copy and paste notes.</span>
                <span>Space plays / pauses.</span>
                <span className="hidden lg:inline">
                    Ctrl / ⌘-drag empty grid to select notes.
                </span>
            </footer>
        </section>
    );
}
