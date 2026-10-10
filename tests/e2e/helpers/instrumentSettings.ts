import type { Page } from '@playwright/test';

export async function openInstrumentSettings(page: Page, singleSample = false) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Instrument', exact: true }).click();
    if (singleSample)
        await page
            .getByRole('button', { name: 'Use a single sample', exact: true })
            .click();
}
