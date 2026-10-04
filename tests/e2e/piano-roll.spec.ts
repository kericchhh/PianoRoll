import { expect, test, type Page } from '@playwright/test';
import type { Note } from '@/features/piano-roll/types';

const base: Note = {
  id: 'a',
  pitch: 72,
  startTick: 120,
  durationTicks: 120,
  velocity: 100,
  selected: true,
};
async function seed(page: Page, notes: Note[]) {
  await page.evaluate(async (notes) => {
    const path = '/src/features/piano-roll/store/useNoteStore.ts';
    const { useNoteStore } = (await import(
      path
    )) as typeof import('@/features/piano-roll/store/useNoteStore');
    useNoteStore.setState({
      notes: Object.fromEntries(notes.map((note) => [note.id, note])),
    });
  }, notes);
}
async function readNotes(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/features/piano-roll/store/useNoteStore.ts';
    const { useNoteStore } = (await import(
      path
    )) as typeof import('@/features/piano-roll/store/useNoteStore');
    return useNoteStore.getState().notes;
  });
}
async function position(page: Page, x: number, y: number) {
  return page.getByRole('img', { name: 'Time grid preview' }).evaluate(
    (element, point) => {
      const canvas = element as HTMLCanvasElement;
      const bounds = canvas.getBoundingClientRect();
      return {
        x:
          bounds.x +
          canvas.clientLeft +
          (point.x * canvas.clientWidth) / Number(canvas.dataset.logicalWidth),
        y:
          bounds.y +
          canvas.clientTop +
          (point.y * canvas.clientHeight) /
            Number(canvas.dataset.logicalHeight),
      };
    },
    { x, y },
  );
}
async function viewportSize(page: Page) {
  return page
    .getByRole('img', { name: 'Time grid preview' })
    .evaluate((canvas) => ({
      width: Number((canvas as HTMLCanvasElement).dataset.logicalWidth),
      height: Number((canvas as HTMLCanvasElement).dataset.logicalHeight),
    }));
}
async function waitForCanvasSize(page: Page) {
  await expect
    .poll(() =>
      page
        .getByRole('img', { name: 'Time grid preview' })
        .evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          const panel = canvas.parentElement?.getBoundingClientRect();
          return (
            Number(canvas.dataset.logicalWidth) ===
              Math.floor(panel?.width ?? 0) &&
            Number(canvas.dataset.logicalHeight) ===
              Math.floor(panel?.height ?? 0)
          );
        }),
    )
    .toBe(true);
}
async function move(page: Page, x: number, y: number) {
  const point = await position(page, x, y);
  await page.mouse.move(point.x, point.y);
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForCanvasSize(page);
});

test('keyboard-only insertion, movement, reveal and deletion', async ({
  page,
}) => {
  await page.keyboard.press('Tab'); // timeline
  await expect(
    page.getByRole('combobox', { name: 'Timeline length' }),
  ).toBeFocused();
  await page.keyboard.press('Tab'); // pitch
  await page.keyboard.press('Tab'); // tick
  await page.keyboard.press('Tab'); // add
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Added pitch 72 at tick 0');
  await page
    .getByRole('group', { name: 'Piano roll editor', exact: true })
    .focus();
  await page.keyboard.press('ArrowUp');
  const overlay = page.getByRole('group', { name: /Selected note: pitch 73/ });
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS('top', '0px');
  await page.keyboard.press('Delete');
  expect(await readNotes(page)).toEqual({});
});

test('real Radix menu navigation cannot move or delete the selection', async ({
  page,
}) => {
  await seed(page, [base]);
  await move(page, 65, 10);
  await page.mouse.click(
    (await position(page, 65, 10)).x,
    (await position(page, 65, 10)).y,
    { button: 'right' },
  );
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Delete');
  expect(await readNotes(page)).toEqual({ a: base });
  await expect(page.getByRole('menu')).toBeVisible();
});

test('native note drag previews then commits without a generated add click', async ({
  page,
}) => {
  await seed(page, [base]);
  await move(page, 65, 10);
  await page.mouse.down();
  await move(page, 125, 30);
  expect((await readNotes(page)).a).toEqual(base);
  await page.mouse.up();
  await expect
    .poll(async () => (await readNotes(page)).a)
    .toMatchObject({ startTick: 240, pitch: 71 });
  expect(Object.keys(await readNotes(page))).toEqual(['a']);
});

test('native right-edge resize previews the selected group and commits its durations', async ({
  page,
}) => {
  const other = {
    ...base,
    id: 'b',
    startTick: 360,
    pitch: 71,
    durationTicks: 240,
  };
  await seed(page, [base, other]);
  const overlay = page.getByRole('group', { name: /Selected note: pitch 72/ });
  const initialWidth = (await overlay.boundingBox())?.width;
  if (!initialWidth) throw new Error('Selected note overlay is not visible');
  await move(page, 115, 10);
  await page.mouse.down();
  await move(page, 175, 80);

  expect(await readNotes(page)).toEqual({ a: base, b: other });
  await expect
    .poll(async () => (await overlay.boundingBox())?.width ?? 0)
    .toBeCloseTo(initialWidth * 2, 1);
  await page.mouse.up();

  await expect
    .poll(() => readNotes(page))
    .toEqual({
      a: { ...base, durationTicks: 240 },
      b: { ...other, durationTicks: 360 },
    });
  await expect(page.getByRole('status')).toHaveText(
    /Resized 2 notes.*duration 240 ticks/,
  );
  // The duration update must invalidate the hit-test index as well as the drawing.
  const point = await position(page, 150, 10);
  await page.mouse.click(point.x, point.y);
  expect(Object.keys(await readNotes(page))).toEqual(['a', 'b']);
  expect((await readNotes(page)).a.selected).toBe(true);
  expect((await readNotes(page)).b.selected).toBe(false);
});

test('scaled and zoomed right-edge resizing keeps pointer capture outside the canvas', async ({
  page,
}) => {
  await page.getByRole('img').evaluate((canvas) => {
    (canvas as HTMLElement).style.width = '300px';
    (canvas as HTMLElement).style.height = '120px';
  });
  await seed(page, [base]);
  await move(page, 110, 10); // Inside the six-CSS-pixel endpoint target.
  await page.mouse.down();
  await move(page, 170, 30);
  await page.mouse.up();
  await expect
    .poll(async () => (await readNotes(page)).a)
    .toEqual({ ...base, durationTicks: 240 });

  const overlay = page.getByRole('group', { name: /Selected note: pitch 72/ });
  const widthBeforeZoom = (await overlay.boundingBox())?.width;
  if (!widthBeforeZoom) throw new Error('Selected note overlay is not visible');
  await move(page, 130, 10);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await overlay.boundingBox())?.width ?? 0)
    .toBeGreaterThan(widthBeforeZoom);
  const bounds = await overlay.boundingBox();
  const canvas = await page.getByRole('img').boundingBox();
  if (!bounds || !canvas) throw new Error('Editor surface is not visible');
  const initialX = bounds.x + bounds.width - 2;
  await page.mouse.move(initialX, bounds.y + 4);
  await page.mouse.down();
  await page.mouse.move(
    initialX + bounds.width / 2,
    canvas.y + canvas.height + 40,
  );
  expect((await readNotes(page)).a.durationTicks).toBe(240);
  await page.mouse.up();

  await expect
    .poll(async () => (await readNotes(page)).a)
    .toEqual({ ...base, durationTicks: 360 });
  expect(Object.keys(await readNotes(page))).toEqual(['a']);
});

test('a viewport-clipped edge remains a move when the true endpoint is offscreen', async ({
  page,
}) => {
  const { width } = await viewportSize(page);
  const note = { ...base, durationTicks: (width + 4) / 0.5 - base.startTick };
  await seed(page, [note]);
  await move(page, width - 1, 10); // Within six pixels of the offscreen endpoint.
  await page.mouse.down();
  await move(page, width + 59, 10);
  await page.mouse.up();

  await expect
    .poll(async () => (await readNotes(page)).a)
    .toEqual({ ...note, startTick: 240 });
  expect(Object.keys(await readNotes(page))).toEqual(['a']);
});

test('note-list keyboard resizing preserves focus and announces duration without moving', async ({
  page,
}) => {
  await seed(page, [base]);
  const button = page.getByRole('button', {
    name: /Pitch 72, tick 120, duration 120 ticks/,
  });
  await button.focus();
  await page.keyboard.press('Shift+ArrowRight');

  await expect(
    page.getByRole('button', {
      name: /Pitch 72, tick 120, duration 240 ticks/,
    }),
  ).toBeFocused();
  await expect(page.getByRole('status')).toHaveText(
    'Resized pitch 72 to duration 240 ticks',
  );
  expect((await readNotes(page)).a).toEqual({ ...base, durationTicks: 240 });
  await page.keyboard.press('Shift+ArrowLeft');
  expect((await readNotes(page)).a).toEqual(base);
});

test('pointer capture commits a note released outside the canvas and reveals it', async ({
  page,
}) => {
  await seed(page, [base]);
  const { height } = await viewportSize(page);
  const releaseY = height + 30;
  const pitch = Math.max(0, base.pitch - Math.round((releaseY - 10) / 20));
  await move(page, 65, 10);
  await page.mouse.down();
  await move(page, 125, releaseY);
  await page.mouse.up();
  await expect
    .poll(async () => (await readNotes(page)).a)
    .toMatchObject({ startTick: 240, pitch });
  await expect(
    page.getByRole('group', {
      name: new RegExp(`Selected note: pitch ${pitch},`),
    }),
  ).toBeVisible();
});

test('pressing Shift mid-note-drag does not activate pan', async ({ page }) => {
  await seed(page, [base]);
  await move(page, 65, 10);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await move(page, 5, 10);
  await expect(
    page.getByRole('group', { name: /Selected note:/ }),
  ).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(async () => (await readNotes(page)).a.startTick).toBe(0);
  expect(Object.keys(await readNotes(page))).toEqual(['a']);
});

test('releasing Shift mid-pan does not switch to editing', async ({ page }) => {
  await seed(page, [{ ...base, startTick: 960 }]);
  await page.keyboard.down('Shift');
  await move(page, 500, 10);
  await page.mouse.down();
  await move(page, 400, 10);
  const overlay = page.getByRole('group', { name: /Selected note:/ });
  const before = await overlay.evaluate((element) =>
    parseFloat((element as HTMLElement).style.left),
  );
  await page.keyboard.up('Shift');
  await move(page, 300, 10);
  await expect
    .poll(() =>
      overlay.evaluate((element) =>
        parseFloat((element as HTMLElement).style.left),
      ),
    )
    .toBeCloseTo(before - 100, 0);
  await page.mouse.up();
  expect(await readNotes(page)).toEqual({ a: { ...base, startTick: 960 } });
});

test('native Ctrl marquee selects overlaps and preserves their group movement', async ({
  page,
}) => {
  await seed(page, [
    { ...base, id: 'a', pitch: 71, startTick: 80, selected: false },
    { ...base, id: 'b', pitch: 70, startTick: 240, selected: false },
    { ...base, id: 'c', pitch: 60, startTick: 360 },
  ]);
  await page.keyboard.down('Control');
  await move(page, 50, 0);
  await page.mouse.down();
  await move(page, 170, 55);
  expect((await readNotes(page)).a.selected).toBe(false);
  await page.mouse.up();
  await page.keyboard.up('Control');
  await expect(page.getByRole('status')).toHaveText('2 notes selected');
  await page.keyboard.press('ArrowRight');
  expect((await readNotes(page)).a).toMatchObject({
    selected: true,
    startTick: 200,
  });
  expect((await readNotes(page)).b).toMatchObject({
    selected: true,
    startTick: 360,
  });
  expect((await readNotes(page)).c.selected).toBe(false);
});

test('scaled canvas drag and Ctrl-wheel use the same logical coordinates', async ({
  page,
}) => {
  await page.getByRole('img').evaluate((canvas) => {
    (canvas as HTMLElement).style.width = '300px';
    (canvas as HTMLElement).style.height = '120px';
  });
  await seed(page, [base]);
  await move(page, 65, 10);
  await page.mouse.down();
  await move(page, 125, 30);
  await page.mouse.up();
  await expect
    .poll(async () => (await readNotes(page)).a)
    .toMatchObject({ startTick: 240, pitch: 71 });
  const overlay = page.getByRole('group', { name: /Selected note:/ });
  const before = await overlay.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await move(page, 130, 30);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await expect
    .poll(() =>
      overlay.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(before);
});

test('supported minimum zoom keeps narrow selections visible', async ({
  page,
}) => {
  await seed(page, [base]);
  await page.getByRole('combobox', { name: 'Timeline length' }).click();
  await page.getByRole('option', { name: '32 bars' }).click();
  await move(page, 65, 10);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 10000);
  await page.keyboard.up('Control');
  const overlay = page.getByRole('group', { name: /Selected note:/ });
  const { width } = await viewportSize(page);
  await expect(overlay).toBeVisible();
  await expect
    .poll(() =>
      overlay.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeCloseTo((width / (32 * 4 * 480)) * 120, 1);
});

test('timeline Select supports keyboard changes and returns focus without editing notes', async ({
  page,
}) => {
  await seed(page, [base]);
  const select = page.getByRole('combobox', { name: 'Timeline length' });
  await select.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page.getByRole('option', { name: '8 bars' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('option', { name: '32 bars' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(select).toHaveText('32 bars');
  await expect(select).toBeFocused();
  await expect(
    page.getByRole('spinbutton', { name: 'Start tick' }),
  ).toHaveAttribute('max', '61320');
  expect(await readNotes(page)).toEqual({ a: base });
});

test('loading feedback is announced without taking focus or stacking repeated Play clicks', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect(page.getByText('Loading piano samples…')).toHaveCount(0);
  await play.focus();
  await page.keyboard.press('Enter');
  const notification = page.getByText('Loading piano samples…');
  await expect(notification).toBeVisible();
  await expect(play).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(notification).toHaveCount(1);
  await expect(
    page.getByRole('region', { name: /Notifications/ }),
  ).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('[data-sonner-toast]')).toHaveCSS(
    'transition-duration',
    '0s',
  );
  await page.getByRole('button', { name: 'Close toast' }).click();
  await expect(notification).toHaveCount(0);
  expect(await readNotes(page)).toEqual({});
});

test('workspace fills the viewport and keeps notes and keys aligned after resizing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForCanvasSize(page);
  await seed(page, [base]);
  const canvas = page.getByRole('img', { name: 'Time grid preview' });
  const sidebar = page.locator('.studio-sidebar');
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole('button', { name: /planned/i })).toHaveCount(0);
  await expect(sidebar).toHaveText('');
  const canvasBounds = await canvas.boundingBox();
  const sidebarBounds = await sidebar.boundingBox();
  const playbackBounds = await page
    .getByRole('region', { name: 'Playback', exact: true })
    .boundingBox();
  if (!canvasBounds || !sidebarBounds || !playbackBounds)
    throw new Error('Workspace is not visible');
  expect(canvasBounds.height).toBeGreaterThan(900 * 0.7);
  expect(sidebarBounds.x).toBeGreaterThanOrEqual(
    canvasBounds.x + canvasBounds.width,
  );
  expect(playbackBounds.y).toBeLessThan(canvasBounds.y);
  expect(playbackBounds.x).toBeGreaterThan(
    canvasBounds.x + canvasBounds.width / 2,
  );

  const noteButton = page.getByRole('button', {
    name: /Pitch 72, tick 120, duration 120 ticks/,
  });
  const dimensions = await viewportSize(page);
  await noteButton.focus();
  await expect(noteButton).toBeVisible();
  expect(await viewportSize(page)).toEqual(dimensions);
  await page
    .getByRole('group', { name: 'Piano roll editor', exact: true })
    .focus();
  await page.keyboard.press('ArrowUp');
  const overlay = page.getByRole('group', { name: /Selected note: pitch 73/ });
  await expect(overlay).toHaveCSS('top', '0px');
  const keyLabel = page.locator('.piano-key-label', { hasText: 'C5' });
  const keyBounds = await keyLabel.locator('..').boundingBox();
  if (!keyBounds) throw new Error('C5 reference key is not visible');
  expect(keyBounds.y).toBeCloseTo(canvasBounds.y + 20, 0);

  const notes = await readNotes(page);
  await page.setViewportSize({ width: 900, height: 650 });
  await waitForCanvasSize(page);
  await expect(sidebar).toBeHidden();
  await expect(overlay).toHaveCSS('height', '20px');
  expect(await readNotes(page)).toEqual(notes);
  expect(
    await canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      return (
        canvas.width === Math.round(canvas.clientWidth * devicePixelRatio) &&
        canvas.height === Math.round(canvas.clientHeight * devicePixelRatio)
      );
    }),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    900,
  );
  expect(
    await page
      .locator('[data-slot="skeleton"]')
      .evaluateAll((elements) =>
        elements.every(
          (element) => getComputedStyle(element).animationName === 'none',
        ),
      ),
  ).toBe(true);
});

test('measures real Canvas rendering for a 1000-note viewport', async ({
  page,
}, testInfo) => {
  const timings = await page.evaluate(async () => {
    const rendererPath = '/src/features/piano-roll/rendering/drawPianoRoll.ts';
    const indexPath = '/src/features/piano-roll/utils/noteIndex.ts';
    const { drawPianoRoll } = (await import(
      rendererPath
    )) as typeof import('@/features/piano-roll/rendering/drawPianoRoll');
    const { createNoteIndex } = (await import(
      indexPath
    )) as typeof import('@/features/piano-roll/utils/noteIndex');
    const notes = Object.fromEntries(
      Array.from({ length: 1000 }, (_, i) => [
        String(i),
        {
          id: String(i),
          pitch: 72 - (i % 12),
          startTick: (i % 8) * 120,
          durationTicks: 120,
          velocity: 100,
          selected: false,
        },
      ]),
    );
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[aria-label="Time grid preview"]',
    );
    const context = canvas?.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable');
    const scene = {
      index: createNoteIndex(notes),
      width: 600,
      height: 240,
      endTick: 15360,
      view: {
        pixelsPerTick: 0.5,
        scrollOffsetX: 0,
        highestVisiblePitch: 72,
        rowHeight: 20,
      },
      previews: null,
      marquee: null,
    };
    const samples: number[] = [];
    for (let i = 0; i < 120; i++) {
      const start = performance.now();
      drawPianoRoll(context, scene);
      if (i >= 20) samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    return {
      noteCount: 1000,
      meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
      p95Ms: samples[Math.floor(samples.length * 0.95)],
    };
  });
  await testInfo.attach('canvas-render-timings', {
    body: JSON.stringify(timings, null, 2),
    contentType: 'application/json',
  });
  console.log('1000-note Canvas render:', timings);
  expect(timings.meanMs).toBeGreaterThanOrEqual(0);
  // Diagnostic timing, deliberately not a machine-dependent FPS assertion.
});
