import { useRef, useEffect, useState, useId } from "react";
import { drawTimeGrid } from "@/features/piano-roll/utils/drawTimeGrid";
import { drawPitchRows } from "@/features/piano-roll/utils/drawPitchRows";
import { drawNote } from "@/features/piano-roll/utils/drawNote";
import { drawMarquee } from "@/features/piano-roll/utils/drawMarquee";
import { clampScroll } from "@/features/piano-roll/utils/clampScroll";
import { clampScale } from "@/features/piano-roll/utils/clampScale";
import { useNoteStore } from "@/features/piano-roll/store/useNoteStore";
import type { PianoRollView, Note, MarqueeRect } from "@/features/piano-roll/types";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { NoteContextMenuContent } from "@/features/piano-roll/components/NoteContextMenuContent";
import { useNoteInteractions } from "@/features/piano-roll/hooks/useNoteInteractions";
import { useZoomPan } from "@/features/piano-roll/hooks/useZoomPan";
import { BAR_COUNTS, BEATS_PER_BAR, PPQ } from "@/features/piano-roll/constants";

export function PianoRollCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scaleRef = useRef(0.5);
    const frameRef = useRef<number | null>(null);
    const redrawRef = useRef<(() => void) | null>(null);
    const scrollRef = useRef(0);
    const editorRef = useRef<HTMLDivElement>(null);
    const dragCandidateRef = useRef<Note | null>(null);
    const previewRef = useRef<Record<string, Note> | null>(null);
    const marqueeRef = useRef<MarqueeRect | null>(null);
    const instructionsId = useId();
    const [barCount, setBarCount] = useState(8);
    const endTick = barCount * BEATS_PER_BAR * PPQ;
    const width = 600;
    const height = 240;
    const notes = useNoteStore((state) => state.notes);
    function getPianoRollView(): PianoRollView {
        return {
            pixelsPerTick: scaleRef.current,
            scrollOffsetX: scrollRef.current,
            highestVisiblePitch: 72,
            rowHeight: 20
        }
    }
    const {
        menuNoteId,
        handleCanvasClick,
        handleCanvasContextMenu,
        handleEditorKeyDown,
        deleteNote,
        selectNote,
        alert,
        handleCanvasPointerDown
    } = useNoteInteractions({
        canvasRef, getView: getPianoRollView, width, height, endTick,
        dragCandidateRef, previewRef, marqueeRef, requestRedraw
    })


    function requestRedraw(): void {
        if (frameRef.current !== null) return;

        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null
            redrawRef.current?.()
        })
    }
    useZoomPan({ canvasRef, scaleRef, scrollRef, endTick, width, requestRedraw })


    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ratio = window.devicePixelRatio || 1

        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        const context = canvas.getContext('2d')
        if (!context) return

        context.setTransform(ratio, 0, 0, ratio, 0, 0)
        const redraw = () => {
            context.clearRect(0, 0, width, height)
            const timelineRight = endTick * scaleRef.current - scrollRef.current
            const gridWidth = Math.max(0, Math.min(width, timelineRight))
            drawTimeGrid(context, width, height, scaleRef.current, scrollRef.current, endTick)
            drawPitchRows(context, gridWidth, height, 20)
            const leftTick = scrollRef.current / scaleRef.current
            const rightTick = (scrollRef.current + width) / scaleRef.current
            const view = getPianoRollView()
            const isVisible = (note: Note) =>
                note.startTick + note.durationTicks > leftTick && note.startTick < rightTick
            const previews = previewRef.current
            if (previews) {
                for (const id of Object.keys(previews)) {
                    const origin = notes[id]
                    if (origin && isVisible(origin)) {
                        drawNote(context, { ...origin, selected: false }, view, '#94a3b8')
                    }
                }
            }
            for (const note of Object.values(notes)) {
                const displayedNote = previews?.[note.id] ?? note
                if (isVisible(displayedNote)) drawNote(context, displayedNote, view)
            }
            if (marqueeRef.current) drawMarquee(context, marqueeRef.current)
        }
        scaleRef.current = clampScale(scaleRef.current, endTick, width)
        scrollRef.current = clampScroll(scrollRef.current, endTick, scaleRef.current, width)
        redrawRef.current = redraw
        redraw()

        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current)
                frameRef.current = null
            }

            redrawRef.current = null
        }
    }, [endTick, notes]);

    return (
        <>
            <label>
                Timeline length
                <select
                    value={barCount}
                    onChange={event => setBarCount(Number(event.target.value))}
                    className="ml-2 border focus-visible:outline-2"
                >
                    {BAR_COUNTS.map(bars => (
                        <option key={bars} value={bars}>
                            {bars} bars
                        </option>
                    ))}
                </select>
            </label>
            <div
                ref={editorRef}
                role="group"
                aria-label="Piano roll editor"
                aria-describedby={instructionsId}
                tabIndex={0}
                onKeyDown={handleEditorKeyDown}
                className="focus-visible:outline-2 focus-visible:outline-blue-700"
            >
                <ContextMenu.Root>
                    <ContextMenu.Trigger asChild>
                        <canvas
                            ref={canvasRef}
                            role="img"
                            aria-label="Time grid preview"
                            className="block border border-slate-600 select-none"
                            onClick={(event) => {
                                handleCanvasClick(event)
                                editorRef.current?.focus({ preventScroll: true})
                            }}
                            onContextMenuCapture={handleCanvasContextMenu}
                            onPointerDown={(event) => {
                                handleCanvasPointerDown(event)
                                editorRef.current?.focus({ preventScroll: true })
                            }}
                        />
                    </ContextMenu.Trigger>
                    <NoteContextMenuContent
                        noteId={menuNoteId}
                        onSelectNote={id => selectNote(id)}
                        onDeleteNote={deleteNote}
                    />
                </ContextMenu.Root>
                <p id={instructionsId} className="sr-only">
                    Ctrl or Command-click toggles a note. Ctrl or Command-drag empty grid
                    selects overlapping notes. Use the note-list buttons to toggle selection
                    with the keyboard, arrow keys to move selected notes, and Delete to remove them.
                </p>
                <ul aria-label="Notes" className="sr-only focus-within:not-sr-only">
                    {Object.values(notes).map((note) => (
                        <li key={note.id}>
                            <button
                                type="button"
                                aria-pressed={note.selected}
                                className="focus-visible:outline-2 focus-visible:outline-blue-700"
                                onClick={() => selectNote(note.id, true)}
                            >
                                {note.selected ? "Selected: " : ""}
                                Pitch {note.pitch}, tick {note.startTick}, duration {note.durationTicks} ticks
                            </button>
                        </li>
                    ))}
                </ul>
                <p role="status" aria-atomic="true" className="sr-only">{alert}</p>
            </div>
        </>
    );
}
