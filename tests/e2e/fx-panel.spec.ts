import { expect, test } from '@playwright/test';

test('desktop effects rack has independent keyboard-operable knobs', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const rack = page.getByRole('complementary', { name: 'Effects' });
    await expect(rack).toBeVisible();
    await expect(rack.getByRole('slider')).toHaveCount(6);
    const room = rack.getByRole('slider', { name: 'Reverb room' });
    await room.focus();
    await page.keyboard.press('ArrowUp');
    await expect(room).toHaveAttribute('aria-valuenow', '2.1');
    await rack.getByRole('button', { name: 'Enable reverb' }).click();
    await expect(
        rack.getByRole('button', { name: 'Disable reverb' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
        rack.getByRole('button', { name: 'Enable delay' }),
    ).toHaveAttribute('aria-pressed', 'false');
});

test('FX presets select sound settings and manual edits show Custom', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const rack = page.getByRole('complementary', { name: 'Effects' });
    const presets = rack.getByRole('region', { name: 'FX presets' });
    const clean = presets.getByRole('button', { name: 'Clean' });
    const room = presets.getByRole('button', { name: 'Room' });
    const echo = presets.getByRole('button', { name: 'Echo' });
    await expect(clean).toHaveAttribute('aria-pressed', 'true');
    await room.focus();
    await page.keyboard.press('Enter');
    await expect(room).toBeFocused();
    await expect(room).toHaveAttribute('aria-pressed', 'true');
    await expect(
        rack.getByRole('button', { name: 'Disable reverb' }),
    ).toBeVisible();
    await expect(
        rack.getByRole('slider', { name: 'Reverb room' }),
    ).toHaveAttribute('aria-valuenow', '2.4');
    await echo.click();
    await expect(echo).toHaveAttribute('aria-pressed', 'true');
    await expect(
        rack.getByRole('button', { name: 'Enable reverb' }),
    ).toBeVisible();
    await expect(
        rack.getByRole('button', { name: 'Disable delay' }),
    ).toBeVisible();
    const delayTime = rack.getByRole('slider', { name: 'Delay time' });
    await expect(delayTime).toHaveAttribute('aria-valuenow', '320');
    await delayTime.focus();
    await page.keyboard.press('ArrowUp');
    await expect(presets.getByText('Custom')).toBeVisible();
    await expect(presets.locator('[aria-pressed="true"]')).toHaveCount(0);
    await clean.click();
    await expect(clean).toHaveAttribute('aria-pressed', 'true');
    await expect(
        rack.getByRole('button', { name: 'Enable delay' }),
    ).toBeVisible();
});

test('the bundled IBM Plex Sans face is used for the studio UI', async ({
    page,
}) => {
    await page.goto('/');
    const family = await page
        .locator('body')
        .evaluate((body) => getComputedStyle(body).fontFamily);
    expect(family).toContain('IBM Plex Sans');
    const loaded = await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].some(
            (face) =>
                face.family === 'IBM Plex Sans' && face.status === 'loaded',
        );
    });
    expect(loaded).toBe(true);
});

test('metal FX switches show state without visible text and keep keyboard focus', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const switchButton = page
        .getByRole('complementary', { name: 'Effects' })
        .getByRole('region', { name: 'Reverb' })
        .locator('.fx-toggle');
    await expect(switchButton).toHaveAttribute('aria-label', 'Enable reverb');
    await expect(switchButton).toHaveClass(/fx-toggle/);
    await expect(switchButton.getByText('Off')).toHaveClass(/sr-only/);
    const bounds = await switchButton.boundingBox();
    expect(bounds?.width).toBe(28);
    expect(bounds?.height).toBe(40);
    await expect(switchButton).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
    );
    const lever = switchButton.locator('.fx-toggle-lever');
    const off = await lever.evaluate(
        (element) => getComputedStyle(element).transform,
    );
    await switchButton.focus();
    await page.keyboard.press('Space');
    await expect(switchButton).toBeFocused();
    await expect(switchButton).toHaveAttribute('aria-label', 'Disable reverb');
    await expect(switchButton).toHaveAttribute('aria-pressed', 'true');
    await expect(switchButton.getByText('On')).toHaveClass(/sr-only/);
    const on = await lever.evaluate(
        (element) => getComputedStyle(element).transform,
    );
    expect(on).not.toBe(off);
});

test('output meter stays in the FX rack and narrow drawer', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const rack = page.getByRole('complementary', { name: 'Effects' });
    const meter = rack.getByRole('meter', { name: 'Output peak' });
    await expect(meter).toBeVisible();
    await expect(meter).toHaveAttribute('aria-valuetext', 'Silent');
    await expect(meter.locator('.fx-meter-segment')).toHaveCount(12);
    const meterBox = await meter.boundingBox();
    const chorusBox = await rack
        .getByRole('region', { name: 'Chorus' })
        .boundingBox();
    expect(meterBox!.y).toBeGreaterThan(chorusBox!.y + chorusBox!.height);
    const outputBox = await rack.locator('.fx-output-meter').boundingBox();
    expect(
        outputBox!.y - (chorusBox!.y + chorusBox!.height),
    ).toBeLessThanOrEqual(1);
    const presetBox = await rack
        .getByRole('region', { name: 'FX presets' })
        .boundingBox();
    expect(
        presetBox!.y - (outputBox!.y + outputBox!.height),
    ).toBeLessThanOrEqual(1);
    const desktopPanel = rack.locator('.fx-panel');
    const panelBox = await desktopPanel.boundingBox();
    expect(
        panelBox!.y + panelBox!.height - (presetBox!.y + presetBox!.height),
    ).toBeLessThanOrEqual(1);
    expect(
        await desktopPanel.evaluate(
            (element) => element.scrollHeight - element.clientHeight,
        ),
    ).toBeLessThanOrEqual(1);
    for (const height of [720, 600]) {
        await page.setViewportSize({ width: 1280, height });
        expect(
            await desktopPanel.evaluate(
                (element) => element.scrollHeight - element.clientHeight,
            ),
            `desktop FX panel at ${height}px`,
        ).toBeLessThanOrEqual(1);
        const compactPresets = await rack
            .getByRole('region', { name: 'FX presets' })
            .boundingBox();
        const rackBox = await rack.boundingBox();
        expect(
            compactPresets!.y + compactPresets!.height,
            `desktop presets at ${height}px`,
        ).toBeLessThanOrEqual(rackBox!.y + rackBox!.height + 1);
    }

    await page.setViewportSize({ width: 980, height: 720 });
    await page.getByRole('button', { name: 'FX', exact: true }).click();
    await expect(
        page.getByRole('dialog', { name: 'FX' }).getByRole('meter', {
            name: 'Output peak',
        }),
    ).toBeVisible();
    await expect(
        page
            .getByRole('dialog', { name: 'FX' })
            .getByRole('region', { name: 'FX presets' }),
    ).toBeVisible();
    const drawerPanel = page
        .getByRole('dialog', { name: 'FX' })
        .locator('.fx-panel');
    expect(
        await drawerPanel.evaluate(
            (element) => element.scrollHeight - element.clientHeight,
        ),
    ).toBeLessThanOrEqual(1);
});

test('short desktop rack and FX drawer let pointer users reach presets', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto('/');
    const rack = page.getByRole('complementary', { name: 'Effects' });
    const rackBox = await rack.boundingBox();
    await page.mouse.move(rackBox!.x + 100, rackBox!.y + 150);
    await page.mouse.wheel(0, 300);
    await expect
        .poll(() => rack.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
    await rack.getByRole('button', { name: 'Wide' }).click();

    await page.setViewportSize({ width: 980, height: 400 });
    await page.getByRole('button', { name: 'FX', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'FX' });
    const drawerBox = await drawer.boundingBox();
    await page.mouse.move(drawerBox!.x + 100, drawerBox!.y + 150);
    await page.mouse.wheel(0, 300);
    await expect
        .poll(() => drawer.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
    await drawer.getByRole('button', { name: 'Echo' }).click();
    await expect(drawer.getByRole('button', { name: 'Echo' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
});

test('Escape cancels a knob drag and restores its starting value', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const mix = page
        .getByRole('complementary', { name: 'Effects' })
        .getByRole('slider', { name: 'Delay mix' });
    const box = await mix.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 30);
    await expect
        .poll(async () => Number(await mix.getAttribute('aria-valuenow')))
        .toBeGreaterThan(18);
    await page.keyboard.press('Escape');
    await expect(mix).toHaveAttribute('aria-valuenow', '18');
    await page.mouse.up();
});

test('effects remain reachable below 1024px and survive local save/load', async ({
    page,
}) => {
    await page.setViewportSize({ width: 980, height: 720 });
    await page.goto('/');
    await page.getByRole('button', { name: 'FX', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'FX' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'Enable delay' }).click();
    const time = drawer.getByRole('slider', { name: 'Delay time' });
    await time.focus();
    await page.keyboard.press('ArrowUp');
    await expect(time).toHaveAttribute('aria-valuenow', '250');
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('button', { name: 'FX', exact: true }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('tab', { name: 'FX' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Project' }).click();
    await page.getByRole('button', { name: 'Save project' }).click();
    await expect(
        page.getByRole('region', { name: 'Local project' }).getByRole('status'),
    ).toHaveText('Project saved in this browser.');
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Project' }).click();
    await page.getByRole('button', { name: 'Load project' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'FX', exact: true }).click();
    await expect(
        page
            .getByRole('dialog', { name: 'FX' })
            .getByRole('button', { name: 'Disable delay' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
        page
            .getByRole('dialog', { name: 'FX' })
            .getByRole('slider', { name: 'Delay time' }),
    ).toHaveAttribute('aria-valuenow', '250');
});
