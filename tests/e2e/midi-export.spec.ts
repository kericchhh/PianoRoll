import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import type { Note } from '@/features/piano-roll/types';

const { Midi } = createRequire(import.meta.url)(
    '@tonejs/midi',
) as typeof import('@tonejs/midi');

const source: Note[] = [
    {
        id: 'held',
        pitch: 72,
        startTick: 0,
        durationTicks: 960,
        velocity: 127,
        selected: false,
    },
    {
        id: 'nested',
        pitch: 72,
        startTick: 240,
        durationTicks: 120,
        velocity: 70,
        selected: true,
    },
    {
        id: 'outside-timeline',
        pitch: 64,
        startTick: 50000,
        durationTicks: 240,
        velocity: 1,
        selected: false,
    },
    {
        id: 'silent',
        pitch: 72,
        startTick: 120,
        durationTicks: 120,
        velocity: 0,
        selected: true,
    },
];

test('keyboard export downloads real MIDI with faithful notes and leaves selection and history unchanged', async ({
    page,
}) => {
    const serializerRequests: string[] = [];
    page.on('request', (request) => {
        if (request.url().includes('/midi/serializeMidi'))
            serializerRequests.push(request.url());
    });
    await page.goto('/');
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
        useNoteStore.getState().moveNote('held', 120, 72);
        useNoteStore.getState().undo();
    }, source);
    const snapshot = () =>
        page.evaluate(async () => {
            const path = '/src/features/piano-roll/store/useNoteStore.ts';
            const { useNoteStore } = (await import(
                path
            )) as typeof import('@/features/piano-roll/store/useNoteStore');
            const { notes, undoStack, redoStack } = useNoteStore.getState();
            return { notes, undoStack, redoStack };
        });
    const before = await snapshot();
    expect(serializerRequests).toHaveLength(0);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    expect(serializerRequests).toHaveLength(0);
    const button = page.getByRole('button', {
        name: 'Export MIDI',
        exact: true,
    });
    await button.focus();
    const downloadPending = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const download = await downloadPending;
    expect(download.suggestedFilename()).toBe('piano-roll.mid');
    const path = await download.path();
    if (!path) throw new Error('Expected a MIDI download');
    const parsed = new Midi(await readFile(path));
    expect(parsed.header.ppq).toBe(480);
    expect(parsed.header.timeSignatures[0].timeSignature).toEqual([4, 4]);
    expect(parsed.header.tempos[0].bpm).toBe(120);
    expect(parsed.tracks).toHaveLength(2);
    const decoded = parsed.tracks
        .flatMap((track) =>
            track.notes.map((note) => ({
                pitch: note.midi,
                startTick: note.ticks,
                durationTicks: note.durationTicks,
                velocity: Math.round(note.velocity * 127),
            })),
        )
        .sort((a, b) => a.startTick - b.startTick);
    expect(decoded).toEqual(
        source
            .filter((note) => note.velocity > 0)
            .map(({ pitch, startTick, durationTicks, velocity }) => ({
                pitch,
                startTick,
                durationTicks,
                velocity,
            })),
    );
    expect(await snapshot()).toEqual(before);
    expect(serializerRequests).toHaveLength(1);
    await expect(button).toBeFocused();
    await expect(page.getByText('MIDI download started')).toBeVisible();
    await expect(
        page.getByText('3 notes exported. 1 silent note omitted.'),
    ).toBeVisible();
    await expect(
        page.getByRole('region', { name: /Notifications/ }),
    ).toHaveAttribute('aria-live', 'polite');
});

test('an empty project exports valid MIDI with Space without activating playback', async ({
    page,
}) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const button = page.getByRole('button', {
        name: 'Export MIDI',
        exact: true,
    });
    await button.focus();
    const downloadPending = page.waitForEvent('download');
    await page.keyboard.press('Space');
    const download = await downloadPending;
    const path = await download.path();
    if (!path) throw new Error('Expected a MIDI download');
    const parsed = new Midi(await readFile(path));
    expect(parsed.tracks.flatMap((track) => track.notes)).toEqual([]);
    expect(parsed.header.ppq).toBe(480);
    await expect(button).toBeFocused();
    await expect(page.getByText('0 notes exported.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});
