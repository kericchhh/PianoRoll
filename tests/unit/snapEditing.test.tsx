import { afterEach, beforeEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useNoteActions } from '@/features/piano-roll/hooks/notes/useNoteActions';
import { useSelectionEdits } from '@/features/piano-roll/hooks/notes/useSelectionEdits';
import { useNoteKeyboard } from '@/features/piano-roll/hooks/notes/useNoteKeyboard';
import { SelectionEditControls } from '@/features/piano-roll/components/notes/SelectionEditControls';
import { NoteInsertionForm } from '@/features/piano-roll/components/notes/NoteInsertionForm';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { SnapTicks } from '@/features/piano-roll/constants/music';
import type { Note } from '@/features/piano-roll/types';

const note: Note = {
    id: 'a',
    pitch: 72,
    startTick: 480,
    durationTicks: 240,
    velocity: 90,
    selected: true,
};
const other: Note = {
    ...note,
    id: 'b',
    pitch: 70,
    startTick: 1003,
    durationTicks: 120,
};
function Harness({ snapTicks }: { snapTicks: SnapTicks }) {
    const actions = useNoteActions(7680, undefined, snapTicks);
    const gestureModeRef = { current: 'idle' as const };
    const edits = useSelectionEdits({
        endTick: 7680,
        gestureModeRef,
        commitMove: actions.commitMove,
        commitResize: actions.commitResize,
    });
    const onKeyDown = useNoteKeyboard({
        ...edits,
        gestureModeRef,
        snapTicks,
        deleteNotes: actions.deleteNotes,
        copyNotes: actions.copyNotes,
        pasteNotes: actions.pasteNotes,
        undo: () => {},
        redo: () => {},
    });
    return (
        <div role="group" aria-label="Snap editing" onKeyDown={onKeyDown}>
            <SelectionEditControls
                {...edits}
                hasSelection
                snapTicks={snapTicks}
            />
            <NoteInsertionForm
                endTick={7680}
                onAdd={actions.addNote}
                snapTicks={snapTicks}
            />
            <p role="status">{actions.announcement.text}</p>
        </div>
    );
}
beforeEach(() =>
    useNoteStore.setState({
        ...useNoteStore.getInitialState(),
        notes: { a: note, b: other },
    }),
);
afterEach(cleanup);

for (const snapTicks of [120, 240, 480] as const) {
    test(`keyboard movement and resizing use ${snapTicks} ticks while pitch stays semitone-based`, () => {
        render(<Harness snapTicks={snapTicks} />);
        const editor = screen.getByRole('group', { name: 'Snap editing' });
        fireEvent.keyDown(editor, { key: 'ArrowRight' });
        expect(useNoteStore.getState().notes.a.startTick).toBe(480 + snapTicks);
        expect(useNoteStore.getState().notes.b.startTick).toBe(
            1003 + snapTicks,
        );
        fireEvent.keyDown(editor, { key: 'ArrowRight', shiftKey: true });
        expect(useNoteStore.getState().notes.a.durationTicks).toBe(
            240 + snapTicks,
        );
        expect(useNoteStore.getState().notes.b.durationTicks).toBe(
            120 + snapTicks,
        );
        fireEvent.keyDown(editor, { key: 'ArrowUp' });
        expect(useNoteStore.getState().notes.a.pitch).toBe(73);
        expect(useNoteStore.getState().notes.b.pitch).toBe(71);
        expect(useNoteStore.getState().undoStack).toHaveLength(3);
    });
    test(`pointer buttons use ${snapTicks} ticks and retain their keyboard focus`, () => {
        render(<Harness snapTicks={snapTicks} />);
        const later = screen.getByRole('button', { name: 'Move later' });
        later.focus();
        fireEvent.click(later);
        expect(document.activeElement).toBe(later);
        expect(useNoteStore.getState().notes.a.startTick).toBe(480 + snapTicks);
        fireEvent.click(screen.getByRole('button', { name: 'Lengthen notes' }));
        expect(useNoteStore.getState().notes.a.durationTicks).toBe(
            240 + snapTicks,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Move earlier' }));
        fireEvent.click(screen.getByRole('button', { name: 'Shorten notes' }));
        expect(useNoteStore.getState().notes).toEqual({ a: note, b: other });
        expect(useNoteStore.getState().undoStack).toHaveLength(4);
    });
    test(`new notes use ${snapTicks}-tick duration and insertion bounds`, () => {
        render(<Harness snapTicks={snapTicks} />);
        const tick = screen.getByRole('spinbutton', { name: 'Start tick' });
        expect(tick.getAttribute('step')).toBe(String(snapTicks));
        expect(tick.getAttribute('max')).toBe(String(7680 - snapTicks));
        fireEvent.change(tick, { target: { value: String(7680 - snapTicks) } });
        fireEvent.submit(screen.getByRole('form', { name: 'Add a note' }));
        const added = Object.values(useNoteStore.getState().notes).find(
            (entry) => entry.id !== 'a' && entry.id !== 'b',
        );
        expect(added).toMatchObject({
            startTick: 7680 - snapTicks,
            durationTicks: snapTicks,
            selected: true,
        });
        expect(useNoteStore.getState().undoStack).toHaveLength(1);
    });
    test(`coarse ${snapTicks}-tick snapping preserves the 120-tick resize minimum`, () => {
        useNoteStore.setState({
            notes: { a: { ...note, durationTicks: 120 } },
        });
        render(<Harness snapTicks={snapTicks} />);
        const editor = screen.getByRole('group', { name: 'Snap editing' });
        fireEvent.keyDown(editor, { key: 'ArrowLeft', shiftKey: true });
        expect(useNoteStore.getState().notes.a.durationTicks).toBe(120);
        expect(useNoteStore.getState().undoStack).toHaveLength(0);
        fireEvent.keyDown(editor, { key: 'ArrowRight', shiftKey: true });
        expect(useNoteStore.getState().notes.a.durationTicks).toBe(
            120 + snapTicks,
        );
    });
}

test('a snap change applies to the next paste while copied internal timing remains exact', () => {
    const { rerender } = render(<Harness snapTicks={120} />);
    const editor = screen.getByRole('group', { name: 'Snap editing' });
    fireEvent.keyDown(editor, { key: 'c', ctrlKey: true });
    const before = useNoteStore.getState();
    rerender(<Harness snapTicks={480} />);
    expect(useNoteStore.getState()).toBe(before);
    fireEvent.keyDown(editor, { key: 'v', ctrlKey: true });
    const pasted = Object.values(useNoteStore.getState().notes).filter(
        (entry) => entry.selected,
    );
    expect(pasted.map((entry) => entry.startTick)).toEqual([1440, 1963]);
    expect(pasted.map((entry) => entry.durationTicks)).toEqual([240, 120]);
    expect(useNoteStore.getState().undoStack).toHaveLength(1);
});
