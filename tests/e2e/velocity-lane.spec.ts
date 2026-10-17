import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import type { Note } from '@/features/piano-roll/types';

const first: Note = {
    id: 'a',
    pitch: 72,
    startTick: 120,
    durationTicks: 240,
    velocity: 80,
    selected: true,
};
const second: Note = {
    ...first,
    id: 'b',
    pitch: 70,
    velocity: 100,
    selected: false,
};

async function seed(page: Page, notes = [first, second]) {
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

const lane = (page: Page) =>
    page.getByRole('region', { name: 'Velocity lane', exact: true });
const toggle = (page: Page) =>
    page.getByRole('button', { name: 'Toggle velocity lane', exact: true });
const slider = (page: Page, id: string) =>
    lane(page).locator(`[data-note-id="${id}"]`).getByRole('slider');
const sliderRoot = (page: Page, id: string) =>
    lane(page).locator(`[data-note-id="${id}"] [data-slot="slider"]`);

async function openLane(page: Page) {
    await toggle(page).click();
    const handle = page.getByRole('separator', {
        name: 'Resize velocity lane',
        exact: true,
    });
    const contentId = await handle.getAttribute('aria-controls');
    if (!contentId)
        throw new Error('Velocity resize handle needs an associated panel');
    const height = Number(await handle.getAttribute('aria-valuenow'));
    await expect
        .poll(() =>
            page
                .locator(`[id="${contentId}"]`)
                .evaluate((element) => element.getBoundingClientRect().height),
        )
        .toBeCloseTo(height, 1);
    await expect(lane(page).getByRole('slider').first()).toBeVisible();
}

async function point(page: Page, id: string, velocity?: number) {
    const element =
        velocity === undefined ? slider(page, id) : sliderRoot(page, id);
    const bounds = await element.boundingBox();
    if (!bounds) throw new Error(`Velocity slider ${id} is missing`);
    return {
        x: bounds.x + bounds.width / 2,
        y:
            bounds.y +
            (velocity === undefined
                ? bounds.height / 2
                : bounds.height * (1 - velocity / 127)),
    };
}

async function drag(page: Page, id: string, velocity: number) {
    const start = await point(page, id);
    const end = await point(page, id, velocity);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 5 });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await seed(page);
    await expect(toggle(page)).toBeVisible();
});

test('velocity lane starts collapsed and opening or closing it never changes notes or history', async ({
    page,
}) => {
    const before = await read(page);
    await expect(lane(page).getByRole('slider')).toHaveCount(0);
    await toggle(page).focus();
    await page.keyboard.press('Space');
    await expect(slider(page, 'a')).toBeVisible();
    await expect(slider(page, 'b')).toBeVisible();
    await expect(toggle(page)).toBeFocused();
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
    expect(await read(page)).toEqual(before);
    await page.keyboard.press('Enter');
    await expect(lane(page).getByRole('slider')).toHaveCount(0);
    await expect(toggle(page)).toBeFocused();
    expect(await read(page)).toEqual(before);
});

test('each note has a slider: pointer previews stay local and publish one selection-preserving undoable edit on release', async ({
    page,
}) => {
    await openLane(page);
    const before = await read(page);
    await drag(page, 'a', 20);
    await expect(slider(page, 'a')).toHaveAttribute('aria-valuenow', '20');
    expect(await read(page)).toEqual(before);
    await page.mouse.up();
    await expect
        .poll(() => read(page))
        .toEqual({
            ...before,
            notes: { a: { ...first, velocity: 20 }, b: second },
            undoCount: 1,
        });
    await expect(
        page.getByRole('button', {
            name: /Selected: Pitch 72, tick 120,.*velocity 20/i,
        }),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await read(page)).notes).toEqual(before.notes);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect((await read(page)).notes.a).toEqual({ ...first, velocity: 20 });
});

test('same-onset sliders sit side by side and each changes only its own note', async ({
    page,
}, testInfo) => {
    await openLane(page);
    const a = await sliderRoot(page, 'a').boundingBox();
    const b = await sliderRoot(page, 'b').boundingBox();
    if (!a || !b) throw new Error('Chord sliders are missing');
    expect(a.x).toBeGreaterThanOrEqual(b.x + b.width);
    for (const [id, value] of [
        ['b', 40],
        ['a', 60],
    ] as const) {
        await drag(page, id, value);
        await page.mouse.up();
        await expect
            .poll(async () => (await read(page)).notes[id].velocity)
            .toBe(value);
    }
    expect((await read(page)).notes).toEqual({
        a: { ...first, velocity: 60 },
        b: { ...second, velocity: 40 },
    });
    expect((await read(page)).undoCount).toBe(2);
    await page.screenshot({ path: testInfo.outputPath('velocity-lane.png') });
});

test('keyboard roving follows each note slider, preserves selection and announces velocity bounds', async ({
    page,
}) => {
    await openLane(page);
    await slider(page, 'b').focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider(page, 'a')).toBeFocused();
    await expect(slider(page, 'a')).toHaveAccessibleName(
        /Velocity for C5 at tick 120/i,
    );
    expect((await read(page)).undoCount).toBe(0);
    await page.keyboard.press('ArrowUp');
    await expect(slider(page, 'a')).toHaveAttribute('aria-valuenow', '81');
    await expect(
        page.getByRole('status', { name: 'Note editing status' }),
    ).toHaveText(/velocity.*81.*pitch 72/i);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await expect(slider(page, 'b')).toBeFocused();
    await expect(slider(page, 'b')).toHaveAccessibleName(
        /Velocity for A#4 at tick 120/i,
    );
    const beforeBounds = await read(page);
    await page.keyboard.press('Home');
    await expect(slider(page, 'b')).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('ArrowDown');
    expect((await read(page)).undoCount).toBe(beforeBounds.undoCount + 1);
    await page.keyboard.press('End');
    await expect(slider(page, 'b')).toHaveAttribute('aria-valuenow', '127');
    await page.keyboard.press('ArrowUp');
    expect((await read(page)).undoCount).toBe(beforeBounds.undoCount + 2);
    expect((await read(page)).notes).toEqual({
        a: first,
        b: { ...second, velocity: 127 },
    });
    await page.keyboard.press('Control+z');
    await expect(slider(page, 'b')).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('Control+Shift+Z');
    await expect(slider(page, 'b')).toHaveAttribute('aria-valuenow', '127');
    await expect(slider(page, 'b')).toBeFocused();
    expect(
        await lane(page)
            .getByRole('slider')
            .evaluateAll(
                (elements) =>
                    elements.filter(
                        (element) => element.getAttribute('tabindex') === '0',
                    ).length,
            ),
    ).toBe(1);
});

for (const reason of ['pointercancel', 'blur', 'data change'] as const) {
    test(`a note slider ${reason} aborts preview, ignores remaining moves and accepts a fresh drag`, async ({
        page,
    }) => {
        await openLane(page);
        const before = await read(page);
        await drag(page, 'b', 20);
        expect(await read(page)).toEqual(before);
        if (reason === 'pointercancel') {
            await sliderRoot(page, 'b').dispatchEvent('pointercancel', {
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
                buttons: 0,
            });
        } else if (reason === 'blur') {
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        } else {
            await page.evaluate(async () => {
                const path = '/src/features/piano-roll/store/useNoteStore.ts';
                const { useNoteStore } = (await import(
                    path
                )) as typeof import('@/features/piano-roll/store/useNoteStore');
                useNoteStore.getState().selectNotes(['b']);
            });
        }
        const aborted = await read(page);
        const extra = await point(page, 'b', 100);
        await page.mouse.move(extra.x, extra.y, { steps: 5 });
        expect(await read(page)).toEqual(aborted);
        await page.mouse.up();
        expect(await read(page)).toEqual(aborted);
        await drag(page, 'b', 40);
        expect(await read(page)).toEqual(aborted);
        await page.mouse.up();
        await expect.poll(async () => (await read(page)).undoCount).toBe(1);
        expect((await read(page)).notes).toEqual({
            ...aborted.notes,
            b: { ...aborted.notes.b, velocity: 40 },
        });
        await expect(slider(page, 'b')).toBeFocused();
        await page.getByRole('button', { name: 'Undo', exact: true }).click();
        expect((await read(page)).notes).toEqual(aborted.notes);
    });
}

test('dragging the divider opens and resizes the lane within its bounds without easing the active pointer gesture', async ({
    page,
}) => {
    const before = await read(page);
    const handle = page.getByRole('separator', {
        name: 'Resize velocity lane',
        exact: true,
    });
    const contentId = await handle.getAttribute('aria-controls');
    if (!contentId)
        throw new Error('Velocity resize handle needs an associated panel');
    const body = page.locator(`[id="${contentId}"]`);
    const origin = await handle.boundingBox();
    if (!origin) throw new Error('Velocity resize handle is missing');
    await page.mouse.move(
        origin.x + origin.width / 2,
        origin.y + origin.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
        origin.x + origin.width / 2,
        origin.y + origin.height / 2 - 120,
        { steps: 8 },
    );
    const draggedHeight = Number(await handle.getAttribute('aria-valuenow'));
    // The gesture abstraction applies a small activation threshold before movement.
    expect(draggedHeight).toBeGreaterThanOrEqual(115);
    expect(draggedHeight).toBeLessThanOrEqual(120);
    await expect
        .poll(() =>
            body.evaluate((element) => element.getBoundingClientRect().height),
        )
        .toBeCloseTo(draggedHeight, 1);
    await page.mouse.up();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    const maximum = Number(await handle.getAttribute('aria-valuemax'));
    const expanded = await handle.boundingBox();
    if (!expanded) throw new Error('Expanded divider is missing');
    await page.mouse.move(
        expanded.x + expanded.width / 2,
        expanded.y + expanded.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
        expanded.x + expanded.width / 2,
        expanded.y + expanded.height / 2 - 500,
        { steps: 10 },
    );
    await expect(handle).toHaveAttribute('aria-valuenow', String(maximum));
    await page.mouse.up();
    expect(maximum).toBeLessThanOrEqual(320);
    await handle.focus();
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuenow', '80');
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute('aria-valuenow', String(maximum));
    await expect(handle).toBeFocused();
    expect(await read(page)).toEqual(before);
});

test('lane height adapts to a smaller workspace and reduced motion without changing the composition', async ({
    page,
}) => {
    await page.setViewportSize({ width: 980, height: 500 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const before = await read(page);
    await openLane(page);
    const handle = page.getByRole('separator', {
        name: 'Resize velocity lane',
        exact: true,
    });
    const maximum = Number(await handle.getAttribute('aria-valuemax'));
    const workspaceHeight = await page
        .locator('.workspace-grid')
        .evaluate((element) => element.getBoundingClientRect().height);
    expect(maximum).toBeLessThanOrEqual(Math.round(workspaceHeight / 2));
    expect(
        Number(await handle.getAttribute('aria-valuenow')),
    ).toBeLessThanOrEqual(maximum);
    const contentId = await handle.getAttribute('aria-controls');
    if (!contentId)
        throw new Error('Velocity resize handle needs an associated panel');
    const body = page.locator(`[id="${contentId}"]`);
    expect(
        await body.evaluate(
            (element) =>
                element
                    .getAnimations()
                    .filter(
                        (animation) =>
                            animation.playState === 'running' ||
                            animation.pending,
                    ).length,
        ),
    ).toBe(0);
    await toggle(page).click();
    await expect(body).toHaveCSS('height', '0px');
    await expect(lane(page).getByRole('slider')).toHaveCount(0);
    expect(await read(page)).toEqual(before);
});

for (const reason of ['pointercancel', 'blur'] as const) {
    test(`the divider toggles on the first click after resize and ${reason}`, async ({
        page,
    }) => {
        const handle = page.getByRole('separator', {
            name: 'Resize velocity lane',
            exact: true,
        });
        const before = await read(page);
        const bounds = await handle.boundingBox();
        if (!bounds) throw new Error('Velocity divider is missing');
        await page.mouse.move(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2 - 120,
            { steps: 5 },
        );
        await page.mouse.up();
        await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
        await handle.click();
        await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
        await handle.click();
        await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
        const openBounds = await handle.boundingBox();
        if (!openBounds) throw new Error('Open velocity divider is missing');
        await page.mouse.move(
            openBounds.x + openBounds.width / 2,
            openBounds.y + openBounds.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
            openBounds.x + openBounds.width / 2,
            openBounds.y - 60,
            { steps: 5 },
        );
        if (reason === 'blur')
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        else
            await handle.dispatchEvent('pointercancel', {
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
                buttons: 0,
            });
        await page.mouse.up();
        await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
        await handle.click();
        await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
        expect(await read(page)).toEqual(before);
    });
}

test('individual sliders remain aligned with grid onsets through zoom and pan', async ({
    page,
}) => {
    const grid = page.getByRole('img', { name: 'Time grid preview' });
    const width = await grid.evaluate((element) =>
        Number((element as HTMLCanvasElement).dataset.logicalWidth),
    );
    await seed(page, [{ ...first, startTick: width + 40 }]);
    await openLane(page);
    const before = await read(page);
    const overlay = page.locator('[data-note-overlay]');
    const error = async () => {
        const gridBounds = await grid.boundingBox();
        const sliderBounds = await sliderRoot(page, 'a').boundingBox();
        const noteX = await overlay.evaluate((element) =>
            parseFloat((element as HTMLElement).style.left),
        );
        if (!gridBounds || !sliderBounds) return Infinity;
        return Math.abs(sliderBounds.x - gridBounds.x - noteX);
    };
    await expect.poll(error).toBeLessThan(1.5);
    await page
        .getByRole('button', { name: 'Editor controls', exact: true })
        .click();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect.poll(error).toBeLessThan(1.5);
    await page.getByRole('button', { name: 'Pan right', exact: true }).click();
    await expect.poll(error).toBeLessThan(1.5);
    expect(await read(page)).toEqual(before);
});

test('a thousand-note project mounts only visible velocity sliders and keyboard navigation reveals later notes', async ({
    page,
}) => {
    const notes = Array.from({ length: 1000 }, (_, index) => ({
        ...first,
        id: `n${index}`,
        startTick: index * 120,
        selected: index === 0,
    }));
    await seed(page, notes);
    await openLane(page);
    const before = await read(page);
    const count = await lane(page).getByRole('slider').count();
    expect(count).toBeGreaterThan(1);
    expect(count).toBeLessThan(100);
    await expect(lane(page).locator('[data-note-id="n999"]')).toHaveCount(0);
    await slider(page, 'n0').focus();
    for (let index = 1; index <= count + 1; index++) {
        await page.keyboard.press('ArrowRight');
        await expect(slider(page, `n${index}`)).toBeFocused();
    }
    await expect(slider(page, `n${count + 1}`)).toBeInViewport();
    expect(await read(page)).toEqual(before);
});

test('pointer previews only update the dragged slider DOM and leave neighboring sliders unchanged', async ({
    page,
}) => {
    await openLane(page);
    const start = await point(page, 'a');
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.evaluate(() => {
        const changed = new Set<string>();
        const region = document.querySelector('[aria-label="Velocity lane"]');
        if (!region) throw new Error('Velocity lane is missing');
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                const target =
                    mutation.target instanceof Element
                        ? mutation.target
                        : mutation.target.parentElement;
                const id = target
                    ?.closest('[data-note-id]')
                    ?.getAttribute('data-note-id');
                if (id) changed.add(id);
            }
        });
        observer.observe(region, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
        });
        Object.assign(window, { velocityProbe: { changed, observer } });
    });
    const before = await read(page);
    const end = await point(page, 'a', 20);
    await page.mouse.move(end.x, end.y, { steps: 15 });
    await expect(slider(page, 'a')).toHaveAttribute('aria-valuenow', '20');
    expect(await read(page)).toEqual(before);
    const changed = await page.evaluate(() => {
        const probe = (
            window as unknown as {
                velocityProbe: {
                    changed: Set<string>;
                    observer: MutationObserver;
                };
            }
        ).velocityProbe;
        probe.observer.disconnect();
        return [...probe.changed];
    });
    expect(changed).toEqual(['a']);
    await page.mouse.up();
});

test('empty lane pointer gestures do not draw notes or change note selection', async ({
    page,
}) => {
    await openLane(page);
    const bounds = await lane(page).boundingBox();
    if (!bounds) throw new Error('Velocity lane is missing');
    const before = await read(page);
    const x = bounds.x + bounds.width - 60;
    const y = bounds.y + bounds.height * 0.7;
    await page.mouse.click(x, y);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 40, y - 25, { steps: 5 });
    await page.mouse.up();
    expect(await read(page)).toEqual(before);
});

test('one thousand visible sliders mount and a target drag keeps neighboring DOM and history stable', async ({
    page,
}, testInfo) => {
    const notes = Array.from({ length: 1000 }, (_, index) => ({
        ...first,
        id: `p${index}`,
        startTick: index === 999 ? 1000 : index,
        selected: index === 999,
    }));
    await seed(page, notes);
    const before = await read(page);
    const started = await page.evaluate(() => performance.now());
    await toggle(page).click();
    await expect(lane(page).getByRole('slider')).toHaveCount(1000);
    await expect(slider(page, 'p999')).toBeVisible();
    const mountMs = await page.evaluate(
        (start) => performance.now() - start,
        started,
    );
    await page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve()),
                ),
            ),
    );
    const start = await point(page, 'p999');
    const end = await point(page, 'p999', 20);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.evaluate(() => {
        const samples: number[] = [];
        let previous: number | null = null;
        let active = true;
        const sample = (now: number) => {
            if (!active) return;
            if (previous !== null) samples.push(now - previous);
            previous = now;
            requestAnimationFrame(sample);
        };
        const changed = new Set<string>();
        const observer = new MutationObserver((records) => {
            for (const record of records) {
                const target =
                    record.target instanceof Element
                        ? record.target
                        : record.target.parentElement;
                const id = target
                    ?.closest('[data-note-id]')
                    ?.getAttribute('data-note-id');
                if (id) changed.add(id);
            }
        });
        observer.observe(
            document.querySelector('[aria-label="Velocity lane"]')!,
            {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true,
            },
        );
        requestAnimationFrame(sample);
        Object.assign(window, {
            velocityPerformanceProbe: {
                samples,
                changed,
                stop: () => {
                    active = false;
                    observer.disconnect();
                },
            },
        });
    });
    const dragStarted = await page.evaluate(() => performance.now());
    await page.mouse.move(end.x, end.y, { steps: 20 });
    const measurements = await page.evaluate((start) => {
        const probe = (
            window as unknown as {
                velocityPerformanceProbe: {
                    samples: number[];
                    changed: Set<string>;
                    stop: () => void;
                };
            }
        ).velocityPerformanceProbe;
        probe.stop();
        return {
            dragMs: performance.now() - start,
            frameIntervalsMs: probe.samples,
            changedIds: [...probe.changed],
        };
    }, dragStarted);
    await expect(slider(page, 'p999')).toHaveAttribute('aria-valuenow', '20');
    expect(await read(page)).toEqual(before);
    expect(measurements.changedIds).toEqual(['p999']);
    await page.mouse.up();
    await expect.poll(async () => (await read(page)).undoCount).toBe(1);
    const artifact = testInfo.outputPath('velocity-performance.json');
    await writeFile(
        artifact,
        JSON.stringify(
            { visibleSliders: 1000, mountMs, ...measurements },
            null,
            2,
        ),
    );
    await testInfo.attach('velocity-performance.json', {
        path: artifact,
        contentType: 'application/json',
    });
});

test('panning a focused slider offscreen hands focus to the lane without undoing the pan', async ({
    page,
}) => {
    await openLane(page);
    await page
        .getByRole('button', { name: 'Editor controls', exact: true })
        .click();
    await slider(page, 'b').focus();
    const before = await read(page);
    // Activate the existing control without a pointer focus transfer, so the lane
    // must hand off focus when its currently focused note leaves the viewport.
    await page
        .getByRole('button', { name: 'Pan right', exact: true })
        .evaluate((element) => (element as HTMLButtonElement).click());
    const group = page.getByRole('group', {
        name: 'Note velocities',
        exact: true,
    });
    await expect(group).toBeFocused();
    await expect(slider(page, 'b')).toHaveCount(0);
    await page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve()),
                ),
            ),
    );
    await expect(slider(page, 'b')).toHaveCount(0);
    expect(await read(page)).toEqual(before);
    await page.keyboard.press('ArrowRight');
    await expect(slider(page, 'a')).toBeFocused();
    await expect(slider(page, 'a')).toBeInViewport();
    expect(await read(page)).toEqual(before);
});

test('modified edit keys and keys during a pointer preview cannot bypass the gesture guard', async ({
    page,
}) => {
    await openLane(page);
    await slider(page, 'a').focus();
    const before = await read(page);
    for (const modifier of ['Control', 'Meta', 'Alt']) {
        for (const key of [
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End',
            'PageUp',
            'PageDown',
        ]) {
            await page.keyboard.press(`${modifier}+${key}`);
        }
    }
    expect(await read(page)).toEqual(before);
    await drag(page, 'a', 20);
    await expect(slider(page, 'a')).toHaveAttribute('aria-valuenow', '20');
    for (const key of [
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'PageUp',
        'PageDown',
    ]) {
        await page.keyboard.press(key);
    }
    expect(await read(page)).toEqual(before);
    await expect(slider(page, 'a')).toHaveAttribute('aria-valuenow', '20');
    await page.mouse.up();
    await expect.poll(async () => (await read(page)).undoCount).toBe(1);
    expect((await read(page)).notes).toEqual({
        a: { ...first, velocity: 20 },
        b: second,
    });
});

test('velocity controls meet the lane bottom and expose guide values and an exact hover/focus value', async ({
    page,
}) => {
    await openLane(page);
    const root = sliderRoot(page, 'a');
    const body = page.getByRole('group', {
        name: 'Note velocities',
        exact: true,
    });
    const rootBounds = await root.boundingBox();
    const bodyBounds = await body.boundingBox();
    if (!rootBounds || !bodyBounds) throw new Error('Velocity lane is missing');
    expect(rootBounds.y + rootBounds.height).toBeCloseTo(
        bodyBounds.y + bodyBounds.height,
        1,
    );
    for (const value of [0, 32, 64, 96, 127]) {
        await expect(
            lane(page).locator(`[data-velocity-guide="${value}"]`),
        ).toBeVisible();
        await expect(
            lane(page).locator(`[data-velocity-scale="${value}"]`),
        ).toHaveText(String(value));
    }
    const backdrop = await root.evaluate((element) => {
        let current: Element | null = element;
        while (
            current &&
            current.getAttribute('aria-label') !== 'Velocity lane'
        ) {
            const color = getComputedStyle(current).backgroundColor;
            if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent')
                return color;
            current = current.parentElement;
        }
        return 'transparent';
    });
    expect(backdrop).not.toBe('transparent');
    const channels = backdrop
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
    expect(channels).toHaveLength(3);
    expect(Math.max(...channels!) - Math.min(...channels!)).toBeLessThan(5);
    expect(channels![0]).toBeGreaterThan(20);
    const value = lane(page).locator(
        '[data-note-id="a"] [data-velocity-value]',
    );
    await root.hover();
    await expect(value).toBeVisible();
    await expect(value).toHaveText('80');
    await page.getByRole('button', { name: 'Settings', exact: true }).hover();
    await slider(page, 'a').focus();
    await expect(value).toBeVisible();
    await page.keyboard.press('Home');
    await expect(value).toHaveText('0');
    await expect(slider(page, 'a')).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('End');
    await expect(value).toHaveText('127');
    await expect(slider(page, 'a')).toHaveAttribute('aria-valuenow', '127');
    expect((await read(page)).notes.b).toEqual(second);
    const assertClearThumb = async () => {
        const badge = await value.boundingBox();
        const thumb = await slider(page, 'a').boundingBox();
        if (!badge || !thumb)
            throw new Error('Focused value badge or thumb is missing');
        expect(badge.x - (thumb.x + thumb.width)).toBeGreaterThanOrEqual(3.5);
    };
    await assertClearThumb();
    await page.screenshot({
        path: '/tmp/piano-roll-velocity-validation/velocity-lane-polished-160.png',
    });
    const handle = page.getByRole('separator', {
        name: 'Resize velocity lane',
        exact: true,
    });
    await handle.focus();
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuenow', '80');
    await expect(body).toHaveCSS('height', '80px');
    await slider(page, 'a').focus();
    await assertClearThumb();
    await page.screenshot({
        path: '/tmp/piano-roll-velocity-validation/velocity-lane-polished-80.png',
    });
    const labels = await lane(page)
        .locator('[data-velocity-scale]')
        .evaluateAll((elements) =>
            elements
                .map((element) => {
                    const bounds = element.getBoundingClientRect();
                    return {
                        value: element.textContent,
                        top: bounds.top,
                        bottom: bounds.bottom,
                    };
                })
                .sort((a, b) => a.top - b.top),
        );
    for (let index = 1; index < labels.length; index++) {
        expect(
            labels[index].top,
            `Scale labels ${labels[index - 1].value} and ${labels[index].value} overlap`,
        ).toBeGreaterThanOrEqual(labels[index - 1].bottom - 0.5);
    }
});

test('a right-edge velocity value badge opens to the left of the thumb and stays inside the plot', async ({
    page,
}) => {
    const width = await page
        .getByRole('img', { name: 'Time grid preview' })
        .evaluate((element) =>
            Number((element as HTMLCanvasElement).dataset.logicalWidth),
        );
    const note = { ...first, startTick: Math.floor((width - 14) / 0.5) };
    await seed(page, [note]);
    await openLane(page);
    await slider(page, 'a').focus();
    const value = lane(page).locator(
        '[data-note-id="a"] [data-velocity-value]',
    );
    for (const key of ['End', 'Home']) {
        await page.keyboard.press(key);
        await expect(value).toBeVisible();
        await expect(value).toHaveText(key === 'End' ? '127' : '0');
        const badge = await value.boundingBox();
        const thumb = await slider(page, 'a').boundingBox();
        const plot = await sliderRoot(page, 'a').evaluate((element) => {
            const bounds = element
                .closest('[data-velocity-note]')!
                .parentElement!.getBoundingClientRect();
            return {
                x: bounds.x,
                y: bounds.y,
                right: bounds.right,
                bottom: bounds.bottom,
            };
        });
        if (!badge || !thumb)
            throw new Error('Right-edge value badge or thumb is missing');
        expect(thumb.x - (badge.x + badge.width)).toBeGreaterThanOrEqual(3.5);
        expect(badge.x).toBeGreaterThanOrEqual(plot.x - 0.5);
        expect(badge.x + badge.width).toBeLessThanOrEqual(plot.right + 0.5);
        expect(badge.y).toBeGreaterThanOrEqual(plot.y - 0.5);
        expect(badge.y + badge.height).toBeLessThanOrEqual(plot.bottom + 0.5);
    }
    await page.screenshot({
        path: '/tmp/piano-roll-velocity-validation/velocity-lane-right-edge-badge.png',
    });
    expect((await read(page)).notes.a).toEqual({ ...note, velocity: 0 });
});

test('a freshly drawn note and Ctrl/Cmd empty-grid taps allow the next velocity drag without selecting a grid note', async ({
    page,
}) => {
    await seed(page, []);
    await toggle(page).click();
    await expect(
        page.getByRole('group', { name: 'Note velocities', exact: true }),
    ).toHaveCSS('height', '160px');
    const grid = page.getByRole('img', { name: 'Time grid preview' });
    await grid.click({ position: { x: 165, y: 50 } });
    await expect(lane(page).getByRole('slider')).toHaveCount(1);
    const created = await read(page);
    const note = Object.values(created.notes)[0];
    expect(note).toMatchObject({
        startTick: 240,
        pitch: 70,
        velocity: 100,
        selected: false,
    });
    expect(created.undoCount).toBe(1);
    await drag(page, note.id, 40);
    expect(await read(page)).toEqual(created);
    await page.mouse.up();
    await expect
        .poll(() => read(page))
        .toEqual({
            ...created,
            notes: { [note.id]: { ...note, velocity: 40 } },
            undoCount: 2,
        });
    for (const [modifier, velocity] of [
        ['Control', 60],
        ['Meta', 30],
    ] as const) {
        const before = await read(page);
        await page.keyboard.down(modifier);
        await grid.click({ position: { x: 330, y: 70 } });
        await page.keyboard.up(modifier);
        expect(await read(page)).toEqual(before);
        await drag(page, note.id, velocity);
        expect(await read(page)).toEqual(before);
        await page.mouse.up();
        await expect
            .poll(() => read(page))
            .toEqual({
                ...before,
                notes: { [note.id]: { ...note, velocity } },
                undoCount: before.undoCount + 1,
            });
    }
    await expect(
        page.getByRole('status', { name: 'Note editing status' }),
    ).toHaveText('Set velocity to 30 for pitch 70 at tick 240');
});
