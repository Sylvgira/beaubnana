import {test, expect, type Page} from '@playwright/test';
const base = (process.env.BASE_PATH ?? '/').replace(/\/$/, '');
const product = `${base}/products/balloon-dog-earrings.html`;

async function isolateGallery(page: Page) {
  // Real static product data and layout; only remote services/images are isolated.
  await page.route(/^https:\/\//, route => route.request().resourceType() === 'image'
    ? route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><rect width="1000" height="1000" fill="#b483c4"/></svg>'})
    : route.abort());
}

test('every mobile photo has full width and can be selected with thumbnails and keys', async ({page}) => {
  await isolateGallery(page);
  await page.setViewportSize({width:390,height:844});
  await page.goto(product);
  const gallery = page.locator('product-photo-gallery');
  const photos = gallery.locator('.product-gallery_slide');
  const thumbs = gallery.locator('[data-thumbnail]');
  await expect(photos).toHaveCount(7);
  const widths = await photos.evaluateAll(items=>items.map(item=>item.getBoundingClientRect().width));
  expect(widths.every(width=>width>300)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  for(let index=0;index<7;index++) {
    await thumbs.nth(index).click();
    await expect(thumbs.nth(index)).toHaveAttribute('aria-current','true');
    await expect.poll(async()=>Math.abs((await photos.nth(index).boundingBox())!.x-(await gallery.boundingBox())!.x)).toBeLessThan(2);
  }
  const track=gallery.locator('.product-gallery_track');
  await track.focus();await page.keyboard.press('Home');
  await expect(thumbs.first()).toHaveAttribute('aria-current','true');
  await page.keyboard.press('ArrowRight');
  await expect(thumbs.nth(1)).toHaveAttribute('aria-current','true');
  await page.setViewportSize({width:430,height:844});
  await expect.poll(async()=>Math.abs((await photos.nth(1).boundingBox())!.x-(await gallery.boundingBox())!.x)).toBeLessThan(2);
  await page.setViewportSize({width:1440,height:1000});
  await expect(thumbs.first()).toBeHidden();
  const first=(await photos.first().boundingBox())!,second=(await photos.nth(1).boundingBox())!;
  expect(second.y).toBeGreaterThanOrEqual(first.y+first.height);
});

test('native touch swiping updates the selected thumbnail', async ({browser}) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();await isolateGallery(page);await page.goto(product);
  const track=page.locator('.product-gallery_track');
  const box=(await track.boundingBox())!;
  const client=await context.newCDPSession(page);
  const y=box.y+box.height/2,start=box.x+box.width*.85;
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
  for(let i=1;i<=10;i++) {
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start-box.width*.7*i/10,y}]});
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('[data-thumbnail="1"]')).toHaveAttribute('aria-current','true');
  await context.close();
});

test('enlarged photos support navigation, zoom, Escape and focus restoration', async ({page}) => {
  await isolateGallery(page);await page.setViewportSize({width:390,height:844});await page.goto(product);
  const track=page.locator('.product-gallery_track');
  await track.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-position]')).toHaveText('Photo 2 of 7');
  await expect(dialog.getByRole('button',{name:'Close image viewer'})).toBeFocused();
  await dialog.getByRole('button',{name:'Next photo'}).click();
  await expect(dialog.locator('[data-position]')).toHaveText('Photo 3 of 7');
  await dialog.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Zoom out',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await dialog.locator('.product-gallery_viewport').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
  await dialog.getByRole('button',{name:'Previous photo'}).click();
  await expect(dialog.getByRole('button',{name:'Zoom in',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-photo="1"]')).toBeFocused();
  await expect(page.locator('[data-thumbnail="1"]')).toHaveAttribute('aria-current','true');
  expect(await page.evaluate(()=>document.documentElement.style.overflow)).not.toBe('hidden');
});

test('photos remain accessible when JavaScript is unavailable', async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();await isolateGallery(page);await page.goto(product);
  const last=page.locator('[data-thumbnail]').last();
  await last.click();
  await expect(page).toHaveURL(/#photo-balloon-dog-earrings-7$/);
  await expect(page.locator('[data-photo="6"]')).toBeInViewport();
  await expect(page.locator('[data-photo="6"]')).toHaveAttribute('href',/^https:\/\/cdn.shopify.com\//);
  await context.close();
});
