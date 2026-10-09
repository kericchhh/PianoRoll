import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
    act,
    cleanup,
    createEvent,
    fireEvent,
    render,
    renderHook,
    screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PianoRollEditor } from '@/features/piano-roll/components/editor/PianoRollEditor';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { useNoteKeyboard } from '@/features/piano-roll/hooks/notes/useNoteKeyboard';
import { useNoteHistory } from '@/features/piano-roll/hooks/notes/useNoteHistory';
import type { GestureMode, Note } from '@/features/piano-roll/types';

const source: Note[] = [
    {
        id: 'a',
        pitch: 72,
        startTick: 120,
        durationTicks: 240,
        velocity: 80,
        selected: true,
    },
    {
        id: 'b',
        pitch: 70,
        startTick: 480,
        durationTicks: 240,
        velocity: 100,
        selected: true,
    },
];

function editor() {
    return screen.getByRole('group', { name: 'Piano roll editor' });
}

function shortcut(redo = false, target = editor(), modifier = 'ctrlKey') {
    fireEvent.keyDown(target, {
        key: redo ? 'Z' : 'z',
        [modifier]: true,
        shiftKey: redo,
    });
}

function notes() {
    return useNoteStore.getState().notes;
}

beforeEach(() => {
    useNoteStore.setState(useNoteStore.getInitialState());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

test.each(['ctrlKey', 'metaKey'])(
    '%s undoes and redoes form insertion with selection and availability feedback',
    (modifier) => {
        render(<PianoRollEditor />);
        const undo = screen.getByRole('button', { name: 'Undo' });
        const redo = screen.getByRole('button', { name: 'Redo' });
        expect(undo.getAttribute('aria-disabled')).toBe('true');
        expect(redo.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
        const added = notes();
        expect(Object.values(added)[0].selected).toBe(true);
        expect(useNoteStore.getState().undoStack).toHaveLength(1);
        expect(undo.getAttribute('aria-disabled')).toBe('false');
        editor().focus();
        shortcut(false, editor(), modifier);
        expect(notes()).toEqual({});
        expect(document.activeElement).toBe(editor());
        expect(screen.getByRole('status').textContent).toBe(
            'Undid addition of 1 note',
        );
        expect(redo.getAttribute('aria-disabled')).toBe('false');
        shortcut(true, editor(), modifier);
        expect(notes()).toEqual(added);
        expect(screen.getByRole('status').textContent).toBe(
            'Redid addition of 1 note',
        );
        expect(redo.getAttribute('aria-disabled')).toBe('true');
    },
);

test('keyboard group edits each undo once and reveal the restored selection', () => {
    useNoteStore.setState({
        notes: Object.fromEntries(source.map((note) => [note.id, note])),
    });
    render(<PianoRollEditor />);
    const original = notes();
    editor().focus();
    fireEvent.keyDown(editor(), { key: 'ArrowRight' });
    const moved = notes();
    fireEvent.keyDown(editor(), { key: 'ArrowRight', shiftKey: true });
    const resized = notes();
    fireEvent.keyDown(editor(), { key: 'Delete' });
    expect(notes()).toEqual({});
    expect(useNoteStore.getState().undoStack).toHaveLength(3);
    for (const expected of [resized, moved, original]) {
        shortcut();
        expect(notes()).toEqual(expected);
    }
    expect(
        screen.getByRole('group', {
            name: /Selected note: pitch 72, tick 120/,
        }),
    ).toBeDefined();
    expect(screen.getByRole('status').textContent).toBe(
        'Undid move of 2 notes',
    );
    for (const expected of [moved, resized, {}]) {
        shortcut(true);
        expect(notes()).toEqual(expected);
    }
    expect(screen.getByRole('status').textContent).toBe(
        'Redid deletion of 2 notes',
    );
});

test('a surviving note-list button keeps focus when its edit is undone', () => {
    useNoteStore.setState({ notes: { a: source[0] } });
    render(<PianoRollEditor />);
    const button = screen.getByRole('button', { name: /Pitch 72, tick 120/ });
    button.focus();
    fireEvent.keyDown(button, { key: 'ArrowUp' });
    shortcut(false, button);
    expect(notes().a).toEqual(source[0]);
    expect(document.activeElement).toBe(button);
});

test.each(['list', 'overlay'])(
    'undoing a paste from its %s returns focus to the grid and restores source selection',
    (kind) => {
        useNoteStore.setState({
            notes: Object.fromEntries(source.map((note) => [note.id, note])),
        });
        render(<PianoRollEditor />);
        fireEvent.keyDown(editor(), { key: 'c', ctrlKey: true });
        fireEvent.keyDown(editor(), { key: 'v', ctrlKey: true });
        const pasted = notes();
        const target =
            kind === 'list'
                ? screen.getByRole('button', { name: /Pitch 72, tick 720/ })
                : screen.getByRole('group', {
                      name: /Selected note: pitch 72, tick 720/,
                  });
        target.focus();
        shortcut(false, target);
        expect(notes()).toEqual(
            Object.fromEntries(source.map((note) => [note.id, note])),
        );
        expect(document.activeElement).toBe(editor());
        shortcut(true);
        expect(notes()).toEqual(pasted);
        expect(screen.getByRole('status').textContent).toBe(
            'Redid paste of 2 notes',
        );
    },
);

test('redoing deletion from a restored note-list button keeps usable grid focus', () => {
    useNoteStore.setState({ notes: { a: source[0] } });
    render(<PianoRollEditor />);
    fireEvent.keyDown(editor(), { key: 'Delete' });
    shortcut();
    const button = screen.getByRole('button', { name: /Pitch 72, tick 120/ });
    button.focus();
    shortcut(true, button);
    expect(notes()).toEqual({});
    expect(document.activeElement).toBe(editor());
});

test('toolbar Enter/Space and undo/redo shortcuts share actions and preserve button focus', async () => {
    const onTogglePlayback = vi.fn();
    const user = userEvent.setup();
    render(<PianoRollEditor onTogglePlayback={onTogglePlayback} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    const added = notes();
    const undo = screen.getByRole('button', { name: 'Undo' });
    undo.focus();
    await user.keyboard(' ');
    expect(notes()).toEqual({});
    expect(document.activeElement).toBe(undo);
    expect(undo.getAttribute('aria-disabled')).toBe('true');
    shortcut(true, undo);
    expect(notes()).toEqual(added);
    const redo = screen.getByRole('button', { name: 'Redo' });
    fireEvent.click(undo);
    redo.focus();
    await user.keyboard('{Enter}');
    expect(notes()).toEqual(added);
    expect(document.activeElement).toBe(redo);
    expect(onTogglePlayback).not.toHaveBeenCalled();
    const before = useNoteStore.getState();
    fireEvent.click(redo); // Unavailable controls cannot mutate or announce.
    expect(useNoteStore.getState()).toBe(before);
});

test.each(['input', 'textarea', 'select', 'editable', 'menu'])(
    'undo/redo in %s preserves native behavior',
    (kind) => {
        render(<PianoRollEditor />);
        fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
        const target = document.createElement(
            ['editable', 'menu'].includes(kind) ? 'div' : kind,
        );
        if (kind === 'editable') target.setAttribute('contenteditable', 'true');
        if (kind === 'menu') target.setAttribute('role', 'menu');
        editor().append(target);
        const before = useNoteStore.getState();
        for (const shiftKey of [false, true]) {
            const event = createEvent.keyDown(target, {
                key: 'z',
                ctrlKey: true,
                shiftKey,
            });
            fireEvent(target, event);
            expect(event.defaultPrevented).toBe(false);
        }
        expect(useNoteStore.getState()).toBe(before);
        target.remove();
    },
);

test('handled, modified, unmodified and repeated keys do not replay history', () => {
    render(<PianoRollEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    const before = useNoteStore.getState();
    const repeated = createEvent.keyDown(editor(), {
        key: 'z',
        ctrlKey: true,
        repeat: true,
    });
    fireEvent(editor(), repeated);
    expect(repeated.defaultPrevented).toBe(true);
    fireEvent.keyDown(editor(), { key: 'z', ctrlKey: true, altKey: true });
    fireEvent.keyDown(editor(), { key: 'z' });
    const handled = createEvent.keyDown(editor(), { key: 'z', metaKey: true });
    handled.preventDefault();
    fireEvent(editor(), handled);
    expect(useNoteStore.getState()).toBe(before);
});

test('empty history gives repeatable live-region feedback without changing the store', () => {
    render(<PianoRollEditor />);
    const before = useNoteStore.getState();
    shortcut();
    const first = screen.getByRole('status').firstChild;
    expect(screen.getByRole('status').textContent).toBe('Nothing to undo');
    shortcut();
    expect(screen.getByRole('status').firstChild).not.toBe(first);
    shortcut(true);
    expect(screen.getByRole('status').textContent).toBe('Nothing to redo');
    expect(useNoteStore.getState()).toBe(before);
});

test.each<GestureMode>(['move', 'resize', 'pan', 'marquee', 'select'])(
    'shortcuts and toolbar actions wait for an active %s gesture',
    (mode) => {
        const undo = vi.fn();
        const redo = vi.fn();
        function Harness() {
            const onKeyDown = useNoteKeyboard({
                endTick: 15360,
                gestureModeRef: { current: mode },
                commitMove: vi.fn(),
                commitResize: vi.fn(),
                deleteNotes: vi.fn(),
                copyNotes: vi.fn(),
                pasteNotes: vi.fn(),
                undo,
                redo,
            });
            return (
                <div
                    role="group"
                    aria-label="History harness"
                    onKeyDown={onKeyDown}
                />
            );
        }
        render(<Harness />);
        const target = screen.getByRole('group', { name: 'History harness' });
        shortcut(false, target);
        shortcut(true, target);
        expect(undo).not.toHaveBeenCalled();
        expect(redo).not.toHaveBeenCalled();
        act(() => useNoteStore.getState().addNote(source[0]));
        const before = useNoteStore.getState();
        const hook = renderHook(() =>
            useNoteHistory({
                gestureModeRef: { current: mode },
                activeNoteId: null,
                onActivate: vi.fn(),
                announce: vi.fn(),
            }),
        );
        act(() => {
            hook.result.current.undo();
            hook.result.current.redo();
        });
        expect(useNoteStore.getState()).toBe(before);
    },
);
