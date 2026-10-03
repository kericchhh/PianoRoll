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
  const bounds = await page
    .getByRole('img', { name: 'Time grid preview' })
    .boundingBox();
  if (!bounds) throw new Error('Canvas is not visible');
  return {
    x: bounds.x + 1 + (x * (bounds.width - 2)) / 600,
    y: bounds.y + 1 + (y * (bounds.height - 2)) / 240,
  };
}
async function move(page: Page, x: number, y: number) {
  const point = await position(page, x, y);
  await page.mouse.move(point.x, point.y);
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('keyboard-only insertion, movement, reveal and deletion', async ({
  page,
}) => {
  await page.keyboard.press('Tab'); // timeline
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
  await expect(overlay).toHaveCSS('top', '1px');
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

test('pointer capture commits a note released outside the canvas and reveals it', async ({
  page,
}) => {
  await seed(page, [base]);
  await move(page, 65, 10);
  await page.mouse.down();
  await move(page, 125, 270);
  await page.mouse.up();
  await expect
    .poll(async () => (await readNotes(page)).a)
    .toMatchObject({ startTick: 240, pitch: 59 });
  await expect(
    page.getByRole('group', { name: /Selected note: pitch 59/ }),
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
  await page
    .getByRole('combobox', { name: 'Timeline length' })
    .selectOption('32');
  await move(page, 65, 10);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 10000);
  await page.keyboard.up('Control');
  const overlay = page.getByRole('group', { name: /Selected note:/ });
  await expect(overlay).toBeVisible();
  await expect
    .poll(() =>
      overlay.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeCloseTo((600 / (32 * 4 * 480)) * 120, 1);
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
    const canvas = document.querySelector('canvas');
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
