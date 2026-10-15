import { expect, test, type Page } from '@playwright/test';
import type { Note } from '@/features/piano-roll/types';

const first: Note = {
    id: 'a',
    pitch: 72,
    startTick: 120,
    durationTicks: 240,
    velocity: 80,
    selected: true,
};
const second: Note = { ...first, id: 'b', pitch: 70, startTick: 480 };

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

const editor = (page: Page) =>
    page.getByRole('group', { name: 'Piano roll editor', exact: true });
const status = (page: Page) =>
    page.getByRole('status', { name: 'Note editing status' });

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', {
        name: 'Editor controls',
        exact: true,
    });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(
        page.getByRole('button', { name: 'Zoom in', exact: true }),
    ).toHaveCount(0);
    await toggle.click();
    await expect(
        page.getByRole('button', { name: 'Zoom in', exact: true }),
    ).toBeVisible();
});

const controls = (page: Page) =>
    page.getByRole('dialog', { name: 'Editor controls', exact: true });

test('Editor controls opens with Enter or Space, hides closed controls, and restores trigger focus on Escape', async ({
    page,
}) => {
    await page.reload();
    const toggle = page.getByRole('button', {
        name: 'Editor controls',
        exact: true,
    });
    for (const key of ['Enter', 'Space']) {
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(controls(page)).toHaveCount(0);
        await expect(
            page.getByRole('button', { name: 'Zoom in', exact: true }),
        ).toHaveCount(0);
        await toggle.focus();
        await page.keyboard.press(key);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(controls(page)).toBeVisible();
        await expect(
            page.getByRole('button', { name: 'Zoom out', exact: true }),
        ).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(controls(page)).toHaveCount(0);
        await expect(toggle).toBeFocused();
        await expect(
            page.getByRole('group', {
                name: 'Edit selected notes',
                exact: true,
            }),
        ).toHaveCount(0);
    }
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});

test('popover isolates its own actions and stays open through outside clicks, note edits and grid panning', async ({
    page,
}) => {
    await page.keyboard.press('Escape');
    await seed(page, [first, second]);
    const before = await read(page);
    const toggle = page.getByRole('button', {
        name: 'Editor controls',
        exact: true,
    });
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(controls(page)).toBeVisible();
    const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true });
    await expect(zoomOut).toBeFocused();
    for (const key of [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Delete',
    ])
        await page.keyboard.press(key);
    expect(await read(page)).toEqual(before);
    await page.keyboard.press('Space'); // Native Zoom out activation must not reach the editor's Space handler.
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
    expect(await read(page)).toEqual(before);
    await controls(page).click({ position: { x: 6, y: 6 } });
    expect(await read(page)).toEqual(before);
    await page
        .getByRole('heading', { name: 'Piano roll', exact: true })
        .click();
    await expect(controls(page)).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await read(page)).toEqual(before);
    const canvas = page.getByRole('img', { name: 'Time grid preview' });
    const canvasBounds = await canvas.boundingBox();
    if (!canvasBounds) throw new Error('Grid canvas is missing');
    await page.mouse.click(
        canvasBounds.x + canvasBounds.width - 100,
        canvasBounds.y + canvasBounds.height / 2,
    );
    await expect
        .poll(async () => Object.keys((await read(page)).notes).length)
        .toBe(3);
    await expect(controls(page)).toBeVisible();
    const note = page.locator('[data-note-overlay][data-note-id="a"]');
    const noteBounds = await note.boundingBox();
    if (!noteBounds) throw new Error('Existing selected note is missing');
    await page.mouse.click(
        noteBounds.x + noteBounds.width / 3,
        noteBounds.y + noteBounds.height / 2,
    );
    await expect(controls(page)).toBeVisible();
    const afterDraw = await read(page);
    expect(afterDraw.undoCount).toBe(1);
    expect(afterDraw.notes.a).toMatchObject({
        startTick: 120,
        pitch: 72,
        durationTicks: 240,
    });
    const popupBounds = await controls(page).boundingBox();
    await page.keyboard.down('Shift');
    await page.mouse.move(
        canvasBounds.x + canvasBounds.width - 60,
        canvasBounds.y + canvasBounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
        canvasBounds.x + canvasBounds.width - 160,
        canvasBounds.y + canvasBounds.height / 2,
        { steps: 5 },
    );
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect(controls(page)).toBeVisible();
    expect(await read(page)).toEqual(afterDraw);
    expect(await controls(page).boundingBox()).toEqual(popupBounds);
    await toggle.click();
    await expect(controls(page)).toHaveCount(0);
    await expect(toggle).toBeFocused();
});

test('live reduced-motion changes open a settled popover without residual animation and close it immediately', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.press('Escape');
    const toggle = page.getByRole('button', {
        name: 'Editor controls',
        exact: true,
    });
    await expect(controls(page)).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(controls(page)).toBeVisible();
    await expect(controls(page)).toHaveCSS('opacity', '1');
    await expect(controls(page)).toHaveCSS('transform', 'none');
    expect(
        await controls(page).evaluate(
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
    await page.keyboard.press('Escape');
    await expect(controls(page)).toHaveCount(0);
    await expect(toggle).toBeFocused();
});

test('the circular bottom-left popover leaves canvas, header and Playback geometry unchanged', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.keyboard.press('Escape');
    const toggle = page.getByRole('button', {
        name: 'Editor controls',
        exact: true,
    });
    const canvas = page.getByRole('img', { name: 'Time grid preview' });
    const header = page.locator('header.editor-toolbar');
    const playback = page.getByRole('region', {
        name: 'Playback',
        exact: true,
    });
    const geometry = async () => ({
        canvas: await canvas.boundingBox(),
        header: await header.boundingBox(),
        playback: await playback.boundingBox(),
    });
    const closed = await geometry();
    const surface = await editor(page).boundingBox();
    const trigger = await toggle.boundingBox();
    if (!surface || !trigger)
        throw new Error('Editor surface or control trigger is missing');
    expect(trigger.width).toBe(36);
    expect(trigger.height).toBe(36);
    expect(trigger.x).toBeCloseTo(surface.x + 12, 1);
    expect(trigger.y + trigger.height).toBeCloseTo(
        surface.y + surface.height - 12,
        1,
    );
    expect(
        await toggle.evaluate((element) =>
            parseFloat(getComputedStyle(element).borderRadius),
        ),
    ).toBeGreaterThanOrEqual(18);
    await toggle.click();
    await expect(controls(page)).toBeVisible();
    expect(await geometry()).toEqual(closed);
    const contentId = await toggle.getAttribute('aria-controls');
    if (!contentId)
        throw new Error('Editor controls needs an associated popup');
    await expect(page.locator(`[id="${contentId}"]`)).toHaveCount(1);
    const popup = await controls(page).boundingBox();
    if (!popup) throw new Error('Editor controls popup is missing');
    expect(popup.y + popup.height).toBeLessThanOrEqual(trigger.y);
    expect(popup.x).toBeCloseTo(trigger.x, 1);
    const screenshotPath = testInfo.outputPath('editor-controls-popover.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('editor-controls-popover', {
        path: screenshotPath,
        contentType: 'image/png',
    });
});

test('the editor controls popover fits a narrow viewport and remains keyboard dismissible', async ({
    page,
}) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await expect(controls(page)).toBeVisible();
    await expect
        .poll(async () => {
            const popup = await controls(page).boundingBox();
            return (
                !!popup &&
                popup.x >= 0 &&
                popup.y >= 0 &&
                popup.x + popup.width <= 320 &&
                popup.y + popup.height <= 600
            );
        })
        .toBe(true);
    await page.keyboard.press('Escape');
    await expect(controls(page)).toHaveCount(0);
    await expect(
        page.getByRole('button', { name: 'Editor controls', exact: true }),
    ).toBeFocused();
});

test('the transparent panel contains named icon buttons with no visible headings', async ({
    page,
}) => {
    await expect(controls(page)).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
    );
    for (const name of [
        'Zoom out',
        'Zoom in',
        'Pan left',
        'Pan right',
        'Pitch down',
        'Pitch up',
        'Move earlier',
        'Move later',
        'Shorten notes',
        'Lengthen notes',
    ]) {
        const button = controls(page).getByRole('button', {
            name,
            exact: true,
        });
        await expect(button).toHaveAttribute('aria-label', name);
        await expect(button).toHaveAttribute('title', name);
        expect((await button.textContent())?.trim()).toBe('');
        await expect(button.locator('svg[aria-hidden="true"]')).toHaveCount(1);
        const bounds = await button.boundingBox();
        expect(bounds?.width).toBe(36);
        expect(bounds?.height).toBe(36);
    }
    expect(
        await controls(page)
            .getByRole('heading')
            .evaluateAll((headings) =>
                headings.every((heading) => {
                    const style = getComputedStyle(heading);
                    return (
                        style.position === 'absolute' &&
                        style.width === '1px' &&
                        style.height === '1px' &&
                        style.overflow === 'hidden'
                    );
                }),
            ),
    ).toBe(true);
});

test('the focused single-note list button remains visible above the floating editor trigger', async ({
    page,
}) => {
    await page.keyboard.press('Escape');
    await seed(page, [first]);
    const note = page.getByRole('button', {
        name: /Selected: Pitch 72, tick 120,/,
    });
    await note.focus();
    await expect(note).toBeFocused();
    await expect(note).toBeInViewport({ ratio: 1 });
    expect(
        await note.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const hit = document.elementFromPoint(
                bounds.x + 8,
                bounds.y + bounds.height / 2,
            );
            return hit === element || (!!hit && element.contains(hit));
        }),
    ).toBe(true);
});

test('a focused note in the revealed list stays visible above the persistent controls popover', async ({
    page,
}) => {
    await seed(
        page,
        Array.from({ length: 8 }, (_, index) => ({
            ...first,
            id: `list-${index}`,
            pitch: 72 - index,
        })),
    );
    const note = page.getByRole('button', {
        name: /Selected: Pitch 72, tick 120,/,
    });
    await note.focus();
    await expect(note).toBeFocused();
    await expect(note).toBeInViewport({ ratio: 1 });
    await expect(controls(page)).toBeVisible();
    expect(
        await note.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const hit = document.elementFromPoint(
                bounds.x + 8,
                bounds.y + bounds.height / 2,
            );
            return hit === element || (!!hit && element.contains(hit));
        }),
    ).toBe(true);
});

test('viewport controls are keyboard reachable and navigate without changing notes, history or playback', async ({
    page,
}) => {
    await seed(page, [
        { ...first, startTick: 480 },
        { ...second, startTick: 960 },
    ]);
    const before = await read(page);
    const overlay = page.locator('[data-note-overlay]');
    const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
    await page.keyboard.press('Escape');
    await page
        .getByRole('button', { name: 'Editor controls', exact: true })
        .focus();
    await page.keyboard.press('Enter');
    await expect(
        page.getByRole('button', { name: 'Zoom out', exact: true }),
    ).toBeFocused();
    const visited: string[] = ['Zoom out'];
    for (let count = 0; count < 12; count++) {
        await page.keyboard.press('Tab');
        const name = await page.evaluate(
            () =>
                document.activeElement?.getAttribute('aria-label') ??
                document.activeElement?.textContent?.trim(),
        );
        if (['Zoom in', 'Pan left', 'Pan right'].includes(name ?? ''))
            visited.push(name!);
        if (visited.length === 4) break;
    }
    expect(visited.sort()).toEqual([
        'Pan left',
        'Pan right',
        'Zoom in',
        'Zoom out',
    ]);
    const originalWidth = await overlay.evaluate(
        (element) => element.getBoundingClientRect().width,
    );
    await zoomIn.focus();
    await page.keyboard.press('Enter');
    await expect(zoomIn).toBeFocused();
    await expect
        .poll(() =>
            overlay.evaluate(
                (element) => element.getBoundingClientRect().width,
            ),
        )
        .toBeGreaterThan(originalWidth);
    await expect(status(page)).toHaveText(/ticks visible/i);
    await page.getByRole('button', { name: 'Zoom out', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect
        .poll(() =>
            overlay.evaluate(
                (element) => element.getBoundingClientRect().width,
            ),
        )
        .toBeCloseTo(originalWidth, 1);
    const originalLeft = await overlay.evaluate(
        (element) => (element as HTMLElement).style.left,
    );
    const pan = page.getByRole('button', { name: 'Pan right', exact: true });
    await pan.focus();
    await page.keyboard.press('Space');
    await expect(pan).toBeFocused();
    await expect(overlay).toBeHidden();
    await expect(status(page)).toHaveText(/view|tick|pan/i);
    await page.getByRole('button', { name: 'Pan left', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveCSS('left', originalLeft);
    expect(await read(page)).toEqual(before);
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});

test('single clicks edit the whole selection and undo once per click, with focus and announcements retained', async ({
    page,
}) => {
    const untouched = { ...first, id: 'c', selected: false };
    await seed(page, [first, second, untouched]);
    const original = await read(page);
    const pitch = page.getByRole('button', { name: 'Pitch down', exact: true });
    await pitch.click();
    await expect(pitch).toBeFocused();
    expect((await read(page)).notes).toEqual({
        a: { ...first, pitch: 71 },
        b: { ...second, pitch: 69 },
        c: untouched,
    });
    await expect(status(page)).toHaveText(/Moved 2 notes/);
    const later = page.getByRole('button', { name: 'Move later', exact: true });
    await later.click();
    await expect(later).toBeFocused();
    const moved = await read(page);
    expect(moved.notes.a.startTick).toBe(240);
    expect(moved.notes.b.startTick).toBe(600);
    const lengthen = page.getByRole('button', {
        name: 'Lengthen notes',
        exact: true,
    });
    await lengthen.click();
    await expect(lengthen).toBeFocused();
    expect((await read(page)).notes.a.durationTicks).toBe(360);
    expect((await read(page)).notes.b.durationTicks).toBe(360);
    expect((await read(page)).undoCount).toBe(3);
    await expect(status(page)).toHaveText(/Resized 2 notes/);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await read(page)).notes).toEqual(moved.notes);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await read(page)).notes).toEqual(original.notes);
});

test('selection controls support native keyboard activation without triggering editor shortcuts or playback', async ({
    page,
}) => {
    await seed(page, [first]);
    const up = page.getByRole('button', { name: 'Pitch up', exact: true });
    await up.focus();
    await page.keyboard.press('Space');
    await expect(up).toBeFocused();
    expect((await read(page)).notes.a.pitch).toBe(73);
    const earlier = page.getByRole('button', {
        name: 'Move earlier',
        exact: true,
    });
    await earlier.focus();
    await page.keyboard.press('Enter');
    expect((await read(page)).notes.a.startTick).toBe(0);
    await expect(earlier).toBeFocused();
    const shorten = page.getByRole('button', {
        name: 'Shorten notes',
        exact: true,
    });
    await shorten.focus();
    await page.keyboard.press('Space');
    expect((await read(page)).notes.a.durationTicks).toBe(120);
    expect((await read(page)).undoCount).toBe(3);
    await expect(shorten).toBeFocused();
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});

test('empty selection controls and repeated bound edits cannot create history', async ({
    page,
}) => {
    for (const name of [
        'Pitch up',
        'Pitch down',
        'Move earlier',
        'Move later',
        'Shorten notes',
        'Lengthen notes',
    ]) {
        const control = page.getByRole('button', { name, exact: true });
        await expect(control).toBeVisible();
        await expect(control).toBeDisabled();
    }
    const bound = { ...first, pitch: 127, startTick: 0, durationTicks: 120 };
    await seed(page, [bound]);
    const before = await read(page);
    for (const name of ['Pitch up', 'Move earlier', 'Shorten notes']) {
        const control = page.getByRole('button', { name, exact: true });
        await control.click();
        await control.click();
        await expect(control).toBeFocused();
    }
    expect(await read(page)).toEqual(before);
});

test('playback hands focus from an offscreen selected overlay to the editor so Space can pause', async ({
    page,
}) => {
    await page.setViewportSize({ width: 980, height: 720 });
    await seed(page, [
        { ...first, startTick: 0 },
        { ...second, selected: false, durationTicks: 7680 },
    ]);
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    const overlay = page.locator('[data-note-overlay]');
    await expect(overlay).toBeVisible();
    await overlay.focus();
    await page.keyboard.press('Space');
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await expect(overlay).toBeHidden({ timeout: 10000 });
    await expect(editor(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
    await expect(editor(page)).toBeFocused();
    expect((await read(page)).notes.a.selected).toBe(true);
});

test('piano keys show a two-color focus indicator with at least 3:1 contrast against each key face', async ({
    page,
}) => {
    await page.keyboard.press('Tab'); // Establish keyboard focus after opening the disclosure by pointer.
    for (const pitch of [72, 70]) {
        const key = page.locator(`[data-piano-pitch="${pitch}"]`);
        await key.focus();
        await expect(key).toBeFocused();
        const indicator = await key.evaluate((element) => {
            const ring = getComputedStyle(element, '::after');
            const face = getComputedStyle(element.querySelector('span')!);
            const luminance = (color: string) => {
                const [red, green, blue] = color
                    .match(/[\d.]+/g)!
                    .slice(0, 3)
                    .map(Number)
                    .map((value) => {
                        const channel = value / 255;
                        return channel <= 0.04045
                            ? channel / 12.92
                            : ((channel + 0.055) / 1.055) ** 2.4;
                    });
                return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            };
            const shadowColor = ring.boxShadow.match(/rgba?\([^)]+\)/)?.[0];
            const contrasts = [ring.borderTopColor, shadowColor]
                .filter((color): color is string => !!color)
                .map((color) => {
                    const ringValue = luminance(color),
                        faceValue = luminance(face.backgroundColor);
                    return (
                        (Math.max(ringValue, faceValue) + 0.05) /
                        (Math.min(ringValue, faceValue) + 0.05)
                    );
                });
            return {
                content: ring.content,
                borderWidth: ring.borderTopWidth,
                shadow: ring.boxShadow,
                contrast: Math.max(...contrasts),
            };
        });
        expect(indicator.content).not.toBe('none');
        expect(indicator.borderWidth).toBe('2px');
        expect(indicator.shadow).not.toBe('none');
        expect(indicator.contrast).toBeGreaterThanOrEqual(3);
    }
});
