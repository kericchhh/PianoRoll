import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Slider } from '@/shared/components/ui/slider';
import type { Note } from '@/features/piano-roll/types';
import type { VelocityNotes } from '@/features/piano-roll/hooks/velocity/useVelocityNotes';
import { pitchToNoteName } from '@/features/piano-roll/utils/notes/pitchToNoteName';

type Props = Pick<
    VelocityNotes,
    'begin' | 'preview' | 'finish' | 'commit' | 'focusNote' | 'previewRef'
> & {
    note: Note;
    tabIndex: number;
    register: (id: string, node: HTMLDivElement | null) => void;
};

export const VelocityNoteSlider = memo(function VelocityNoteSlider({
    note,
    tabIndex,
    register,
    begin,
    preview,
    finish,
    commit,
    focusNote,
    previewRef,
}: Props) {
    const [revision, setRevision] = useState(0);
    const key = `${note.velocity}:${revision}`;
    const [draft, setDraft] = useState({ key, value: note.velocity });
    const value = draft.key === key ? draft.value : note.velocity;
    const pointerRef = useRef(false);
    const resetPreview = useCallback(() => {
        setRevision((previous) => previous + 1);
    }, []);
    const elementRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        register(note.id, elementRef.current);
        return () => register(note.id, null);
    }, [note.id, register]);
    return (
        <div
            ref={elementRef}
            data-note-id={note.id}
            data-velocity-note={note.id}
            className="group/velocity absolute top-3 bottom-0 left-0 hover:z-10 focus-within:z-10"
            title={`${pitchToNoteName(note.pitch)}, tick ${note.startTick}: velocity ${value}`}
        >
            <Slider
                orientation="vertical"
                min={0}
                max={127}
                step={1}
                value={[value]}
                label={`Velocity for ${pitchToNoteName(note.pitch)} at tick ${note.startTick}`}
                className="data-[orientation=vertical]:w-full"
                trackClassName="bg-transparent data-[orientation=vertical]:w-full"
                rangeClassName={note.selected ? 'bg-primary' : 'bg-ring'}
                thumbProps={{
                    tabIndex,
                    onFocus: () => focusNote(note.id),
                    className:
                        'h-2 w-[var(--velocity-bar-width)] border-0 bg-foreground',
                }}
                onPointerDown={(event) => {
                    if (event.button !== 0 || !begin(note.id, resetPreview))
                        event.preventDefault();
                    else pointerRef.current = true;
                }}
                onPointerUp={() => {
                    pointerRef.current = false;
                }}
                onPointerCancel={() => {
                    finish(true);
                }}
                onValueChange={([next]) => {
                    if (pointerRef.current) {
                        if (previewRef.current?.id !== note.id) return;
                        setDraft({ key, value: next });
                        preview(note.id, next);
                    } else commit(note.id, next);
                }}
                onValueCommit={() => finish()}
            />
            <span
                aria-hidden="true"
                data-velocity-value
                className="pointer-events-none absolute z-10 hidden w-7 bg-popover px-1 text-center text-[10px] text-foreground tabular-nums group-hover/velocity:block group-focus-within/velocity:block"
                style={{
                    left: 'var(--velocity-label-offset, 0px)',
                    top: `${(1 - value / 127) * 100}%`,
                    transform: `translateY(${value === 127 ? 0 : value === 0 ? -100 : -50}%)`,
                }}
            >
                {value}
            </span>
        </div>
    );
});
