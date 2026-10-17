import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { motion } from 'motion/react';
import type { PianoRollEditorModel } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';
import { useVelocityPanel } from '@/features/piano-roll/hooks/velocity/useVelocityPanel';
import { useVelocityNotes } from '@/features/piano-roll/hooks/velocity/useVelocityNotes';
import { useVelocityWindow } from '@/features/piano-roll/hooks/velocity/useVelocityWindow';
import { useVelocityMountQueue } from '@/features/piano-roll/hooks/velocity/useVelocityMountQueue';
import { VelocityLaneHandle } from './VelocityLaneHandle';
import { VelocityNoteSlider } from './VelocityNoteSlider';

const SCALE_MARKS = [127, 96, 64, 32, 0];

export function VelocityLane({
    editor,
    workspaceRef,
}: {
    editor: PianoRollEditorModel;
    workspaceRef: RefObject<HTMLDivElement | null>;
}) {
    const panel = useVelocityPanel(
        workspaceRef,
        editor.interactions.gestureModeRef,
    );
    const [contentOpen, setContentOpen] = useState(panel.open);
    if (panel.open && !contentOpen) setContentOpen(true);
    const notes = useVelocityNotes(editor);
    const { finish } = notes;
    const { handleRef } = panel;
    const bodyRef = useRef<HTMLDivElement>(null);
    const focusWithinRef = useRef(false);
    const bodyId = useId(),
        instructionsId = useId();
    const reducedMotion = usePrefersReducedMotion();
    const {
        visible: candidates,
        register,
        elementsRef,
    } = useVelocityWindow(editor, contentOpen, bodyRef);
    const { visible, busy } = useVelocityMountQueue(
        candidates,
        contentOpen,
        notes.activeId,
        !panel.open,
    );
    const { pendingFocusRef, activeNote, activeId } = notes;
    const entryId = visible.some((note) => note.id === activeId)
        ? activeId
        : visible[0]?.id;
    useEffect(() => {
        const id = pendingFocusRef.current;
        if (!id) return;
        const frame = requestAnimationFrame(() => {
            if (pendingFocusRef.current !== id) return;
            const thumb = elementsRef.current
                .get(id)
                ?.querySelector<HTMLElement>('[role="slider"]');
            if (!thumb) return;
            thumb.focus({ preventScroll: true });
            if (document.activeElement === thumb)
                pendingFocusRef.current = null;
        });
        return () => cancelAnimationFrame(frame);
    }, [activeId, visible, pendingFocusRef, elementsRef]);
    useEffect(() => {
        if (panel.open) return;
        finish(true);
        if (
            bodyRef.current?.contains(document.activeElement) ||
            (focusWithinRef.current && document.activeElement === document.body)
        )
            handleRef.current?.focus({ preventScroll: true });
        focusWithinRef.current = false;
    }, [panel.open, finish, handleRef]);
    return (
        <section
            aria-label="Velocity lane"
            className="col-span-2 min-w-0 overflow-hidden bg-background"
        >
            <VelocityLaneHandle panel={panel} bodyId={bodyId} />
            <p aria-live="polite" aria-atomic="true" className="sr-only">
                {busy ? 'Loading note velocity controls.' : ''}
            </p>
            <motion.div
                ref={bodyRef}
                id={bodyId}
                inert={!panel.open}
                aria-hidden={!panel.open}
                aria-busy={busy}
                aria-describedby={instructionsId}
                role="group"
                aria-label="Note velocities"
                tabIndex={visible.length === 0 && activeNote ? 0 : -1}
                className="relative overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                initial={false}
                animate={{
                    height: panel.open ? panel.height : 0,
                    opacity: panel.open ? 1 : 0,
                }}
                transition={{
                    duration: reducedMotion || panel.dragging ? 0 : 0.24,
                    ease: [0.4, 0, 0.2, 1],
                }}
                onAnimationComplete={() => {
                    if (!panel.open) setContentOpen(false);
                }}
                onKeyDownCapture={notes.handleKeyDown}
                onFocusCapture={() => {
                    focusWithinRef.current = true;
                }}
                onBlurCapture={(event) => {
                    if (
                        event.relatedTarget &&
                        !event.currentTarget.contains(event.relatedTarget)
                    )
                        focusWithinRef.current = false;
                }}
            >
                <div
                    className="absolute inset-x-0 bottom-0 grid min-w-0 grid-cols-[var(--pitch-key-width)_minmax(0,1fr)]"
                    style={{ height: panel.contentHeight }}
                >
                    <div
                        aria-hidden="true"
                        className="relative border-r border-border bg-secondary text-[10px] leading-none text-muted-foreground"
                    >
                        <div className="absolute inset-x-0 top-3 bottom-0">
                            {SCALE_MARKS.map((value) => (
                                <span
                                    key={value}
                                    data-velocity-scale={value}
                                    className="absolute right-2 tabular-nums"
                                    style={{
                                        top: `${(1 - value / 127) * 100}%`,
                                        transform: `translateY(${value === 127 ? 0 : value === 0 ? -100 : -50}%)`,
                                    }}
                                >
                                    {value}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="relative min-w-0 overflow-hidden bg-secondary">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-3 bottom-0"
                        >
                            {SCALE_MARKS.map((value) => (
                                <div
                                    key={value}
                                    data-velocity-guide={value}
                                    className="absolute inset-x-0 border-t border-border"
                                    style={{
                                        bottom: `${(value / 127) * 100}%`,
                                    }}
                                />
                            ))}
                        </div>
                        {visible.map((note) => (
                            <VelocityNoteSlider
                                key={note.id}
                                note={note}
                                tabIndex={note.id === entryId ? 0 : -1}
                                register={register}
                                begin={notes.begin}
                                preview={notes.preview}
                                finish={notes.finish}
                                commit={notes.commit}
                                focusNote={notes.focusNote}
                                previewRef={notes.previewRef}
                            />
                        ))}
                    </div>
                </div>
                <p id={instructionsId} className="sr-only">
                    Left and Right choose a note. Up and Down change velocity by
                    one; Home sets zero and End sets 127. The lane preserves
                    note selection. Each slider edits only its own note.
                </p>
            </motion.div>
        </section>
    );
}
