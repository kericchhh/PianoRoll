import { expect, test, type Page } from '@playwright/test';
import type { Note } from '@/features/piano-roll/types';
import type { ProjectRecord } from '@/features/piano-roll/persistence/projectRecord';

const source: Note[] = [
    {
        id: 'short-silent-overflow',
        pitch: 127,
        startTick: 70001,
        durationTicks: 1,
        velocity: 0,
        selected: true,
    },
    {
        id: 'regular-note',
        pitch: 60,
        startTick: 7,
        durationTicks: 241,
        velocity: 99,
        selected: true,
    },
];
async function seed(page: Page, notes: Note[]) {
    await page.evaluate(async (input) => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        useNoteStore.setState({
            notes: Object.fromEntries(input.map((note) => [note.id, note])),
            undoStack: [],
            redoStack: [],
        });
    }, notes);
}
async function edits(page: Page) {
    return page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        const { notes, undoStack, redoStack } = useNoteStore.getState();
        return { notes, undoStack, redoStack };
    });
}
async function openProject(page: Page) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Project', exact: true }).click();
    return page.getByRole('tabpanel', { name: 'Project', exact: true });
}
async function storedProjects(page: Page): Promise<ProjectRecord[]> {
    return page.evaluate(
        () =>
            new Promise<ProjectRecord[]>((resolve, reject) => {
                const opening = indexedDB.open('PianoRoll');
                opening.onerror = () => reject(opening.error);
                opening.onsuccess = () => {
                    const database = opening.result;
                    const transaction = database.transaction(
                        'projects',
                        'readonly',
                    );
                    const reading = transaction
                        .objectStore('projects')
                        .getAll();
                    transaction.oncomplete = () => {
                        database.close();
                        resolve(reading.result as ProjectRecord[]);
                    };
                    transaction.onerror = () => {
                        database.close();
                        reject(transaction.error);
                    };
                };
            }),
    );
}
async function corruptSlot(page: Page) {
    await page.evaluate(
        () =>
            new Promise<void>((resolve, reject) => {
                const opening = indexedDB.open('PianoRoll');
                opening.onerror = () => reject(opening.error);
                opening.onsuccess = () => {
                    const database = opening.result;
                    const transaction = database.transaction(
                        'projects',
                        'readwrite',
                    );
                    transaction
                        .objectStore('projects')
                        .put({ id: 'local', version: 99 });
                    transaction.oncomplete = () => {
                        database.close();
                        resolve();
                    };
                    transaction.onerror = () => {
                        database.close();
                        reject(transaction.error);
                    };
                };
            }),
    );
}

async function playheadPosition(page: Page) {
    return page.locator('[data-playhead]').evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        return {
            tick: Number(canvas.dataset.tick),
            x: Number(canvas.dataset.x),
        };
    });
}

async function pan(page: Page, pixels: number) {
    const bounds = await page
        .getByRole('img', { name: 'Time grid preview', exact: true })
        .boundingBox();
    if (!bounds) throw new Error('Grid is not visible');
    const x = bounds.x + bounds.width * 0.75;
    const y = bounds.y + 60;
    await page.keyboard.down('Shift');
    let remaining = pixels;
    while (remaining > 0) {
        const step = Math.min(remaining, bounds.width * 0.5);
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - step, y, { steps: 3 });
        await page.mouse.up();
        remaining -= step;
    }
    await page.keyboard.up('Shift');
}

test('explicit save survives reload and restores exact musical data, timeline, cleared selection and history', async ({
    page,
}) => {
    await page.goto('/');
    await seed(page, source);
    await page.getByRole('combobox', { name: 'Timeline length' }).click();
    await page.getByRole('option', { name: '16 bars', exact: true }).click();
    const original = await edits(page);
    const projectPanel = await openProject(page);
    await projectPanel
        .getByRole('button', { name: 'Save project', exact: true })
        .click();
    await expect(projectPanel.getByRole('status')).toContainText(/saved/i);
    expect(await edits(page)).toEqual(original);
    const records = await storedProjects(page);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
        id: 'local',
        version: 2,
        bpm: 120,
        ppq: 480,
        beatsPerBar: 4,
        barCount: 16,
    });
    expect(records[0].notes.every((note) => !('selected' in note))).toBe(true);

    await page.reload();
    expect((await edits(page)).notes).toEqual({});
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    const changed = await edits(page);
    expect(changed.undoStack).toHaveLength(1);
    expect(changed.redoStack).toHaveLength(1);
    const restoredPanel = await openProject(page);
    const load = restoredPanel.getByRole('button', {
        name: 'Load project',
        exact: true,
    });
    await load.focus();
    await page.keyboard.press('Enter');
    await expect(restoredPanel.getByRole('status')).toContainText(/loaded/i);
    await expect(load).toBeFocused();
    expect(await edits(page)).toEqual({
        notes: Object.fromEntries(
            source.map((note) => [note.id, { ...note, selected: false }]),
        ),
        undoStack: [],
        redoStack: [],
    });
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('combobox', { name: 'Timeline length' }),
    ).toHaveText('16 bars');
    await expect(
        page.getByRole('button', { name: 'Undo', exact: true }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(
        page.getByRole('button', { name: 'Redo', exact: true }),
    ).toHaveAttribute('aria-disabled', 'true');
});

test('save overwrites the one local slot and empty compositions can replace previous saves', async ({
    page,
}) => {
    await page.goto('/');
    await seed(page, source);
    const panel = await openProject(page);
    const save = panel.getByRole('button', {
        name: 'Save project',
        exact: true,
    });
    await save.click();
    await expect(panel.getByRole('status')).toContainText(/saved/i);
    const replacement = [{ ...source[1], id: 'replacement', pitch: 72 }];
    await seed(page, replacement);
    await save.click();
    await expect
        .poll(async () =>
            (await storedProjects(page))[0]?.notes.map((note) => note.id),
        )
        .toEqual(['replacement']);
    expect(await storedProjects(page)).toHaveLength(1);
    await seed(page, []);
    await save.click();
    await expect
        .poll(async () => (await storedProjects(page))[0]?.notes)
        .toEqual([]);
    expect(await storedProjects(page)).toHaveLength(1);
    await seed(page, source);
    await panel
        .getByRole('button', { name: 'Load project', exact: true })
        .click();
    await expect.poll(async () => (await edits(page)).notes).toEqual({});
});

test('loading without a saved project preserves the current composition and history', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    const original = await edits(page);
    const panel = await openProject(page);
    await panel
        .getByRole('button', { name: 'Load project', exact: true })
        .click();
    await expect(panel.getByRole('alert')).toContainText(
        /no .*saved|save .*first|no .*project/i,
    );
    expect(await edits(page)).toEqual(original);
});

test('corrupt saved data leaves playback, notes and both history stacks untouched', async ({
    page,
}) => {
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await seed(page, [{ ...source[1], startTick: 0, durationTicks: 60000 }]);
    const panel = await openProject(page);
    await panel
        .getByRole('button', { name: 'Save project', exact: true })
        .click();
    await expect(panel.getByRole('status')).toContainText(/saved/i);
    await corruptSlot(page);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    const original = await edits(page);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    const reopened = await openProject(page);
    await reopened
        .getByRole('button', { name: 'Load project', exact: true })
        .click();
    await expect(reopened.getByRole('alert')).toBeVisible();
    expect(await edits(page)).toEqual(original);
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
});

test('successful load stops playback and Project controls enter focus order only when active', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await seed(page, [{ ...source[1], startTick: 0, durationTicks: 60000 }]);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    const midi = dialog.getByRole('tab', { name: 'MIDI', exact: true });
    await expect(midi).toHaveAttribute('aria-selected', 'true');
    await expect(
        dialog.getByRole('button', { name: 'Save project', exact: true }),
    ).toHaveCount(0);
    await midi.focus();
    await page.keyboard.press('ArrowRight');
    await expect(
        dialog.getByRole('tab', { name: 'Instrument', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('ArrowRight');
    const project = dialog.getByRole('tab', { name: 'Project', exact: true });
    await expect(project).toBeFocused();
    await expect(project).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Tab');
    const save = dialog.getByRole('button', {
        name: 'Save project',
        exact: true,
    });
    await expect(save).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(
        dialog
            .getByRole('tabpanel', { name: 'Project', exact: true })
            .getByRole('status'),
    ).toContainText(/saved/i);
    await page.keyboard.press('Tab');
    await expect(
        dialog.getByRole('button', { name: 'Load project', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
        dialog.getByRole('button', { name: 'Close settings', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    const reopened = await openProject(page);
    await reopened
        .getByRole('button', { name: 'Load project', exact: true })
        .click();
    await expect(reopened.getByRole('status')).toContainText(/loaded/i);
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});

for (const savedBars of [4, 32]) {
    test(`loading a ${savedBars}-bar project while paused ${savedBars === 4 ? 'clamps' : 'preserves'} horizontal pan`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: 980, height: 720 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/');
        await expect(
            page.getByText('Piano ready', { exact: true }),
        ).toBeVisible();
        await seed(page, [
            { ...source[1], startTick: 0, durationTicks: 60000 },
        ]);
        const length = page.getByRole('combobox', { name: 'Timeline length' });
        await length.click();
        await page
            .getByRole('option', { name: `${savedBars} bars`, exact: true })
            .click();
        const panel = await openProject(page);
        await panel
            .getByRole('button', { name: 'Save project', exact: true })
            .click();
        await expect(panel.getByRole('status')).toContainText(/saved/i);
        await page.keyboard.press('Escape');
        if (savedBars !== 32) {
            await length.click();
            await page
                .getByRole('option', { name: '32 bars', exact: true })
                .click();
        }
        await page.getByRole('button', { name: 'Play', exact: true }).click();
        await expect
            .poll(async () => (await playheadPosition(page)).tick)
            .toBeGreaterThan(100);
        await page.getByRole('button', { name: 'Pause', exact: true }).click();
        await expect(
            page.getByRole('button', { name: 'Play', exact: true }),
        ).toBeVisible();
        await pan(page, savedBars === 4 ? 7000 : 200);
        await expect
            .poll(async () => {
                const { tick, x } = await playheadPosition(page);
                return tick * 0.5 - x;
            })
            .toBeGreaterThan(savedBars === 4 ? 4 * 4 * 480 * 0.5 : 100);
        const { tick, x } = await playheadPosition(page);
        const beforeScroll = tick * 0.5 - x;
        const width = await page
            .getByRole('img', { name: 'Time grid preview', exact: true })
            .evaluate((element) =>
                Number((element as HTMLCanvasElement).dataset.logicalWidth),
            );
        const expectedScroll =
            savedBars === 4 ? 4 * 4 * 480 * 0.5 - width : beforeScroll;
        const reopened = await openProject(page);
        await reopened
            .getByRole('button', { name: 'Load project', exact: true })
            .click();
        await expect(reopened.getByRole('status')).toContainText(/loaded/i);
        await expect
            .poll(async () => (await playheadPosition(page)).tick)
            .toBe(0);
        await expect
            .poll(async () => (await playheadPosition(page)).x)
            .toBeCloseTo(-expectedScroll, 0);
        await page.keyboard.press('Escape');
        await expect(length).toHaveText(`${savedBars} bars`);
        await expect(
            page.getByRole('button', { name: 'Play', exact: true }),
        ).toBeVisible();
    });
}

test('loading a version-one project restores default BPM and keeps the current local snap choice', async ({
    page,
}) => {
    await page.goto('/');
    const bpm = page.getByRole('spinbutton', { name: 'BPM', exact: true });
    await bpm.fill('177');
    await bpm.press('Enter');
    await page.getByRole('combobox', { name: 'Snap', exact: true }).click();
    await page.getByRole('option', { name: '1/4', exact: true }).click();
    const saved = {
        id: 'local',
        version: 1,
        ppq: 480,
        beatsPerBar: 4,
        barCount: 4,
        savedAt: 1000,
        notes: [
            {
                id: 'legacy',
                pitch: 64,
                startTick: 5,
                durationTicks: 121,
                velocity: 0,
            },
        ],
    };
    await page.evaluate(async (record) => {
        const path = '/src/features/piano-roll/persistence/projectDatabase.ts';
        const { projectsTable } = (await import(
            path
        )) as typeof import('@/features/piano-roll/persistence/projectDatabase');
        await projectsTable.put(record as unknown as ProjectRecord);
    }, saved);
    const panel = await openProject(page);
    await panel
        .getByRole('button', { name: 'Load project', exact: true })
        .click();
    await expect(panel.getByRole('status')).toContainText(/loaded/i);
    await page.keyboard.press('Escape');
    await expect(bpm).toHaveValue('120');
    await expect(
        page.getByRole('combobox', { name: 'Snap', exact: true }),
    ).toHaveText('1/4');
    expect((await edits(page)).notes).toEqual({
        legacy: { ...saved.notes[0], selected: false },
    });
    await bpm.focus();
    await bpm.press('Tab');
    await expect(bpm).toHaveValue('120');
});

test('invalid saved BPM cannot stop active playback or replace the current composition', async ({
    page,
}) => {
    await page.goto('/');
    await seed(page, [
        { ...source[1], id: 'held', startTick: 0, durationTicks: 50000 },
    ]);
    const before = await edits(page);
    const bpm = page.getByRole('spinbutton', { name: 'BPM', exact: true });
    await bpm.fill('93');
    await bpm.press('Enter');
    await page.evaluate(async () => {
        const path = '/src/features/piano-roll/persistence/projectDatabase.ts';
        const { projectsTable } = (await import(
            path
        )) as typeof import('@/features/piano-roll/persistence/projectDatabase');
        await projectsTable.put({
            id: 'local',
            version: 2,
            ppq: 480,
            beatsPerBar: 4,
            barCount: 8,
            savedAt: 1000,
            bpm: 29,
            notes: [],
        });
    });
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    const panel = await openProject(page);
    await panel
        .getByRole('button', { name: 'Load project', exact: true })
        .click();
    await expect(panel.getByRole('alert')).toBeVisible();
    expect(await edits(page)).toEqual(before);
    await page.keyboard.press('Escape');
    await expect(bpm).toHaveValue('93');
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
});
