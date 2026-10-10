import { expect, test } from '@playwright/test';

test('a keyboard-focusable GitHub icon at the bottom right points to this repository', async ({
    page,
}) => {
    await page.goto('/');
    const link = page.getByRole('link', {
        name: 'View Piano Roll on GitHub (opens in a new tab)',
    });
    await expect(link).toHaveAttribute(
        'href',
        'https://github.com/kericchhh/PianoRoll',
    );
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await link.focus();
    await expect(link).toBeFocused();
    const bounds = await link.boundingBox();
    const viewport = page.viewportSize()!;
    expect(bounds!.x).toBeGreaterThan(viewport.width * 0.8);
    expect(bounds!.y).toBeGreaterThan(viewport.height * 0.9);
});
