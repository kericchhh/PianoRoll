// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

function makeNote(id: string, pitch = 60): Note {
    return {
        id,
        pitch,
        startTick: 120,
        durationTicks: 120,
        velocity: 100,
        selected: false,
    };
}

beforeEach(() => {
    useNoteStore.setState({ notes: {} });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => null,
    );
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

test('Delete removes the selected note but keeps other notes', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('selected'));
    store.addNote(makeNote('other', 61));
    store.selectNote('selected');
    render(<PianoRollCanvas />);

    const editor = screen.getByRole('group', { name: 'Piano roll editor' });
    editor.focus();
    fireEvent.keyDown(editor, { key: 'Delete' });

    expect(useNoteStore.getState().notes.selected).toBeUndefined();
    expect(useNoteStore.getState().notes.other).toBeDefined();
    expect(document.activeElement).toBe(editor);
});

test('Delete does nothing when no note is selected', () => {
    useNoteStore.getState().addNote(makeNote('a'));
    render(<PianoRollCanvas />);

    fireEvent.keyDown(
        screen.getByRole('group', { name: 'Piano roll editor' }),
        {
            key: 'Delete',
        },
    );

    expect(useNoteStore.getState().notes.a).toBeDefined();
});

test('Delete in the timeline select does not remove a note', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.selectNote('a');
    render(<PianoRollCanvas />);

    const timelineSelect = screen.getByRole('combobox', {
        name: /timeline length/i,
    });
    timelineSelect.focus();
    fireEvent.keyDown(timelineSelect, { key: 'Delete' });

    expect(useNoteStore.getState().notes.a).toBeDefined();
});

test('a repeated Delete key event does not remove a note', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.selectNote('a');
    render(<PianoRollCanvas />);

    fireEvent.keyDown(
        screen.getByRole('group', { name: 'Piano roll editor' }),
        {
            key: 'Delete',
            repeat: true,
        },
    );

    expect(useNoteStore.getState().notes.a).toBeDefined();
});

test('clicking the canvas gives the editor keyboard focus', () => {
    render(<PianoRollCanvas />);

    fireEvent.click(screen.getByRole('img', { name: 'Time grid preview' }));

    expect(document.activeElement).toBe(
        screen.getByRole('group', { name: 'Piano roll editor' }),
    );
});

test('deleting a focused note-list button keeps focus inside the editor', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.selectNote('a');
    render(<PianoRollCanvas />);

    const editor = screen.getByRole('group', { name: 'Piano roll editor' });
    const noteButton = screen.getByRole('button', {
        name: /Pitch 60, tick 120/i,
    });
    noteButton.focus();
    fireEvent.keyDown(noteButton, { key: 'Delete' });

    expect(useNoteStore.getState().notes.a).toBeUndefined();
    expect(editor.contains(document.activeElement)).toBe(true);
});

test('deleting a note announces the action', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.selectNote('a');
    render(<PianoRollCanvas />);

    fireEvent.keyDown(
        screen.getByRole('group', { name: 'Piano roll editor' }),
        {
            key: 'Delete',
        },
    );

    expect(screen.getByRole('status').textContent).toMatch(/deleted/i);
});

test('arrow keys move the selected note and announce its new position', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.selectNote('a');
    render(<PianoRollCanvas />);

    const editor = screen.getByRole('group', { name: 'Piano roll editor' });
    editor.focus();
    fireEvent.keyDown(editor, { key: 'ArrowRight', repeat: true });
    fireEvent.keyDown(editor, { key: 'ArrowUp' });

    expect(useNoteStore.getState().notes.a).toMatchObject({
        startTick: 240,
        pitch: 61,
    });
    expect(screen.getByRole('status').textContent).toMatch(
        /moved pitch 60 to 61 at tick 240/i,
    );
});

test('arrow movement works from the focused note-list button', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.selectNote('a');
    render(<PianoRollCanvas />);

    const button = screen.getByRole('button', { name: /Pitch 60, tick 120/i });
    button.focus();
    fireEvent.keyDown(button, { key: 'ArrowDown' });

    expect(useNoteStore.getState().notes.a.pitch).toBe(59);
    expect(document.activeElement).toBe(button);
});

test('arrows stop at timeline and pitch boundaries', () => {
    const store = useNoteStore.getState();
    store.addNote({ ...makeNote('a', 127), startTick: 8 * 4 * 480 - 120 });
    store.selectNote('a');
    render(<PianoRollCanvas />);

    const editor = screen.getByRole('group', { name: 'Piano roll editor' });
    fireEvent.keyDown(editor, { key: 'ArrowRight' });
    fireEvent.keyDown(editor, { key: 'ArrowUp' });

    expect(useNoteStore.getState().notes.a).toMatchObject({
        startTick: 15240,
        pitch: 127,
    });
});

test('modified arrows do not move the selected note', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a'));
    store.selectNote('a');
    render(<PianoRollCanvas />);

    const editor = screen.getByRole('group', { name: 'Piano roll editor' });
    fireEvent.keyDown(editor, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(editor, { key: 'ArrowUp', ctrlKey: true });

    expect(useNoteStore.getState().notes.a).toMatchObject({
        startTick: 120,
        pitch: 60,
    });
});

test('Ctrl/Cmd canvas clicks toggle selection and an ordinary click selects exclusively', () => {
    const store = useNoteStore.getState();
    store.addNote(makeNote('a', 72));
    store.addNote(makeNote('b', 71));
    render(<PianoRollCanvas />);
    const canvas = screen.getByRole('img', { name: 'Time grid preview' });
    Object.defineProperties(canvas, {
        clientWidth: { configurable: true, value: 600 },
        clientHeight: { configurable: true, value: 240 },
    });

    fireEvent.click(canvas, { clientX: 65, clientY: 10 });
    fireEvent.click(canvas, { clientX: 65, clientY: 30, ctrlKey: true });
    expect(useNoteStore.getState().notes.a.selected).toBe(true);
    expect(useNoteStore.getState().notes.b.selected).toBe(true);

    fireEvent.click(canvas, { clientX: 65, clientY: 10, metaKey: true });
    expect(useNoteStore.getState().notes.a.selected).toBe(false);
    expect(useNoteStore.getState().notes.b.selected).toBe(true);
    fireEvent.click(canvas, { clientX: 300, clientY: 60, ctrlKey: true });
    expect(Object.keys(useNoteStore.getState().notes)).toHaveLength(2);

    fireEvent.click(canvas, { clientX: 65, clientY: 10 });
    expect(useNoteStore.getState().notes.a.selected).toBe(true);
    expect(useNoteStore.getState().notes.b.selected).toBe(false);
});

test('note-list buttons toggle a group, which can be moved and deleted from the keyboard', () => {
    const store = useNoteStore.getState();
    store.addNote({ ...makeNote('a'), startTick: 0 });
    store.addNote(makeNote('b', 64));
    store.addNote(makeNote('unselected', 70));
    render(<PianoRollCanvas />);
    const a = screen.getByRole('button', { name: /Pitch 60, tick 0/i });
    const b = screen.getByRole('button', { name: /Pitch 64, tick 120/i });

    fireEvent.click(a);
    fireEvent.click(b);
    expect(a.getAttribute('aria-pressed')).toBe('true');
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe('2 notes selected');

    b.focus();
    fireEvent.keyDown(b, { key: 'ArrowLeft' });
    expect(useNoteStore.getState().notes.a.startTick).toBe(0);
    expect(useNoteStore.getState().notes.b.startTick).toBe(120);
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    fireEvent.keyDown(b, { key: 'ArrowUp' });
    expect(useNoteStore.getState().notes.a).toMatchObject({
        startTick: 120,
        pitch: 61,
    });
    expect(useNoteStore.getState().notes.b).toMatchObject({
        startTick: 240,
        pitch: 65,
    });
    expect(useNoteStore.getState().notes.unselected).toEqual(
        makeNote('unselected', 70),
    );
    expect(document.activeElement).toBe(b);
    expect(screen.getByRole('status').textContent).toBe(
        'Moved 2 notes; pitch 61, tick 120',
    );

    fireEvent.keyDown(b, { key: 'Delete' });
    expect(Object.keys(useNoteStore.getState().notes)).toEqual(['unselected']);
    expect(document.activeElement).toBe(
        screen.getByRole('group', { name: 'Piano roll editor' }),
    );
    expect(screen.getByRole('status').textContent).toBe('Deleted 2 notes');
});
