import {test,expect} from '@playwright/test';

test('gift box opens once with keyboard then focuses name entry',async({page})=>{
  await page.goto('/');
  const gift=page.getByRole('button',{name:'Mở món quà'});
  await gift.focus();await page.keyboard.press('Enter');
  await expect(gift).toBeDisabled();
  await expect(gift).toHaveAttribute('aria-busy','true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox',{name:'Tên của bạn'})).toBeFocused();
  await expect(page.locator('.stage-personalization')).toHaveCount(1);
});

test('gift box reduced motion bypasses unfolding',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await page.getByRole('button',{name:'Mở món quà'}).click();
  await expect(page.locator('.gift-lid')).toHaveCount(0);
  await expect(page.getByRole('textbox',{name:'Tên của bạn'})).toBeFocused();
});

test('gift box lid and card reveal remain framed on mobile',async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.goto('/');
  const gift=page.getByRole('button',{name:'Mở món quà'});
  await gift.click();
  await page.locator('.gift-lid').evaluate(e=>e.getAnimations()[0].pause());
  await page.locator('.gift-card').evaluate(e=>e.getAnimations()[0].pause());
  await page.locator('.gift-lid').evaluate(e=>{e.getAnimations()[0].currentTime=640;});
  await page.locator('.gift-card').evaluate(e=>{e.getAnimations()[0].currentTime=640;});
  const stage=await gift.boundingBox();
  for(const bow of await page.locator('.gift-bow').all()){const box=await bow.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(stage!.y);}
  await gift.screenshot({path:'artifacts/quality/gift-box/320-opening.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.gift-lid').evaluate(e=>e.getAnimations()[0].finish());
  await expect(page.getByRole('textbox',{name:'Tên của bạn'})).toBeVisible();
});
