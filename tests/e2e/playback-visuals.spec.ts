import { expect, test, type Page } from '@playwright/test';

async function prepare(page: Page, durationTicks = 7680) {
    await page.goto('/');
    await page.evaluate(async (durationTicks) => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        const notes = [
            {
                id: 'held',
                pitch: 72,
                startTick: 0,
                durationTicks,
                velocity: 127,
                selected: false,
            },
        ];
        if (durationTicks > 960) {
            for (let index = 1; index < 8; index++) {
                notes.push({
                    id: `phrase-${index}`,
                    pitch: 72 - (index % 5) * 2,
                    startTick: index * 960,
                    durationTicks: 720,
                    velocity: 110,
                    selected: false,
                });
            }
        }
        useNoteStore.setState({
            notes: Object.fromEntries(notes.map((note) => [note.id, note])),
        });
    }, durationTicks);
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
}

async function position(page: Page) {
    return page.locator('[data-playhead]').evaluate((element) => ({
        tick: Number((element as HTMLCanvasElement).dataset.tick),
        x: Number((element as HTMLCanvasElement).dataset.x),
    }));
}

async function waveformPixels(page: Page) {
    return page.locator('[data-waveform]').evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext('2d')!;
        const pixels = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
        ).data;
        let count = 0;
        for (let y = 0; y < canvas.height; y++) {
            if (Math.abs(y - canvas.height / 2) < 2) continue;
            for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                if (
                    pixels[index] > 150 &&
                    pixels[index + 2] > 120 &&
                    pixels[index + 3] > 100
                )
                    count++;
            }
        }
        return count;
    });
}

test('runner follows playback, keeps keyboard focus, freezes on pause, and shows real audio beside Play', async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 980, height: 720 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await prepare(page);
    const editor = page.getByRole('group', {
        name: 'Piano roll editor',
        exact: true,
    });
    expect(await waveformPixels(page)).toBe(0);
    await editor.focus();
    await page.keyboard.press('Space');
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await expect.poll(() => waveformPixels(page)).toBeGreaterThan(5);
    await expect
        .poll(async () => (await position(page)).tick)
        .toBeGreaterThan(250);
    const linePixels = await page
        .locator('[data-playhead]')
        .evaluate((element) => {
            const canvas = element as HTMLCanvasElement;
            const x = Math.round(Number(canvas.dataset.x) * devicePixelRatio);
            const pixels = canvas
                .getContext('2d')!
                .getImageData(
                    Math.max(0, x - 2),
                    Math.round(80 * devicePixelRatio),
                    5,
                    1,
                ).data;
            return Array.from(pixels).filter(
                (value, index) => index % 4 === 3 && value > 0,
            ).length;
        });
    expect(linePixels).toBeGreaterThan(0);
    await expect
        .poll(async () => {
            const { tick, x } = await position(page);
            return tick * 0.5 - x;
        })
        .toBeGreaterThan(300);
    await expect(editor).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('playback.png') });
    await page.keyboard.press('Space');
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(350);
    const paused = await position(page);
    await page.waitForTimeout(300);
    expect(await position(page)).toEqual(paused);
    await expect.poll(() => waveformPixels(page)).toBe(0);
    await expect(editor).toBeFocused();
    await page.keyboard.press('Space');
    await expect
        .poll(async () => (await position(page)).tick)
        .toBeGreaterThan(paused.tick + 150);
    await expect(editor).toBeFocused();
    expect(errors).toEqual([]);
});

test('reduced motion keeps an accurate runner and suppresses waveform animation, including live preference changes', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepare(page);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect
        .poll(async () => (await position(page)).tick)
        .toBeGreaterThan(300);
    expect(await waveformPixels(page)).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => waveformPixels(page)).toBeGreaterThan(5);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => waveformPixels(page)).toBe(0);
    const before = (await position(page)).tick;
    await expect
        .poll(async () => (await position(page)).tick)
        .toBeGreaterThan(before + 150);
});

test('completion returns the runner to zero and a fresh replay starts it again', async ({
    page,
}) => {
    await prepare(page, 960);
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await play.click();
    await expect
        .poll(async () => (await position(page)).tick)
        .toBeGreaterThan(200);
    await expect(play).toBeVisible();
    await expect.poll(async () => (await position(page)).tick).toBe(0);
    await expect(play).toBeFocused();
    await play.click();
    await expect
        .poll(async () => (await position(page)).tick)
        .toBeGreaterThan(200);
});
