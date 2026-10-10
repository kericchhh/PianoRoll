import { expect, test, type Page } from '@playwright/test';

type PreviewProbe = {
    starts: { voice: number; buffer: number }[];
    stops: number[];
};
type PreviewWindow = Window & { __previewProbe?: PreviewProbe };

async function installAudioProbe(page: Page) {
    await page.addInitScript(() => {
        const probe: PreviewProbe = { starts: [], stops: [] };
        (window as PreviewWindow).__previewProbe = probe;
        const voices = new WeakMap<AudioBufferSourceNode, number>();
        const buffers = new WeakMap<AudioBuffer, number>();
        let nextBuffer = 0;
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
            if (this.buffer && this.buffer.duration > 1) {
                const voice = probe.starts.length;
                voices.set(this, voice);
                if (!buffers.has(this.buffer)) {
                    buffers.set(this.buffer, nextBuffer++);
                }
                probe.starts.push({
                    voice,
                    buffer: buffers.get(this.buffer)!,
                });
            }
            start.apply(this, args);
        };
        const stop = AudioBufferSourceNode.prototype.stop;
        AudioBufferSourceNode.prototype.stop = function (...args) {
            const voice = voices.get(this);
            if (voice !== undefined) probe.stops.push(voice);
            stop.apply(this, args);
        };
    });
}

const readProbe = (page: Page) =>
    page.evaluate(() => (window as PreviewWindow).__previewProbe!);

async function readEdits(page: Page) {
    return page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        const { notes, undoStack, redoStack } = useNoteStore.getState();
        return { notes, undoStack, redoStack };
    });
}

test('pointer press depresses a neutral key face, plays once, and keeps the hit area and notes fixed', async ({
    page,
}, testInfo) => {
    await installAudioProbe(page);
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    const key = page.getByRole('button', {
        name: 'Preview C5, MIDI pitch 72',
    });
    const face = key.locator('.piano-key-face');
    const before = await readEdits(page);
    const bounds = (await key.boundingBox())!;
    const finish = await face.evaluate((element) => ({
        color: getComputedStyle(element).backgroundColor,
        shadow: getComputedStyle(element).boxShadow,
        transform: getComputedStyle(element).transform,
    }));
    await key.hover();
    await page.mouse.down();
    await expect(key).toHaveAttribute('data-pressed', 'true');
    await expect
        .poll(async () => (await readProbe(page)).starts.length)
        .toBe(1);
    await expect
        .poll(() =>
            face.evaluate((element) => getComputedStyle(element).boxShadow),
        )
        .toContain('0.35');
    expect(await key.boundingBox()).toEqual(bounds);
    expect(
        await face.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        ),
    ).toBe(finish.color);
    expect(
        await face.evaluate((element) => getComputedStyle(element).transform),
    ).not.toBe(finish.transform);
    const screenshotPath = testInfo.outputPath('piano-key-pressed.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('neutral-key-depression', {
        path: screenshotPath,
        contentType: 'image/png',
    });
    await page.mouse.move(bounds.x + bounds.width + 40, bounds.y + 10);
    await page.mouse.up();
    await expect(key).toHaveAttribute('data-pressed', 'false');
    await expect.poll(async () => (await readProbe(page)).stops).toContain(0);
    expect((await readProbe(page)).starts).toHaveLength(1);
    expect(await readEdits(page)).toEqual(before);
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});

test('keyboard preview ignores held-key repeats and supports roving focus without starting playback', async ({
    page,
}) => {
    await installAudioProbe(page);
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    const before = await readEdits(page);
    const c = page.getByRole('button', { name: 'Preview C5, MIDI pitch 72' });
    await c.focus();
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await expect(c).toHaveAttribute('data-pressed', 'true');
    await page.keyboard.up('Space');
    await expect(c).toHaveAttribute('data-pressed', 'false');
    await expect
        .poll(async () => (await readProbe(page)).starts.length)
        .toBe(1);
    await page.keyboard.press('ArrowDown');
    const b = page.getByRole('button', { name: 'Preview B4, MIDI pitch 71' });
    await expect(b).toBeFocused();
    expect((await readProbe(page)).starts).toHaveLength(1);
    await page.keyboard.press('Enter');
    await expect
        .poll(async () => (await readProbe(page)).starts.length)
        .toBe(2);
    await expect(page.locator('.piano-key[tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(b).not.toBeFocused();
    expect(await readEdits(page)).toEqual(before);
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});

test('live reduced-motion preference keeps the key face still with neutral pressed feedback', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await installAudioProbe(page);
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const pitch of [72, 70]) {
        const key = page.locator(`[data-piano-pitch="${pitch}"]`);
        const face = key.locator('span').first();
        const color = await face.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        );
        await key.hover();
        await page.mouse.down();
        await expect(key).toHaveAttribute('data-pressed', 'true');
        await expect
            .poll(() =>
                face.evaluate((element) => getComputedStyle(element).boxShadow),
            )
            .toContain('0.35');
        expect(
            await face.evaluate(
                (element) => getComputedStyle(element).transform,
            ),
        ).toBe('none');
        expect(
            await face.evaluate(
                (element) => getComputedStyle(element).backgroundColor,
            ),
        ).toBe(color);
        await page.mouse.up();
        await expect(key).toHaveAttribute('data-pressed', 'false');
    }
    await expect
        .poll(async () => (await readProbe(page)).starts.length)
        .toBe(2);
});

test('audition shares decoded piano samples and releases its own voice while playback keeps sounding', async ({
    page,
}) => {
    await installAudioProbe(page);
    const sampleRequests: string[] = [];
    page.on('request', (request) => {
        if (request.url().includes('/audio/piano/'))
            sampleRequests.push(request.url());
    });
    await page.goto('/');
    await page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        useNoteStore.getState().addNote({
            id: 'held',
            pitch: 72,
            startTick: 0,
            durationTicks: 9600,
            velocity: 100,
            selected: true,
        });
    });
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    const before = await readEdits(page);
    const downloadsBefore = sampleRequests.length;
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect
        .poll(async () => (await readProbe(page)).starts.length)
        .toBe(1);
    await page
        .getByRole('button', { name: 'Preview C5, MIDI pitch 72' })
        .click();
    await expect
        .poll(async () => (await readProbe(page)).starts.length)
        .toBe(2);
    await expect.poll(async () => (await readProbe(page)).stops).toContain(1);
    const probe = await readProbe(page);
    expect(probe.starts[0].buffer).toBe(probe.starts[1].buffer);
    expect(probe.stops).not.toContain(0);
    expect(sampleRequests).toHaveLength(downloadsBefore);
    expect(await readEdits(page)).toEqual(before);
    const pause = page.getByRole('button', { name: 'Pause', exact: true });
    await expect(pause).toBeVisible();
    await pause.click();
    await expect.poll(async () => (await readProbe(page)).stops).toContain(0);
});
