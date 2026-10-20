import {test,expect} from '@playwright/test';

test('reduced motion preference changes apply without a manual mode switch',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await page.getByRole('button',{name:'Mở món quà'}).click();
  await page.getByRole('button',{name:'Tiếp tục không cần tên'}).click();
  await expect(page.locator('.greeting-content')).toBeVisible();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Xem hoa nở lại'}).click();
  await expect(page.getByRole('button',{name:'Tạm dừng hoa nở'})).toBeVisible();
  await expect.poll(()=>page.locator('.photo-motion').evaluate(e=>e.getAnimations().some(a=>a.playState==='running'))).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.greeting-content')).toBeVisible();
  await expect.poll(()=>page.locator('.photo-motion').evaluate(e=>e.getAnimations().some(a=>a.playState==='running'))).toBe(false);
  await expect(page.locator('.mode-button,.flower-caption')).toHaveCount(0);
});

test('flower photograph failure preserves the name and greeting without a procedural substitute',async({page})=>{
  await page.route('**/flowers/rose.webp',route=>route.abort());
  await page.goto('/');
  await expect(page.getByText('Ảnh hoa chưa tải được. Lời chúc của bạn vẫn sẵn sàng.')).toBeVisible();
  await page.getByRole('button',{name:'Mở món quà'}).click();
  await page.getByRole('textbox',{name:'Tên của bạn'}).fill('Mai');
  await page.getByRole('button',{name:'Để hoa nở vì bạn'}).click();
  await expect(page.getByRole('heading',{name:/Mai, chúc bạn/})).toBeVisible();
  await expect(page.locator('.letter')).toBeVisible();
  await expect(page.locator('canvas,.static-rose-fallback')).toHaveCount(0);
});
