import {test, expect} from "@playwright/test";

for (const [width,height] of [[1440,900],[1024,768],[768,1024],[665,604],[390,844],[320,568],[844,390]]) {
  test(`flower photograph fits its viewport ${width}x${height}`, async ({page})=>{
    await page.setViewportSize({width,height});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
    const frame=page.locator('.flower-frame');
    const image=page.locator('.photo-bloom-image');
    await expect(page.locator('[data-rose-renderer=photograph]')).toBeVisible();
    await expect(image).toBeVisible();
    await image.evaluate((e:HTMLImageElement)=>e.decode());
    await expect(page.locator('canvas, .static-rose-fallback svg')).toHaveCount(0);
    await page.keyboard.press("Escape");
    for(const state of ['invitation','greeting']) {
      // Read both rectangles in one frame: WebKit can finish its automatic
      // focus scroll between separate protocol calls after the greeting opens.
      const {box,stage}=await image.evaluate(element=>({
        box:element.getBoundingClientRect().toJSON(),
        stage:element.closest('.flower-frame')!.getBoundingClientRect().toJSON(),
      }));
      expect(box!.x).toBeGreaterThanOrEqual(stage!.x);
      expect(box!.y).toBeGreaterThanOrEqual(stage!.y);
      expect(box!.x+box!.width).toBeLessThanOrEqual(stage!.x+stage!.width);
      expect(box!.y+box!.height).toBeLessThanOrEqual(stage!.y+stage!.height);
      await expect(image).toHaveCSS('object-fit','contain');
      await frame.screenshot({path:`artifacts/quality/flower-framing/${width}-${height}-${state}.png`});
      if(state==='invitation') {
        await page.getByRole('button',{name:'Mở món quà'}).click();
        await page.getByRole('button',{name:'Tiếp tục không cần tên'}).click();
        await expect(page.getByRole('heading',{name:'Chúc bạn một ngày 20/10 thật dịu dàng.'})).toBeVisible();
      }
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
