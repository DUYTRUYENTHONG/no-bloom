import { test, expect } from '@playwright/test';
for (const width of [320, 755, 1280])
    test(`header visitor count stays hidden when disabled at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 604 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const posts: string[] = [];
        page.on('request', r => { if (r.method() === 'POST')
            posts.push(r.url()); });
        await page.goto('/');
        const counter = page.locator('.site-header .visitor-counter');
        await expect(counter).toHaveCount(0);
        await expect(page.locator('.brand')).toBeVisible();
        expect(posts).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
