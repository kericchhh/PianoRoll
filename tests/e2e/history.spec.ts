import { expect, test, type Page } from '@playwright/test';
import type { Note } from '@/features/piano-roll/types';

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

async function read(page: Page) {
    return page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        const { notes, undoStack, redoStack } = useNoteStore.getState();
        return {
            notes,
            undoCount: undoStack.length,
            redoCount: redoStack.length,
        };
    });
}

async function point(page: Page, x: number, y: number) {
    return page.getByRole('img', { name: 'Time grid preview' }).evaluate(
        (element, point) => {
            const canvas = element as HTMLCanvasElement;
            const bounds = canvas.getBoundingClientRect();
            return {
                x:
                    bounds.x +
                    canvas.clientLeft +
                    (point.x * canvas.clientWidth) /
                        Number(canvas.dataset.logicalWidth),
                y:
                    bounds.y +
                    canvas.clientTop +
                    (point.y * canvas.clientHeight) /
                        Number(canvas.dataset.logicalHeight),
            };
        },
        { x, y },
    );
}

test('keyboard history preserves pasted IDs, restores selection and keeps focus when notes disappear', async ({
    page,
}) => {
    await page.goto('/');
    const editor = page.getByRole('group', {
        name: 'Piano roll editor',
        exact: true,
    });
    const undo = page.getByRole('button', { name: 'Undo', exact: true });
    const redo = page.getByRole('button', { name: 'Redo', exact: true });
    await expect(undo).toHaveAttribute('aria-disabled', 'true');
    await expect(redo).toHaveAttribute('aria-disabled', 'true');
    await page.getByRole('button', { name: 'Add note' }).click();
    const added = (await read(page)).notes;
    await editor.focus();
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await read(page)).notes).toEqual({});
    await page.keyboard.press('Control+Shift+Z');
    await expect.poll(async () => (await read(page)).notes).toEqual(added);
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    const pasted = (await read(page)).notes;
    const pastedButton = page.getByRole('button', {
        name: /Selected: Pitch 72, tick 120,/,
    });
    await pastedButton.focus();
    await page.keyboard.press('Meta+z');
    await expect.poll(async () => (await read(page)).notes).toEqual(added);
    await expect(editor).toBeFocused();
    await page.keyboard.press('Meta+Shift+Z');
    await expect.poll(async () => (await read(page)).notes).toEqual(pasted);
    await expect(
        page.getByRole('status', { name: 'Note editing status' }),
    ).toHaveText('Redid paste of 1 note');
    await page.keyboard.press('ArrowRight');
    await expect(redo).toHaveAttribute('aria-disabled', 'true');
    await undo.focus();
    await page.keyboard.press('Space');
    await expect.poll(async () => (await read(page)).notes).toEqual(pasted);
    await expect(undo).toBeFocused();
});

test('pointer movement and resizing each enter history once on release for the whole selected group', async ({
    page,
}) => {
    await page.goto('/');
    await page.evaluate(async (notes) => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        useNoteStore.setState({
            notes: Object.fromEntries(notes.map((note) => [note.id, note])),
            undoStack: [],
            redoStack: [],
        });
    }, source);
    const original = (await read(page)).notes;
    const start = await point(page, 80, 10);
    const end = await point(page, 140, 10);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 });
    expect((await read(page)).undoCount).toBe(0);
    await page.keyboard.press('Control+z'); // Active gestures cannot traverse history.
    expect((await read(page)).notes).toEqual(original);
    await page.mouse.up();
    await expect.poll(async () => (await read(page)).undoCount).toBe(1);
    const moved = (await read(page)).notes;
    expect(moved.a.startTick).toBe(240);
    expect(moved.b.startTick).toBe(600);

    const edge = await point(page, 239, 10);
    const resizedEdge = await point(page, 299, 10);
    await page.mouse.move(edge.x, edge.y);
    await page.mouse.down();
    await page.mouse.move(resizedEdge.x, resizedEdge.y, { steps: 5 });
    expect((await read(page)).undoCount).toBe(1);
    await page.mouse.up();
    await expect.poll(async () => (await read(page)).undoCount).toBe(2);
    const resized = (await read(page)).notes;
    expect(resized.a.durationTicks).toBe(360);
    expect(resized.b.durationTicks).toBe(360);
    const editor = page.getByRole('group', {
        name: 'Piano roll editor',
        exact: true,
    });
    await editor.focus();
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await read(page)).notes).toEqual(moved);
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await read(page)).notes).toEqual(original);
    await page.keyboard.press('Control+Shift+Z');
    await page.keyboard.press('Control+Shift+Z');
    await expect.poll(async () => (await read(page)).notes).toEqual(resized);
});
