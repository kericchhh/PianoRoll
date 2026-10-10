import { expect, test } from '@playwright/test';

test('wheel over keys scrolls the matching canvas notes, preserves edits and remains bounded', async ({
    page,
}) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        useNoteStore.setState({
            notes: {
                a: {
                    id: 'a',
                    pitch: 72,
                    startTick: 120,
                    durationTicks: 240,
                    velocity: 100,
                    selected: true,
                },
            },
            undoStack: [],
            redoStack: [],
        });
    });
    const overlay = page.locator('[data-note-overlay]');
    await expect(overlay).toBeVisible();
    const original = await overlay.boundingBox();
    const keys = page.getByRole('group', { name: 'Piano keys' });
    await keys.hover();
    await page.mouse.wheel(0, -100);
    await expect(keys.locator('[data-piano-pitch]').first()).toHaveAttribute(
        'data-piano-pitch',
        '77',
    );
    await expect
        .poll(async () => (await overlay.boundingBox())?.y)
        .toBe(original!.y + 100);
    await page.mouse.wheel(0, 100);
    await expect(keys.locator('[data-piano-pitch]').first()).toHaveAttribute(
        'data-piano-pitch',
        '72',
    );
    await expect
        .poll(async () => (await overlay.boundingBox())?.y)
        .toBe(original!.y);
    await page.mouse.wheel(0, -10000);
    await expect(keys.locator('[data-piano-pitch]').first()).toHaveAttribute(
        'data-piano-pitch',
        '127',
    );
    await page.mouse.wheel(0, 10000);
    await expect(keys.locator('[data-piano-pitch]').last()).toHaveAttribute(
        'data-piano-pitch',
        '0',
    );
    const state = await page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        return {
            note: useNoteStore.getState().notes.a,
            history: useNoteStore.getState().undoStack.length,
        };
    });
    expect(state.note).toMatchObject({
        pitch: 72,
        startTick: 120,
        durationTicks: 240,
        selected: true,
    });
    expect(state.history).toBe(0);
});

test('arrow navigation scrolls at the visible edge and wheel keeps focus within keys without auditioning', async ({
    page,
}) => {
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    const keys = page.getByRole('group', { name: 'Piano keys' });
    await page
        .getByRole('button', { name: 'Preview C5, MIDI pitch 72' })
        .focus();
    await page.keyboard.press('ArrowUp');
    await expect(
        page.getByRole('button', { name: 'Preview C#5, MIDI pitch 73' }),
    ).toBeFocused();
    await keys.hover();
    await page.mouse.wheel(0, 10000);
    await expect
        .poll(() => keys.locator('[data-piano-pitch]:focus').count())
        .toBe(1);
    await expect(keys.locator('[data-piano-pitch]').last()).toHaveAttribute(
        'data-piano-pitch',
        '0',
    );
    await expect(page.locator('.piano-key[tabindex="0"]')).toHaveCount(1);
    await expect(page.locator('.piano-key[data-pressed="true"]')).toHaveCount(
        0,
    );
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});

test('scrolling at a pitch boundary does not retain stale key focus', async ({
    page,
}) => {
    await page.goto('/');
    const keys = page.getByRole('group', { name: 'Piano keys' });
    await keys.hover();
    await page.mouse.wheel(0, -10000);
    const firstKey = keys.locator('[data-piano-pitch]').first();
    await expect(firstKey).toHaveAttribute('data-piano-pitch', '127');
    await firstKey.focus();
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(100);
    const settings = page.getByRole('button', {
        name: 'Settings',
        exact: true,
    });
    await settings.focus();
    await keys.hover();
    await page.mouse.wheel(0, 100);
    await expect(firstKey).toHaveAttribute('data-piano-pitch', '122');
    await expect(settings).toBeFocused();
});

test('resizing at the bottom pitch bound fills the taller key viewport', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 540 });
    await page.goto('/');
    const keys = page.getByRole('group', { name: 'Piano keys' });
    const pitches = keys.locator('[data-piano-pitch]');
    await keys.hover();
    await page.mouse.wheel(0, 10000);
    await expect(pitches.last()).toHaveAttribute('data-piano-pitch', '0');
    const originalRows = await pitches.count();
    await page.setViewportSize({ width: 1280, height: 1003 });
    await expect.poll(() => pitches.count()).toBeGreaterThan(originalRows);
    await expect(pitches.last()).toHaveAttribute('data-piano-pitch', '0');
    const bounds = await keys.boundingBox();
    await expect(pitches).toHaveCount(
        Math.min(128, Math.floor(bounds!.height / 20)),
    );
    const lastKey = await pitches.last().boundingBox();
    expect(lastKey!.y + lastKey!.height).toBeLessThanOrEqual(
        bounds!.y + bounds!.height,
    );
});
