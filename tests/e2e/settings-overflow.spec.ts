import { expect, test, type Locator, type Page } from '@playwright/test';
import { sampleFile } from './helpers/sampleAudio';

async function centerIsClickable(control: Locator) {
    return control.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2,
        );
        return !!hit && (hit === element || element.contains(hit));
    });
}

async function wheelTo(page: Page, scrollport: Locator, control: Locator) {
    const bounds = await scrollport.boundingBox();
    if (!bounds) throw new Error('Active Settings panel has no scrollport');
    for (let attempt = 0; attempt < 40; attempt++) {
        if (await centerIsClickable(control)) return;
        const before = await scrollport.evaluate(
            (element) => element.scrollTop,
        );
        await page.mouse.move(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2,
        );
        await page.mouse.wheel(0, 24);
        await expect
            .poll(() => scrollport.evaluate((element) => element.scrollTop))
            .toBeGreaterThan(before);
    }
    throw new Error('Wheel scrolling did not reveal the Settings control');
}

async function open(page: Page, tab: 'MIDI' | 'Instrument' | 'Project') {
    await page.setViewportSize({ width: 320, height: 180 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'Settings' });
    await panel.getByRole('tab', { name: tab, exact: true }).click();
    return {
        panel,
        scrollport: panel.getByRole('tabpanel', { name: tab, exact: true }),
    };
}

test('short Settings MIDI content scrolls to Import while its header and tabs remain fixed', async ({
    page,
}) => {
    const { panel, scrollport } = await open(page, 'MIDI');
    const close = panel.getByRole('button', { name: 'Close settings' });
    const tabs = panel.getByRole('tablist', { name: 'Settings sections' });
    const closeBounds = await close.boundingBox();
    const tabBounds = await tabs.boundingBox();
    const importing = panel.getByRole('button', {
        name: 'Import MIDI',
        exact: true,
    });
    expect(await centerIsClickable(importing)).toBe(false);
    await wheelTo(page, scrollport, importing);
    expect(await centerIsClickable(importing)).toBe(true);
    expect(await close.boundingBox()).toEqual(closeBounds);
    expect(await tabs.boundingBox()).toEqual(tabBounds);
    expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
    const choosing = page.waitForEvent('filechooser');
    await importing.click();
    await (await choosing).setFiles([]);
    await importing.focus();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(importing).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(
        page.getByRole('button', { name: 'Settings', exact: true }),
    ).toBeFocused();
});

test('short Settings Project content lets pointer users scroll to and activate Save and Load', async ({
    page,
}) => {
    const { panel, scrollport } = await open(page, 'Project');
    const save = panel.getByRole('button', {
        name: 'Save project',
        exact: true,
    });
    const load = panel.getByRole('button', {
        name: 'Load project',
        exact: true,
    });
    expect(await centerIsClickable(save)).toBe(false);
    await wheelTo(page, scrollport, save);
    expect(await centerIsClickable(save)).toBe(true);
    expect(await centerIsClickable(load)).toBe(true);
    await save.click();
    await expect(panel.getByRole('status')).toHaveText(/saved/i);
    await expect(save).toBeFocused();
    expect(await centerIsClickable(load)).toBe(true);
    await load.click();
    await expect(panel.getByRole('status')).toHaveText(/loaded/i);
    await expect(load).toBeFocused();
});

test('short Settings Instrument content scrolls through the expanded single-sample controls', async ({
    page,
}) => {
    const { panel, scrollport } = await open(page, 'Instrument');
    const close = panel.getByRole('button', { name: 'Close settings' });
    const closeBounds = await close.boundingBox();
    const toggle = panel.getByRole('button', {
        name: 'Use a single sample',
        exact: true,
    });
    await wheelTo(page, scrollport, toggle);
    await toggle.click();
    const root = panel.getByRole('combobox', { name: 'Sample root pitch' });
    await wheelTo(page, scrollport, root);
    expect(await centerIsClickable(root)).toBe(true);
    await root.click();
    await page
        .getByRole('option', { name: 'C4 (MIDI 60)', exact: true })
        .click();
    const importing = panel.getByRole('button', {
        name: 'Import sample',
        exact: true,
    });
    await wheelTo(page, scrollport, importing);
    expect(await centerIsClickable(importing)).toBe(true);
    const choosing = page.waitForEvent('filechooser');
    await importing.click();
    await (await choosing).setFiles(sampleFile('Short viewport.wav'));
    await expect(
        page.getByText('Short viewport.wav ready', { exact: true }),
    ).toBeVisible();
    expect(await close.boundingBox()).toEqual(closeBounds);
    expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
});
