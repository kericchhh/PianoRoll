import { expect, test } from '@playwright/test';

test('left settings panel supports keyboard focus, dismissal, and leaves the canvas size unchanged', async ({
    page,
}, testInfo) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Settings', exact: true });
    const canvas = page.getByRole('img', {
        name: 'Time grid preview',
        includeHidden: true,
    });
    const size = () =>
        canvas.evaluate((element: HTMLCanvasElement) => ({
            width: element.width,
            height: element.height,
            bounds: element.getBoundingClientRect().toJSON(),
        }));
    const before = await size();
    await expect(page.getByRole('button', { name: 'Export MIDI' })).toHaveCount(
        0,
    );
    await trigger.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Settings' });
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    await expect.poll(async () => (await panel.boundingBox())?.x).toBe(0);
    expect(await size()).toEqual(before);
    const screenshotPath = testInfo.outputPath('settings-panel.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('left-settings-panel', {
        path: screenshotPath,
        contentType: 'image/png',
    });
    const close = panel.getByRole('button', { name: 'Close settings' });
    const exporting = panel.getByRole('button', { name: 'Export MIDI' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(exporting).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(exporting).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await size()).toEqual(before);

    await trigger.click();
    await close.click();
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect.poll(async () => (await panel.boundingBox())?.x).toBe(0);
    await page.mouse.click(600, 400);
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
});

test('live reduced-motion changes skip the slide and the left panel fits a narrow viewport', async ({
    page,
}) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 300, height: 700 });
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Settings', exact: true });
    await expect(trigger).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trigger.click();
    const panel = page.getByRole('dialog', { name: 'Settings' });
    await expect(panel).toBeVisible();
    const bounds = await panel.boundingBox();
    expect(bounds?.x).toBe(0);
    expect(bounds?.width).toBe(300);
    expect(bounds?.height).toBe(700);
    expect(
        await panel.evaluate((element) => getComputedStyle(element).transform),
    ).toBe('none');
    expect(
        await page
            .locator('[data-slot="sheet-overlay"]')
            .evaluate((element) => getComputedStyle(element).opacity),
    ).toBe('1');
    await panel.getByRole('button', { name: 'Close settings' }).click();
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
});
