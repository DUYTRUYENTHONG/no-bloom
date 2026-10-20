import { test, expect } from '@playwright/test';
for (const width of [320, 755, 1280])
    test(`header visitor count is small and top left at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 604 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const posts: string[] = [];
        page.on('request', r => { if (r.method() === 'POST')
            posts.push(r.url()); });
        await page.goto('/');
        const counter = page.locator('.site-header .visitor-counter');
        await expect(counter).toHaveCount(1);
        await expect(counter).toContainText('Lượt ghé: chưa khả dụng');
        expect(await counter.innerText()).not.toMatch(/\d/);
        const [b, c] = await Promise.all([page.locator('.brand').boundingBox(), counter.boundingBox()]);
        expect(c!.x).toBeCloseTo(b!.x, 0);
        expect(c!.y).toBeGreaterThanOrEqual(b!.y + b!.height - 1);
        expect(c!.y + c!.height).toBeLessThanOrEqual(100);
        await expect(counter).toHaveCSS('font-size', '11px');
        expect(posts).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
