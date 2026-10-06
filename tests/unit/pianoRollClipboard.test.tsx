// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
    act,
    cleanup,
    createEvent,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { useNoteKeyboard } from '@/features/piano-roll/hooks/useNoteKeyboard';
import type { GestureMode, Note } from '@/features/piano-roll/types';

const source: Note[] = [
    {
        id: 'a',
        pitch: 72,
        startTick: 120,
        durationTicks: 240,
        velocity: 70,
        selected: true,
    },
    {
        id: 'b',
        pitch: 70,
        startTick: 480,
        durationTicks: 240,
        velocity: 127,
        selected: true,
    },
];

function notes() {
    return Object.values(useNoteStore.getState().notes);
}

function selected() {
    return notes().filter((note) => note.selected);
}

function editor() {
    return screen.getByRole('group', {
        name: 'Piano roll editor',
    });
}

function shortcut(
    key: string,
    target: HTMLElement = editor(),
    modifier = 'ctrlKey',
) {
    fireEvent.keyDown(target, { key, [modifier]: true });
}

beforeEach(() => {
    useNoteStore.setState({
        notes: Object.fromEntries(source.map((note) => [note.id, { ...note }])),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => null,
    );
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

test.each(['ctrlKey', 'metaKey'])(
    '%s copies and pastes a selected group with new identities in one update',
    (modifier) => {
        render(<PianoRollCanvas />);
        editor().focus();
        const before = useNoteStore.getState().notes;
        shortcut('c', editor(), modifier);
        expect(screen.getByRole('status').textContent).toBe('Copied 2 notes');
        expect(useNoteStore.getState().notes).toBe(before);
        const updates = vi.fn();
        const unsubscribe = useNoteStore.subscribe(updates);

        shortcut('v', editor(), modifier);
        unsubscribe();

        expect(updates).toHaveBeenCalledTimes(1);
        expect(selected()).toEqual([
            { ...source[0], id: expect.any(String), startTick: 720 },
            { ...source[1], id: expect.any(String), startTick: 1080 },
        ]);
        expect(new Set(notes().map((note) => note.id)).size).toBe(4);
        expect(useNoteStore.getState().notes.a).toEqual({
            ...source[0],
            selected: false,
        });
        expect(useNoteStore.getState().notes.b).toEqual({
            ...source[1],
            selected: false,
        });
        expect(before.a.selected).toBe(true);
        expect(screen.getByRole('status').textContent).toBe(
            'Pasted 2 notes at tick 720',
        );
        expect(
            screen.getByRole('group', {
                name: /Selected note: pitch 72, tick 720/,
            }),
        ).toBeDefined();
        expect(document.activeElement).toBe(editor());
    },
);

test('repeated paste follows the current selection, including after keyboard movement', () => {
    render(<PianoRollCanvas />);
    shortcut('c');
    shortcut('v');
    fireEvent.keyDown(editor(), { key: 'ArrowRight' });
    shortcut('v');
    expect(selected().map((note) => note.startTick)).toEqual([1440, 1800]);
    expect(notes()).toHaveLength(6);
});

test('paste keeps its copied data after editing and deleting the source and advances after deleted pastes', () => {
    render(<PianoRollCanvas />);
    shortcut('c');
    act(() => useNoteStore.getState().moveNote('a', 240, 71));
    fireEvent.keyDown(editor(), { key: 'Delete' });
    shortcut('v');
    expect(
        selected().map(({ pitch, startTick, durationTicks, velocity }) => ({
            pitch,
            startTick,
            durationTicks,
            velocity,
        })),
    ).toEqual([
        { pitch: 72, startTick: 720, durationTicks: 240, velocity: 70 },
        { pitch: 70, startTick: 1080, durationTicks: 240, velocity: 127 },
    ]);
    fireEvent.keyDown(editor(), { key: 'Delete' });
    shortcut('v');
    expect(selected().map((note) => note.startTick)).toEqual([1320, 1680]);
});

test('copying no selection announces feedback and retains the previous clipboard', () => {
    render(<PianoRollCanvas />);
    shortcut('c');
    act(() => useNoteStore.getState().selectNotes([]));
    shortcut('c');
    expect(screen.getByRole('status').textContent).toBe('Select notes to copy');
    shortcut('v');
    expect(selected().map((note) => note.startTick)).toEqual([720, 1080]);
});

test('an empty clipboard is announced without changing the store', () => {
    render(<PianoRollCanvas />);
    const before = useNoteStore.getState();
    shortcut('v');
    expect(screen.getByRole('status').textContent).toBe(
        'No copied notes to paste',
    );
    expect(useNoteStore.getState()).toBe(before);
});

test('clipboard data stays inside the mounted editor', () => {
    const first = render(<PianoRollCanvas />);
    shortcut('c');
    first.unmount();
    render(<PianoRollCanvas />);
    shortcut('v');
    expect(notes()).toHaveLength(2);
    expect(screen.getByRole('status').textContent).toBe(
        'No copied notes to paste',
    );
});

test('a rejected paste preserves notes, selection, and copied data for a later valid paste', () => {
    render(<PianoRollCanvas />);
    shortcut('c');
    act(() =>
        useNoteStore.getState().moveNotes([
            { id: 'a', startTick: 15000, pitch: 72 },
            { id: 'b', startTick: 15120, pitch: 70 },
        ]),
    );
    const before = useNoteStore.getState();
    shortcut('v');
    expect(useNoteStore.getState()).toBe(before);
    expect(screen.getByRole('status').textContent).toBe(
        'Cannot paste: copied notes do not fit in the timeline',
    );
    act(() => useNoteStore.getState().selectNotes(['a']));
    act(() => useNoteStore.getState().moveNote('a', 0, 72));
    shortcut('v');
    expect(selected().map((note) => note.startTick)).toEqual([240, 600]);
});

test('copy/paste works from the accessible note list and retains its focus', () => {
    render(<PianoRollCanvas />);
    const button = screen.getByRole('button', { name: /Pitch 72, tick 120,/ });
    button.focus();
    shortcut('c', button);
    shortcut('v', button);
    expect(selected()).toHaveLength(2);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-pressed')).toBe('false');
});

test.each(['input', 'textarea', 'select', 'editable', 'menu'])(
    'native clipboard shortcuts in %s are not intercepted',
    (kind) => {
        render(<PianoRollCanvas />);
        shortcut('c');
        const target = document.createElement(
            ['editable', 'menu'].includes(kind) ? 'div' : kind,
        );
        if (kind === 'editable') target.setAttribute('contenteditable', 'true');
        if (kind === 'menu') target.setAttribute('role', 'menu');
        editor().append(target);
        const before = useNoteStore.getState();
        const event = createEvent.keyDown(target, { key: 'v', ctrlKey: true });
        fireEvent(target, event);
        expect(event.defaultPrevented).toBe(false);
        expect(useNoteStore.getState()).toBe(before);
        target.remove();
    },
);

test('handled, repeated and conflicting modifier shortcuts do not paste', () => {
    render(<PianoRollCanvas />);
    shortcut('c');
    const before = useNoteStore.getState();
    for (const extra of [
        { repeat: true },
        { shiftKey: true },
        { altKey: true },
    ]) {
        fireEvent.keyDown(editor(), { key: 'v', ctrlKey: true, ...extra });
    }
    const handled = createEvent.keyDown(editor(), { key: 'v', ctrlKey: true });
    handled.preventDefault();
    fireEvent(editor(), handled);
    fireEvent.keyDown(editor(), { key: 'v' });
    expect(useNoteStore.getState()).toBe(before);
});

test.each<GestureMode>(['move', 'resize', 'pan', 'marquee', 'select'])(
    'clipboard shortcuts wait until the %s gesture finishes',
    (mode) => {
        const copyNotes = vi.fn();
        const pasteNotes = vi.fn();
        function Harness() {
            const onKeyDown = useNoteKeyboard({
                endTick: 15360,
                gestureModeRef: { current: mode },
                commitMove: vi.fn(),
                commitResize: vi.fn(),
                deleteNotes: vi.fn(),
                copyNotes,
                pasteNotes,
            });
            return (
                <div
                    role="group"
                    aria-label="Keyboard harness"
                    onKeyDown={onKeyDown}
                />
            );
        }
        render(<Harness />);
        const target = screen.getByRole('group', { name: 'Keyboard harness' });
        shortcut('c', target);
        shortcut('v', target);
        expect(copyNotes).not.toHaveBeenCalled();
        expect(pasteNotes).not.toHaveBeenCalled();
    },
);
