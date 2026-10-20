import {chromium,expect} from '@playwright/test';
import {staticSite,requireCurrentExport,jsonFile,fingerprint} from './qa-utils.mjs';
await requireCurrentExport('final');
const site=await staticSite(),browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true});
const results=[];
try{
 for(const kind of ['orchid','alstroemeria']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const media=[];page.on('response',r=>{if(r.url().endsWith('-bloom.mp4'))media.push({status:r.status(),mime:r.headers()['content-type']});});
  await page.goto(site.url);
  await page.getByRole('button',{name:'Mở món quà'}).click();
  await page.locator('#flower-kind').selectOption(kind);
  expect(media).toEqual([]);
  await page.getByRole('button',{name:'Tiếp tục không cần tên'}).click();
  const video=page.locator('[data-rose-renderer=recorded-bloom] video');
  await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(.4);
  await expect(page.locator('.greeting-content')).toBeVisible({timeout:12000});
  expect(media.some(r=>r.status===200&&r.mime==='video/mp4')).toBe(true);
  await expect(page.locator('[data-rose-renderer=recorded-bloom] img')).toHaveAttribute('src',`flowers/${kind}-open.webp`);
  await expect(page.locator('.photo-credit,.mode-button,.flower-caption,canvas')).toHaveCount(0);
  results.push({kind,completed:true,media});await page.close();
 }
 await jsonFile('artifacts/quality/final/recorded-blooms.json',{sourceFingerprint:await fingerprint(),results,coverage:'Two actual recorded bloom clips. Five other flowers remain photographic reveals.'});
 console.log('Exported Pages recorded blooms: 2/2 passed.');
}finally{await browser.close();await site.close();}
