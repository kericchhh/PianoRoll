import { expect, test, type Page } from '@playwright/test';
import type { Note } from '@/features/piano-roll/types';

const note: Note = {
    id: 'cursor-note',
    pitch: 72,
    startTick: 120,
    durationTicks: 240,
    velocity: 100,
    selected: false,
};
const grid = (page: Page) =>
    page.getByRole('img', {
        name: 'Time grid preview',
        exact: true,
        includeHidden: true,
    });
async function seed(page: Page, notes: Note[]) {
    await page.evaluate(async (input) => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        useNoteStore.setState({
            notes: Object.fromEntries(input.map((item) => [item.id, item])),
            undoStack: [],
            redoStack: [],
        });
    }, notes);
}
async function state(page: Page) {
    return page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        const { notes, undoStack } = useNoteStore.getState();
        return { notes, undoCount: undoStack.length };
    });
}
async function move(page: Page, x: number, y = 10) {
    const point = await grid(page).evaluate(
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
    await page.mouse.move(point.x, point.y);
}
async function cursor(page: Page, expected: string) {
    await expect(grid(page)).toHaveCSS('cursor', expected);
}
test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect
        .poll(() =>
            grid(page).evaluate((element) => {
                const canvas = element as HTMLCanvasElement;
                return (
                    Number(canvas.dataset.logicalWidth) ===
                    Math.floor(
                        canvas.parentElement!.getBoundingClientRect().width,
                    )
                );
            }),
        )
        .toBe(true);
    await seed(page, [note]);
});

test('note body, endpoint and empty hover cursors match on canvas and selected overlay', async ({
    page,
}) => {
    await move(page, 100);
    await cursor(page, 'move');
    await move(page, 175);
    await cursor(page, 'ew-resize');
    await move(page, 300);
    await cursor(page, 'crosshair');
    expect(await state(page)).toEqual({
        notes: { [note.id]: note },
        undoCount: 0,
    });
    await seed(page, [{ ...note, selected: true }]);
    const overlay = page.getByRole('group', {
        name: /Selected note: pitch 72/,
    });
    await expect(overlay).toBeVisible();
    await move(page, 100);
    await cursor(page, 'move');
    await expect(overlay).toHaveCSS('cursor', 'move');
    await move(page, 175);
    await cursor(page, 'ew-resize');
    await expect(overlay).toHaveCSS('cursor', 'ew-resize');
    await page.mouse.move(0, 0);
    await cursor(page, 'default');
});

test('stationary modifier changes advertise panning and note selection without editing', async ({
    page,
}) => {
    await move(page, 175);
    await cursor(page, 'ew-resize');
    await page.keyboard.down('Shift');
    await cursor(page, 'grab');
    await page.keyboard.up('Shift');
    await cursor(page, 'ew-resize');
    for (const modifier of ['Control', 'Meta']) {
        await page.keyboard.down(modifier);
        await cursor(page, 'pointer');
        await move(page, 300);
        await cursor(page, 'crosshair');
        await move(page, 100);
        await cursor(page, 'pointer');
        await page.keyboard.up(modifier);
        await cursor(page, 'move');
        await move(page, 175);
    }
    await page.keyboard.down('Shift');
    await page.keyboard.down('Control');
    await cursor(page, 'grab');
    await page.keyboard.up('Control');
    await page.keyboard.up('Shift');
    expect(await state(page)).toEqual({
        notes: { [note.id]: note },
        undoCount: 0,
    });
});

test('pan retains its cursor and ownership when Shift is released mid-drag', async ({
    page,
}) => {
    await seed(page, [{ ...note, startTick: 960, selected: true }]);
    await move(page, 500);
    await page.keyboard.down('Shift');
    await cursor(page, 'grab');
    await page.mouse.down();
    await cursor(page, 'grabbing');
    await move(page, 400);
    await page.keyboard.up('Shift');
    await cursor(page, 'grabbing');
    await move(page, 300);
    await cursor(page, 'grabbing');
    await page.mouse.up();
    await cursor(page, 'move');
    expect(await state(page)).toEqual({
        notes: { [note.id]: { ...note, startTick: 960, selected: true } },
        undoCount: 0,
    });
});

for (const mode of ['move', 'resize'] as const) {
    test(`active ${mode} keeps its cursor when Shift is pressed and commits one matching edit`, async ({
        page,
    }) => {
        await seed(page, [{ ...note, selected: true }]);
        const initialX = mode === 'move' ? 100 : 175;
        const expected = mode === 'move' ? 'move' : 'ew-resize';
        await move(page, initialX);
        await page.mouse.down();
        await page.keyboard.down('Shift');
        await cursor(page, expected);
        await move(page, initialX + 60);
        await cursor(page, expected);
        expect((await state(page)).undoCount).toBe(0);
        await page.mouse.up();
        await cursor(page, 'grab');
        await page.keyboard.up('Shift');
        await expect.poll(async () => (await state(page)).undoCount).toBe(1);
        expect((await state(page)).notes[note.id]).toEqual({
            ...note,
            selected: true,
            ...(mode === 'move' ? { startTick: 240 } : { durationTicks: 360 }),
        });
    });
}

test('Ctrl selection presses retain pointer and marquee presses retain crosshair across Shift changes', async ({
    page,
}) => {
    await move(page, 100);
    await page.keyboard.down('Control');
    await page.mouse.down();
    await cursor(page, 'pointer');
    await page.keyboard.down('Shift');
    await cursor(page, 'pointer');
    await page.keyboard.up('Shift');
    await page.mouse.up();
    await page.keyboard.up('Control');
    expect((await state(page)).notes[note.id]).toEqual({
        ...note,
        selected: true,
    });
    await move(page, 300);
    await page.keyboard.down('Control');
    await page.mouse.down();
    await page.keyboard.down('Shift');
    await move(page, 150);
    await cursor(page, 'crosshair');
    await page.mouse.up();
    await cursor(page, 'grab');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    expect((await state(page)).undoCount).toBe(0);
    expect((await state(page)).notes[note.id]).toMatchObject({
        startTick: 120,
        durationTicks: 240,
    });
});

test('cancel and window blur clear pressed cursor state without committing preview changes', async ({
    page,
}) => {
    await move(page, 175);
    await page.mouse.down();
    await move(page, 235);
    await cursor(page, 'ew-resize');
    await grid(page).dispatchEvent('pointercancel', {
        pointerId: 1,
        pointerType: 'mouse',
        bubbles: true,
    });
    await cursor(page, 'default');
    await page.mouse.up();
    expect((await state(page)).notes[note.id]).toMatchObject({
        startTick: 120,
        durationTicks: 240,
    });
    expect((await state(page)).undoCount).toBe(0);
    await move(page, 100);
    await cursor(page, 'move');
    await page.keyboard.down('Shift');
    await cursor(page, 'grab');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await cursor(page, 'default');
    await page.keyboard.up('Shift');
});

test('clipped endpoints remain move targets and cursor refreshes when note data changes under a stationary pointer', async ({
    page,
}) => {
    const width = await grid(page).evaluate((element) =>
        Number((element as HTMLCanvasElement).dataset.logicalWidth),
    );
    await seed(page, [
        { ...note, startTick: 0, durationTicks: Math.ceil(width * 2) + 120 },
    ]);
    await move(page, width - 3);
    await cursor(page, 'move');
    await move(page, 100);
    await seed(page, []);
    await cursor(page, 'crosshair');
    await seed(page, [note]);
    await cursor(page, 'move');
    await seed(page, [{ ...note, durationTicks: 84 }]);
    await cursor(page, 'ew-resize');
    expect((await state(page)).undoCount).toBe(0);
});

test('scaled canvas and zoom preserve the six CSS pixel resize target', async ({
    page,
}) => {
    await seed(page, [{ ...note, durationTicks: 120 }]);
    await grid(page).evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        canvas.style.width = `${Number(canvas.dataset.logicalWidth) / 2}px`;
        canvas.style.height = `${Number(canvas.dataset.logicalHeight) / 2}px`;
    });
    await move(page, 110);
    await cursor(page, 'ew-resize');
    await move(page, 106);
    await cursor(page, 'move');
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    await cursor(page, 'move');
    expect((await state(page)).undoCount).toBe(0);
});

test('minimum zoom reserves the first half of a narrow selected note for movement', async ({
    page,
}) => {
    await seed(page, [{ ...note, durationTicks: 120, selected: true }]);
    const overlay = page.getByRole('group', {
        name: /Selected note: pitch 72/,
    });
    await move(page, 100);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 10000);
    await page.keyboard.up('Control');
    await expect
        .poll(async () => (await overlay.boundingBox())?.width ?? Infinity)
        .toBeLessThan(12);
    const bounds = await overlay.boundingBox();
    if (!bounds) throw new Error('Selected note is not visible');
    await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + 10);
    await cursor(page, 'move');
    await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + 10);
    await cursor(page, 'ew-resize');
    expect((await state(page)).notes[note.id]).toEqual({
        ...note,
        durationTicks: 120,
        selected: true,
    });
    expect((await state(page)).undoCount).toBe(0);
});

test('opening the context menu clears the grid action cursor and hover restores it after dismissal', async ({
    page,
}) => {
    await move(page, 100);
    await cursor(page, 'move');
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await cursor(page, 'default');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await move(page, 110);
    await cursor(page, 'move');
});
