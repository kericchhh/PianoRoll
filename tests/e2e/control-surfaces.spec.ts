import { expect, test } from '@playwright/test';

test('toolbar and action buttons share themeable raised control surfaces', async ({
    page,
}) => {
    await page.goto('/');
    const settings = page.getByRole('button', {
        name: 'Settings',
        exact: true,
    });
    const undo = page.getByRole('button', { name: 'Undo', exact: true });
    const add = page.getByRole('button', { name: 'Add note' });
    await expect(settings).toHaveAttribute('title', 'Settings');
    for (const [button, width] of [
        [settings, '36px'],
        [undo, '32px'],
    ] as const) {
        const shape = await button.evaluate((element) => {
            const style = getComputedStyle(element);
            return { width: style.width, radius: style.borderRadius };
        });
        expect(shape.radius).toBe('50%');
        expect(shape.width).toBe(width);
    }
    const before = await add.evaluate(
        (element) => getComputedStyle(element).backgroundImage,
    );
    expect(before).toContain('radial-gradient');
    await page.evaluate(() =>
        document.documentElement.style.setProperty(
            '--studio-control-highlight',
            '#4488aa',
        ),
    );
    const after = await add.evaluate(
        (element) => getComputedStyle(element).backgroundImage,
    );
    expect(after).not.toBe(before);
});
