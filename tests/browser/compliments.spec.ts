import {test,expect} from '@playwright/test';

test('new entries vary compliments, replay preserves them, and personal links retain the choice',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as typeof window & {savedLink:string}).savedLink=text;}}}));
  await page.goto('/');
  await page.getByRole('button',{name:'Mở món quà'}).click();
  await page.getByRole('textbox',{name:'Tên của bạn'}).fill('Mai');
  await page.getByRole('button',{name:'Để hoa nở vì bạn'}).click();
  const letter=page.locator('.letter');
  await expect(letter).toBeVisible();
  const id=await letter.getAttribute('data-compliment-id');const text=await letter.textContent();
  await page.getByRole('button',{name:'Xem hoa nở lại'}).click();
  await expect(letter).toHaveAttribute('data-compliment-id',id!);await expect(letter).toHaveText(text!);
  await page.getByRole('button',{name:'Sao chép liên kết riêng'}).click();
  const link=await page.evaluate(()=>(window as typeof window & {savedLink:string}).savedLink);
  expect(new URL(link).searchParams.get('wish')).toBe(id);
  await page.goto(link);await expect(letter).toHaveText(text!);
  await page.getByRole('button',{name:'Tạo lời chúc mới'}).click();
  await page.getByRole('textbox',{name:'Tên của bạn'}).fill('Mai');
  await page.getByRole('button',{name:'Để hoa nở vì bạn'}).click();
  await expect(letter).not.toHaveAttribute('data-compliment-id',id!);
  await expect(letter).not.toHaveText(text!);
});
