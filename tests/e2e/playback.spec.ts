import { expect, test } from '@playwright/test';

test('holding Space on a note-list button toggles playback once without a native selection click', async ({
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
                    startTick: 0,
                    durationTicks: 48000,
                    velocity: 100,
                    selected: true,
                },
            },
        });
    });
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    const note = page.getByRole('button', { name: /Pitch 72, tick 0,/ });
    await note.focus();
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await page.keyboard.down('Space');
    await page.keyboard.up('Space');
    await expect(note).toHaveAttribute('aria-pressed', 'true');
    await expect(note).toBeFocused();
    await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(note).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Space');
    await expect(note).toHaveAttribute('aria-pressed', 'false');
    await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible();
});

test('pause releases held samples, resume reattacks, and completed playback can replay', async ({
    page,
}) => {
    const errors: string[] = [];
    const sampleResponses: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
        if (response.url().includes('/audio/piano/') && response.ok()) {
            sampleResponses.push(response.url());
        }
    });
    await page.addInitScript(() => {
        const sampleGains = new WeakSet<AudioParam>();
        const connectSample = AudioBufferSourceNode.prototype.connect;
        function trackSampleConnect(
            this: AudioBufferSourceNode,
            destination: AudioNode,
            output?: number,
            input?: number,
        ): AudioNode;
        function trackSampleConnect(
            this: AudioBufferSourceNode,
            destination: AudioParam,
            output?: number,
        ): void;
        function trackSampleConnect(
            this: AudioBufferSourceNode,
            ...args: [AudioNode | AudioParam, number?, number?]
        ): AudioNode | void {
            if (
                this.buffer &&
                this.buffer.duration > 1 &&
                args[0] instanceof GainNode
            ) {
                sampleGains.add(args[0].gain);
            }
            Reflect.apply(connectSample, this, args);
            if (args[0] instanceof AudioNode) return args[0];
        }
        AudioBufferSourceNode.prototype.connect = trackSampleConnect;
        for (const method of [
            'setValueAtTime',
            'linearRampToValueAtTime',
            'setTargetAtTime',
        ] as const) {
            const original = AudioParam.prototype[method];
            AudioParam.prototype[method] = function (
                this: AudioParam,
                value: number,
                time: number,
                timeConstant?: number,
            ) {
                if (sampleGains.has(this) && value === 0) {
                    const playbackWindow = window as Window & {
                        __pianoSampleReleases?: number;
                    };
                    playbackWindow.__pianoSampleReleases =
                        (playbackWindow.__pianoSampleReleases ?? 0) + 1;
                }
                const args =
                    timeConstant === undefined
                        ? [value, time]
                        : [value, time, timeConstant];
                Reflect.apply(original, this, args);
                return this;
            };
        }
        const startSample = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
            if (this.buffer && this.buffer.duration > 1) {
                const playbackWindow = window as Window & {
                    __pianoSampleStarts?: number;
                };
                playbackWindow.__pianoSampleStarts =
                    (playbackWindow.__pianoSampleStarts ?? 0) + 1;
            }
            startSample.apply(this, args);
        };
        window.AudioContext = new Proxy(window.AudioContext, {
            construct(target, args) {
                const context = Reflect.construct(target, args);
                Object.defineProperty(window, '__pianoContext', {
                    value: context,
                    configurable: true,
                });
                return context;
            },
        });
    });
    let releaseSample!: () => void;
    const sampleGate = new Promise<void>((resolve) => {
        releaseSample = resolve;
    });
    await page.route('**/audio/piano/A0.mp3', async (route) => {
        await sampleGate;
        await route.continue();
    });
    await page.goto('/');
    await page.evaluate(async () => {
        const path = '/src/features/piano-roll/store/useNoteStore.ts';
        const { useNoteStore } = (await import(
            path
        )) as typeof import('@/features/piano-roll/store/useNoteStore');
        useNoteStore.setState({
            notes: {
                first: {
                    id: 'first',
                    pitch: 60,
                    startTick: 0,
                    durationTicks: 4800,
                    velocity: 127,
                    selected: false,
                },
                second: {
                    id: 'second',
                    pitch: 64,
                    startTick: 3840,
                    durationTicks: 240,
                    velocity: 100,
                    selected: false,
                },
            },
        });
    });
    const play = page.getByRole('button', { name: 'Play', exact: true });
    const editor = page.getByRole('group', {
        name: 'Piano roll editor',
        exact: true,
    });
    try {
        await editor.focus();
        await page.keyboard.press('Space');
        await expect(
            page.getByText('Loading piano samples…', { exact: true }),
        ).toBeVisible();
    } finally {
        releaseSample();
    }
    await expect(page.getByText('Piano ready', { exact: true })).toBeVisible();
    await expect(editor).toBeFocused();
    expect(
        await page.evaluate(
            () =>
                (window as Window & { __pianoSampleStarts?: number })
                    .__pianoSampleStarts ?? 0,
        ),
    ).toBe(0);
    await play.focus();
    await page.keyboard.press('Enter');
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    (window as Window & { __pianoContext?: AudioContext })
                        .__pianoContext?.state,
            ),
        )
        .toBe('running');
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    (window as Window & { __pianoSampleStarts?: number })
                        .__pianoSampleStarts ?? 0,
            ),
        )
        .toBe(1);
    const pause = page.getByRole('button', { name: 'Pause', exact: true });
    await expect(pause).toBeFocused();
    await expect(pause.locator('svg.lucide-pause')).toHaveCount(1);
    const releasesBeforePause = await page.evaluate(
        () =>
            (window as Window & { __pianoSampleReleases?: number })
                .__pianoSampleReleases ?? 0,
    );
    await editor.focus();
    await page.keyboard.press('Space');
    await expect(editor).toBeFocused();
    await expect(play.locator('svg.lucide-play')).toHaveCount(1);
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    (window as Window & { __pianoSampleReleases?: number })
                        .__pianoSampleReleases ?? 0,
            ),
        )
        .toBeGreaterThan(releasesBeforePause);
    await page.waitForTimeout(1250);
    expect(
        await page.evaluate(
            () =>
                (window as Window & { __pianoSampleStarts?: number })
                    .__pianoSampleStarts ?? 0,
        ),
    ).toBe(1);
    const noteButton = page.getByRole('button', { name: /Pitch 60, tick 0,/ });
    await noteButton.focus();
    await page.keyboard.press('Space');
    await expect(noteButton).toBeFocused();
    await expect(noteButton).toHaveAttribute('aria-pressed', 'false');
    await expect(pause).toBeVisible();
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    (window as Window & { __pianoSampleStarts?: number })
                        .__pianoSampleStarts ?? 0,
            ),
        )
        .toBe(2);
    await expect
        .poll(
            () =>
                page.evaluate(
                    () =>
                        (window as Window & { __pianoSampleStarts?: number })
                            .__pianoSampleStarts ?? 0,
                ),
            { timeout: 7000 },
        )
        .toBe(3);
    await expect(noteButton).toBeFocused();
    await expect(play.locator('svg.lucide-play')).toHaveCount(1);
    await play.focus();
    await page.keyboard.press('Space');
    await expect(pause).toBeFocused();
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    (window as Window & { __pianoSampleStarts?: number })
                        .__pianoSampleStarts ?? 0,
            ),
        )
        .toBe(4);
    await page.keyboard.press('Space');
    await expect(play).toBeFocused();
    expect(new Set(sampleResponses).size).toBe(30);
    expect(
        sampleResponses.every(
            (url) => new URL(url).origin === 'http://127.0.0.1:5173',
        ),
    ).toBe(true);
    expect(errors).toEqual([]);
});
