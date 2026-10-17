import { expect, test, type Page } from '@playwright/test';
import type { Note } from '@/features/piano-roll/types';

async function state(page: Page) {
    return page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        const { notes, undoStack, redoStack } = useNoteStore.getState();
        return { notes, undoStack, redoStack };
    });
}
async function seed(page: Page, notes: Note[]) {
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
    }, notes);
}
async function snap(page: Page, label: string) {
    await page.getByRole('combobox', { name: 'Snap', exact: true }).click();
    await page.getByRole('option', { name: label, exact: true }).click();
}

for (const [label, ticks] of [
    ['1/4', 480],
    ['1/8', 240],
    ['1/16', 120],
] as const) {
    test(`${label} snap reaches drawing, keyboard, edit buttons, pointer move/resize and paste`, async ({
        page,
    }) => {
        await page.goto('/');
        const before = await state(page);
        await snap(page, label);
        expect(await state(page)).toEqual(before);
        const grid = page.getByRole('img', { name: 'Time grid preview' });
        await grid.click({ position: { x: ticks * 0.5 * 0.75, y: 10 } });
        await expect
            .poll(async () => Object.keys((await state(page)).notes).length)
            .toBe(1);
        const note = Object.values((await state(page)).notes)[0];
        expect(note).toMatchObject({
            startTick: 0,
            durationTicks: ticks,
            selected: false,
        });
        await grid.click({ position: { x: 10, y: 10 } });
        const editor = page.getByRole('group', {
            name: 'Piano roll editor',
            exact: true,
        });
        await editor.focus();
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Shift+ArrowRight');
        expect((await state(page)).notes[note.id]).toMatchObject({
            startTick: ticks,
            durationTicks: ticks * 2,
        });
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Shift+ArrowLeft');
        await page
            .getByRole('button', { name: 'Editor controls', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Move later', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Lengthen notes', exact: true })
            .click();
        expect((await state(page)).notes[note.id]).toMatchObject({
            startTick: ticks,
            durationTicks: ticks * 2,
        });
        await page.getByRole('button', { name: 'Undo', exact: true }).click();
        await page.getByRole('button', { name: 'Undo', exact: true }).click();
        const bounds = await grid.boundingBox();
        if (!bounds) throw new Error('Grid is missing');
        await page.mouse.move(bounds.x + 10, bounds.y + 10);
        await page.mouse.down();
        await page.mouse.move(bounds.x + 10 + ticks * 0.5, bounds.y + 10, {
            steps: 5,
        });
        await page.mouse.up();
        await expect
            .poll(async () => (await state(page)).notes[note.id].startTick)
            .toBe(ticks);
        const overlay = page.locator('[data-note-overlay]');
        const edge = await overlay.boundingBox();
        if (!edge) throw new Error('Selected note overlay is missing');
        await page.mouse.move(edge.x + edge.width - 2, edge.y + 5);
        await page.mouse.down();
        await page.mouse.move(
            edge.x + edge.width - 2 + ticks * 0.5,
            edge.y + 5,
            { steps: 5 },
        );
        await page.mouse.up();
        await expect
            .poll(async () => (await state(page)).notes[note.id].durationTicks)
            .toBe(ticks * 2);
        await editor.focus();
        await page.keyboard.press('Control+c');
        await page.keyboard.press('Control+v');
        const pasted = Object.values((await state(page)).notes).find(
            (entry) => entry.id !== note.id,
        );
        expect(pasted).toMatchObject({
            startTick: ticks * 3,
            durationTicks: ticks * 2,
            selected: true,
        });
    });
}

const held: Note = {
    id: 'held',
    pitch: 72,
    startTick: 0,
    durationTicks: 50000,
    velocity: 100,
    selected: true,
};

test('BPM commits on Enter and blur, invalid and unchanged drafts keep playback active, and changed tempo stops at zero', async ({
    page,
}) => {
    await page.goto('/');
    await seed(page, [held]);
    const bpm = page.getByRole('spinbutton', { name: 'BPM', exact: true });
    await expect(bpm).toHaveValue('120');
    const original = await state(page);
    await bpm.fill('93');
    await expect(bpm).toHaveValue('93');
    expect(await state(page)).toEqual(original);
    await bpm.press('Enter');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    for (const value of ['', '29', '301', '120.5']) {
        await bpm.fill(value);
        await bpm.press('Enter');
        await expect(bpm).toHaveAttribute('aria-invalid', 'true');
        await expect(page.getByRole('alert')).toHaveText(
            'Enter a whole BPM from 30 to 300.',
        );
        await expect(
            page.getByRole('button', { name: 'Pause', exact: true }),
        ).toBeVisible();
        expect(await state(page)).toEqual(original);
    }
    await bpm.fill('93');
    await bpm.press('Enter');
    await expect(bpm).toHaveAttribute('aria-invalid', 'false');
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await bpm.fill('177');
    await bpm.press('Tab');
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
    await expect
        .poll(async () =>
            Number(
                await page.locator('[data-playhead]').getAttribute('data-tick'),
            ),
        )
        .toBe(0);
    await expect(bpm).toHaveValue('177');
    expect(await state(page)).toEqual(original);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(
        page.getByRole('status', { name: 'Playback status' }),
    ).toHaveText('Playback paused');
    await bpm.fill('120');
    await bpm.press('Enter');
    await expect(
        page.getByRole('status', { name: 'Playback status' }),
    ).toHaveText('Playback stopped');
    await expect
        .poll(async () =>
            Number(
                await page.locator('[data-playhead]').getAttribute('data-tick'),
            ),
        )
        .toBe(0);
    expect(await state(page)).toEqual(original);
});

test('BPM restores with a saved project while snap remains local and resets only on reload', async ({
    page,
}) => {
    await page.goto('/');
    await seed(page, [held]);
    const bpm = page.getByRole('spinbutton', { name: 'BPM', exact: true });
    await bpm.fill('177');
    await bpm.press('Enter');
    await snap(page, '1/4');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Project', exact: true }).click();
    await page
        .getByRole('button', { name: 'Save project', exact: true })
        .click();
    await expect(
        page.getByRole('status').filter({ hasText: /saved/i }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await bpm.fill('93');
    await bpm.press('Enter');
    await snap(page, '1/8');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Project', exact: true }).click();
    await page
        .getByRole('button', { name: 'Load project', exact: true })
        .click();
    await expect(
        page.getByRole('status').filter({ hasText: /loaded/i }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bpm).toHaveValue('177');
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
    await expect
        .poll(async () =>
            Number(
                await page.locator('[data-playhead]').getAttribute('data-tick'),
            ),
        )
        .toBe(0);
    await expect(
        page.getByRole('combobox', { name: 'Snap', exact: true }),
    ).toHaveText('1/8');
    for (const [width, height, name] of [
        [1280, 720, 'desktop'],
        [900, 650, 'compact'],
    ] as const) {
        await page.setViewportSize({ width, height });
        await expect(bpm).toBeVisible();
        await expect(
            page.getByRole('combobox', { name: 'Snap', exact: true }),
        ).toBeVisible();
        await page.evaluate(
            () =>
                new Promise<void>((resolve) =>
                    requestAnimationFrame(() =>
                        requestAnimationFrame(() => resolve()),
                    ),
                ),
        );
        await page.screenshot({
            path: `/tmp/piano-roll-velocity-validation/snap-bpm-${name}.png`,
        });
    }
    await page.reload();
    await expect(bpm).toHaveValue('120');
    await expect(
        page.getByRole('combobox', { name: 'Snap', exact: true }),
    ).toHaveText('1/16');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Project', exact: true }).click();
    await page
        .getByRole('button', { name: 'Load project', exact: true })
        .click();
    await expect(
        page.getByRole('status').filter({ hasText: /loaded/i }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bpm).toHaveValue('177');
    await expect(
        page.getByRole('combobox', { name: 'Snap', exact: true }),
    ).toHaveText('1/16');
});
