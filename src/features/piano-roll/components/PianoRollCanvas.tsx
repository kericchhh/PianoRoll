import { useRef, useEffect, useState } from "react";
import { drawTimeGrid } from "@/features/piano-roll/utils/drawTimeGrid";
import { drawPitchRows } from "@/features/piano-roll/utils/drawPitchRows";
import { drawNote } from "@/features/piano-roll/utils/drawNote";
import { clampScroll } from "@/features/piano-roll/utils/clampScroll";
import { clampScale } from "@/features/piano-roll/utils/clampScale";
import { useNoteStore } from "@/features/piano-roll/store/useNoteStore";
import type { PianoRollView, Note } from "@/features/piano-roll/types";
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
    const previewRef = useRef<Note | null>(null);
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
        alert,
        handleCanvasPointerDown
    } = useNoteInteractions({
        canvasRef, getView: getPianoRollView, width, height, endTick,
        dragCandidateRef, previewRef, requestRedraw
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
            for (const note of Object.values(notes)) {
                const preview = previewRef.current?.id === note.id ? previewRef.current : null
                if (preview && isVisible(note)) {
                    drawNote(context, { ...note, selected: false }, view, '#94a3b8')
                }
                const displayedNote = preview ?? note
                if (isVisible(displayedNote)) drawNote(context, displayedNote, view)
            }

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
                            onPointerDown={handleCanvasPointerDown}
                        />
                    </ContextMenu.Trigger>
                    <NoteContextMenuContent
                        noteId={menuNoteId}
                        onSelectNote={useNoteStore.getState().selectNote}
                        onDeleteNote={deleteNote}
                    />
                </ContextMenu.Root>
                <ul aria-label="Notes" className="sr-only focus-within:not-sr-only">
                    {Object.values(notes).map((note) => (
                        <li key={note.id}>
                            <button
                                type="button"
                                className="focus-visible:outline-2 focus-visible:outline-blue-700"
                                onClick={() => useNoteStore.getState().selectNote(note.id)}
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
