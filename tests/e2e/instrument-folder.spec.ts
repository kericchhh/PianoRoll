import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { sampleFile } from './helpers/sampleAudio';
import { installSampleProbe, sampleProbe } from './helpers/sampleProbe';
import { openInstrumentSettings } from './helpers/instrumentSettings';

const folders: string[] = [];
test.afterEach(async () => {
    await Promise.all(
        folders
            .splice(0)
            .map((folder) => rm(folder, { recursive: true, force: true })),
    );
});

async function folder(files: Record<string, Buffer | string>) {
    const parent = await mkdtemp(join(tmpdir(), 'piano-roll-instrument-'));
    folders.push(parent);
    const path = join(parent, 'Test Synth');
    for (const [name, bytes] of Object.entries(files)) {
        const target = join(path, name);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, bytes);
    }
    return path;
}

async function openFolder(page: Page, path: string) {
    await openInstrumentSettings(page);
    const button = page.getByRole('button', {
        name: 'Import instrument folder',
    });
    await button.focus();
    const pending = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    await (await pending).setFiles(path);
    await expect(
        page.getByRole('list', { name: 'Sample pitch assignments' }),
    ).toBeVisible();
}

test('a real sample folder detects nested Ds/Fs filenames, uses different roots and shares each sample between playback and keys', async ({
    page,
}) => {
    await installSampleProbe(page, [1, 2, 0.5]);
    const path = await folder({
        'C4.wav': sampleFile('C4.wav', 60).buffer,
        'nested/Fs4.wav': sampleFile('Fs4.wav', 66, 0.5).buffer,
        'nested/Ds4.wav': sampleFile('Ds4.wav', 63, 0.5).buffer,
        'C5.wav': sampleFile('C5.wav', 72, 2).buffer,
        'README.md': 'metadata',
    });
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await openFolder(page, path);
    const assignments = page.getByRole('list', {
        name: 'Sample pitch assignments',
    });
    await expect(assignments.getByRole('listitem')).toHaveCount(4);
    await expect(
        page.getByRole('spinbutton', {
            name: 'Root pitch for Test Synth/nested/Fs4.wav',
        }),
    ).toHaveValue('66');
    await expect(
        page.getByRole('spinbutton', {
            name: 'Root pitch for Test Synth/nested/Ds4.wav',
        }),
    ).toHaveValue('63');
    await page
        .getByRole('button', { name: 'Load instrument', exact: true })
        .click();
    await expect(
        page.getByText('Test Synth ready', { exact: true }),
    ).toBeVisible();
    await expect(assignments).toHaveCount(0);
    await expect(
        page.getByText('Test Synth · 4 samples', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page
        .getByRole('button', { name: 'Preview C5, MIDI pitch 72' })
        .click();
    await expect
        .poll(async () => (await sampleProbe(page)).durations.at(-1))
        .toBe(2);
    expect((await sampleProbe(page)).rates.at(-1)).toBeCloseTo(1);
    const previewBuffer = (await sampleProbe(page)).buffers.at(-1);
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
                    startTick: 0,
                    durationTicks: 240,
                    velocity: 100,
                    selected: false,
                },
            },
        });
    });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect
        .poll(async () => (await sampleProbe(page)).rates.length)
        .toBe(2);
    expect((await sampleProbe(page)).buffers.at(-1)).toBe(previewBuffer);
    await page
        .getByRole('button', { name: 'Preview F#4, MIDI pitch 66' })
        .click();
    await expect
        .poll(async () => (await sampleProbe(page)).durations.at(-1))
        .toBe(0.5);
    expect((await sampleProbe(page)).buffers.at(-1)).not.toBe(previewBuffer);
    expect((await sampleProbe(page)).rates.at(-1)).toBeCloseTo(1);
});

test('manual assignments and removing duplicate roots are keyboard operable before loading', async ({
    page,
}) => {
    const path = await folder({
        'C4.wav': sampleFile().buffer,
        'C4_duplicate.wav': sampleFile().buffer,
        'lead.wav': sampleFile('lead.wav', 72, 2).buffer,
    });
    await page.goto('/');
    await openFolder(page, path);
    const load = page.getByRole('button', {
        name: 'Load instrument',
        exact: true,
    });
    await load.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText('More than one sample');
    const remove = page.getByRole('button', {
        name: 'Remove Test Synth/C4_duplicate.wav',
    });
    await remove.focus();
    await page.keyboard.press('Enter');
    const pitch = page.getByRole('spinbutton', {
        name: 'Root pitch for Test Synth/lead.wav',
    });
    await pitch.fill('72');
    await load.focus();
    await page.keyboard.press('Enter');
    await expect(
        page.getByText('Test Synth ready', { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText('Test Synth · 2 samples', { exact: true }),
    ).toBeVisible();
    await expect
        .poll(() =>
            page
                .getByRole('dialog', { name: 'Settings' })
                .evaluate((panel) => panel.contains(document.activeElement)),
        )
        .toBe(true);
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('button', { name: 'Settings', exact: true }),
    ).toBeFocused();
});

test('one broken file preserves the whole active instrument and its playback', async ({
    page,
}) => {
    const path = await folder({
        'C4.wav': sampleFile().buffer,
        'C5.wav': Buffer.from('broken audio'),
    });
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await openInstrumentSettings(page, true);
    await page
        .getByLabel('Instrument audio file')
        .setInputFiles(sampleFile('Original.wav'));
    await expect(
        page.getByText('Original.wav ready', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        useNoteStore.setState({
            notes: {
                a: {
                    id: 'a',
                    pitch: 60,
                    startTick: 0,
                    durationTicks: 9600,
                    velocity: 100,
                    selected: true,
                },
            },
            undoStack: [],
            redoStack: [],
        });
    });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await openFolder(page, path);
    await page
        .getByRole('button', { name: 'Load instrument', exact: true })
        .click();
    await expect(page.getByRole('alert')).toContainText(
        'Could not decode C5.wav',
    );
    await expect(
        page.getByText('Original.wav · 1 sample', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
});

test('the bundled piano sample folder can replace the instrument and restore cleanly', async ({
    page,
}) => {
    await page.goto('/');
    await openFolder(page, join(process.cwd(), 'public/audio/piano'));
    await expect(
        page
            .getByRole('list', { name: 'Sample pitch assignments' })
            .getByRole('listitem'),
    ).toHaveCount(30);
    await page
        .getByRole('button', { name: 'Load instrument', exact: true })
        .click();
    await expect(page.getByText('piano ready', { exact: true })).toBeVisible({
        timeout: 20000,
    });
    await expect(
        page.getByText('piano · 30 samples', { exact: true }),
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'Restore piano', exact: true })
        .click();
    await expect(
        page.getByText('Salamander Grand Piano', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
});

test('the sidebar stays fixed and only the sample list scrolls at a smaller window height', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await page.goto('/');
    await openFolder(page, join(process.cwd(), 'public/audio/piano'));
    const panel = page.getByRole('dialog', { name: 'Settings' });
    const list = page.getByRole('list', { name: 'Sample pitch assignments' });
    const originalBounds = await panel.boundingBox();
    await list.hover();
    await page.mouse.wheel(0, 400);
    await expect
        .poll(() => list.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
    expect(await panel.boundingBox()).toEqual(originalBounds);
    expect(
        await panel.evaluate((element) => ({
            top: element.scrollTop,
            overflow: getComputedStyle(element).overflowY,
        })),
    ).toEqual({ top: 0, overflow: 'hidden' });
    const loadBounds = await page
        .getByRole('button', { name: 'Load instrument', exact: true })
        .boundingBox();
    const cancelBounds = await page
        .getByRole('button', { name: 'Cancel folder import' })
        .boundingBox();
    expect(loadBounds!.y + loadBounds!.height).toBeLessThanOrEqual(600);
    expect(cancelBounds!.y + cancelBounds!.height).toBeLessThanOrEqual(600);
    const lastPitch = list.getByRole('spinbutton').last();
    await lastPitch.focus();
    await expect(lastPitch).toBeInViewport();
    expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
});

test('single-sample error and restore controls remain reachable in the fixed sidebar at a smaller height', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await page.goto('/');
    await openInstrumentSettings(page, true);
    const input = page.getByLabel('Instrument audio file');
    await input.setInputFiles(sampleFile('Original.wav'));
    await expect(
        page.getByText('Original.wav ready', { exact: true }),
    ).toBeVisible();
    await input.setInputFiles({
        name: 'broken.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.from('broken audio'),
    });
    const error = page.getByRole('alert');
    await expect(error).toContainText('Could not decode');
    await expect(error).toBeInViewport({ ratio: 1 });
    const restore = page.getByRole('button', {
        name: 'Restore piano',
        exact: true,
    });
    await expect(restore).toBeInViewport({ ratio: 1 });
    const panel = page.getByRole('dialog', { name: 'Settings' });
    await restore.focus();
    await expect(restore).toBeFocused();
    expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
    await page.keyboard.press('Enter');
    await expect(
        page.getByText('Salamander Grand Piano', { exact: true }),
    ).toBeVisible();
});
