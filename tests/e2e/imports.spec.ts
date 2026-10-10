import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import type { Note } from '@/features/piano-roll/types';
import { sampleFile } from './helpers/sampleAudio';
import { installSampleProbe, sampleProbe } from './helpers/sampleProbe';
import { openInstrumentSettings } from './helpers/instrumentSettings';

const { Midi } = createRequire(import.meta.url)(
    '@tonejs/midi',
) as typeof import('@tonejs/midi');
const original: Note = {
    id: 'before-import',
    pitch: 64,
    startTick: 120,
    durationTicks: 240,
    velocity: 100,
    selected: true,
};

async function seed(page: Page, durationTicks = 240) {
    await page.evaluate(
        async (note) => {
            const path = '/src/features/piano-roll/store/useNoteStore.ts';
            const { useNoteStore } = (await import(
                path
            )) as typeof import('@/features/piano-roll/store/useNoteStore');
            useNoteStore.setState({
                notes: { [note.id]: note },
                undoStack: [],
                redoStack: [],
            });
        },
        { ...original, durationTicks },
    );
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

function midiFile() {
    const midi = new Midi();
    midi.header.fromJSON({
        ...midi.header.toJSON(),
        ppq: 960,
        tempos: [{ ticks: 0, bpm: 93 }],
    });
    midi.addTrack().addNote({
        midi: 72,
        ticks: 14,
        durationTicks: 26,
        velocity: 70 / 127,
    });
    midi.addTrack().addNote({
        midi: 60,
        ticks: 32000,
        durationTicks: 480,
        velocity: 1,
    });
    return {
        name: 'composition.mid',
        mimeType: 'audio/midi',
        buffer: Buffer.from(midi.toArray()),
    };
}

test('MIDI replacement preserves unsnapped timing, expands the timeline and restores the original selection on undo', async ({
    page,
}) => {
    await page.goto('/');
    await seed(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const button = page.getByRole('button', {
        name: 'Import MIDI',
        exact: true,
    });
    await button.focus();
    const chooserPending = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    await (await chooserPending).setFiles(midiFile());
    await expect(
        page.getByText('MIDI imported', { exact: true }),
    ).toBeVisible();
    await expect(button).toBeFocused();
    const after = await edits(page);
    expect(
        Object.values(after.notes).map(
            ({ pitch, startTick, durationTicks, velocity }) => ({
                pitch,
                startTick,
                durationTicks,
                velocity,
            }),
        ),
    ).toEqual([
        { pitch: 72, startTick: 7, durationTicks: 13, velocity: 70 },
        { pitch: 60, startTick: 16000, durationTicks: 240, velocity: 127 },
    ]);
    expect(after.undoStack).toHaveLength(1);
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('combobox', { name: 'Timeline length' }),
    ).toHaveText('16 bars');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await edits(page)).notes).toEqual({ [original.id]: original });
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect((await edits(page)).notes).toEqual(after.notes);
});

test('invalid events do not freeze the editor or change notes and a repeated file can be selected', async ({
    page,
}) => {
    await page.goto('/');
    await seed(page);
    const before = await edits(page);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const bad = Buffer.from([
        77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224, 77, 84, 114, 107, 0,
        0, 0, 8, 0, 255, 127, 143, 255, 255, 255, 120,
    ]);
    const input = page.getByLabel('MIDI file', { exact: true });
    await input.setInputFiles({
        name: 'broken.mid',
        mimeType: 'audio/midi',
        buffer: bad,
    });
    await expect(page.getByRole('alert')).toContainText(
        'invalid or incomplete event',
    );
    expect(await edits(page)).toEqual(before);
    await input.setInputFiles(midiFile());
    await expect(
        page.getByText('MIDI imported', { exact: true }),
    ).toBeVisible();
    const firstIds = Object.keys((await edits(page)).notes);
    await input.setInputFiles(midiFile());
    await expect.poll(async () => (await edits(page)).undoStack.length).toBe(2);
    expect(Object.keys((await edits(page)).notes)).not.toEqual(firstIds);
});

test('custom sample playback and key previews share decoded audio, remap root pitch and restore piano without note edits', async ({
    page,
}, testInfo) => {
    await installSampleProbe(page);
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await seed(page, 9600);
    const before = await edits(page);
    await openInstrumentSettings(page, true);
    await page.getByLabel('Instrument audio file').setInputFiles(sampleFile());
    await expect(
        page.getByText('instrument.wav ready', { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('combobox', { name: 'Sample root pitch' }),
    ).toContainText('C4 (MIDI 60)');
    const screenshotPath = testInfo.outputPath('import-settings.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('import-settings', {
        path: screenshotPath,
        contentType: 'image/png',
    });
    await page.keyboard.press('Escape');
    await page
        .getByRole('button', { name: 'Preview C5, MIDI pitch 72' })
        .click();
    const probe = () => sampleProbe(page);
    await expect.poll(async () => (await probe()).rates.length).toBe(1);
    expect((await probe()).rates[0]).toBeCloseTo(2);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect
        .poll(async () => (await probe()).rates.length)
        .toBeGreaterThanOrEqual(2);
    expect((await probe()).buffers[1]).toBe((await probe()).buffers[0]);
    await openInstrumentSettings(page, true);
    await page.getByRole('combobox', { name: 'Sample root pitch' }).click();
    await page
        .getByRole('option', { name: 'C5 (MIDI 72)', exact: true })
        .click();
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'Preview C5, MIDI pitch 72' })
        .click();
    await expect.poll(async () => (await probe()).rates.at(-1)).toBe(1);
    expect(await edits(page)).toEqual(before);
    await openInstrumentSettings(page, true);
    await page
        .getByRole('button', { name: 'Restore piano', exact: true })
        .click();
    await expect(
        page.getByText('Salamander Grand Piano', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    expect(await edits(page)).toEqual(before);
});

test('failed sample decode leaves the active instrument playable and MIDI import stops the previous session', async ({
    page,
}) => {
    await page.goto('/');
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await seed(page, 9600);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await openInstrumentSettings(page, true);
    await page.getByLabel('Instrument audio file').setInputFiles({
        name: 'broken.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.from('not audio'),
    });
    await expect(page.getByRole('alert')).toContainText('Could not decode');
    await expect(
        page.getByText('Salamander Grand Piano', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page
        .getByLabel('MIDI file', { exact: true })
        .setInputFiles(midiFile());
    await expect(
        page.getByText('MIDI imported', { exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});
