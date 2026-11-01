import {test,expect,type Page} from '@playwright/test';
import fixtures from '../fixtures/storefront.json' with {type:'json'};
import {readFileSync} from 'node:fs';
const sdk=readFileSync(new URL('../fixtures/buy-sdk.js',import.meta.url),'utf8');
const base=(process.env.BASE_PATH ?? '/beaubnana').replace(/\/$/,'');

async function mockServices(page: Page, options: {offline?:boolean;sdkUnavailable?:boolean} = {}) {
  const unhandled: string[]=[];
  await page.route(/^https:\/\//, async route => {
    const request=route.request(),url=new URL(request.url());
    if(url.hostname.endsWith('.myshopify.com') && url.pathname.includes('/api/')) {
      if(options.offline)return route.abort();
      const headers = {'access-control-allow-origin':'*','access-control-allow-headers':'Content-Type,X-Shopify-Storefront-Access-Token','access-control-allow-methods':'POST,OPTIONS'};
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
      const body=request.postDataJSON();
      const query=body.query.replace(/\s+/g,' ').trim();
      const fixture=fixtures.find(f=>f.query===query && JSON.stringify(f.variables)===JSON.stringify(body.variables||{}));
      if(!fixture) { unhandled.push(query);return route.fulfill({status:500,body:'Unrecorded Shopify query'}); }
      return route.fulfill({json:fixture.response,headers});
    }
    if(url.hostname==='sdks.shopifycdn.com') {
      return options.sdkUnavailable ? route.abort() : route.fulfill({contentType:'application/javascript',body:sdk});
    }
    // Browser tests are independent of external fonts, images and animation CDNs.
    return route.abort();
  });
  return unhandled;
}

test('homepage navigation and direct product URLs use the Pages base', async ({page}) => {
  const unknown=await mockServices(page);
  await page.goto(`${base}/index.html`);
  await expect(page.locator('.top-sellers_card-wrapper .product-card_link')).toHaveCount(4);
  await page.getByRole('link',{name:'Shop All',exact:true}).click();
  await expect(page).toHaveURL(`${base}/all-products.html`);
  await page.locator('.filter_feed .product-card_link').first().click();
  await expect(page).toHaveURL(new RegExp(`${base}/products/[^/]+\\.html$`));
  await expect(page.locator('main h1')).not.toBeEmpty();
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.frameLocator('#product-component iframe').getByRole('button',{name:'Add to cart',exact:true})).toBeVisible();
  expect(unknown).toEqual([]);
});

test('filters, sort and keyboard state remain consistent', async ({page}) => {
  const unknown=await mockServices(page);
  await page.goto(`${base}/all-products.html?type=bags`);
  const cards=page.locator('.filter_feed .product-card_link');
  await expect(cards).toHaveCount(5);
  await page.getByRole('button',{name:'Sort by',exact:true}).click();
  await page.getByRole('link',{name:'Name: A to Z',exact:true}).click();
  await expect(cards.locator('h6')).toHaveText(['I Love Beer Bag','Radioactivity Bag - Blue','Radioactivity Bag - Green','Unbreakable Vase Handbag','Unbreakable Vase Lighter Bag']);
  await expect(page.locator('.filter_tags-wrapper')).toContainText('Bags');
  const filter=page.getByRole('button',{name:'Filter',exact:true});
  await filter.click();await expect(filter).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');await expect(filter).toHaveAttribute('aria-expanded','false');
  await expect(filter).toBeFocused();
  await page.getByRole('button',{name:'Remove filter',exact:true}).click();
  await expect(cards).toHaveCount(46);
  expect(unknown).toEqual([]);
});

test('static content survives a Shopify outage and fits mobile', async ({page}) => {
  await mockServices(page,{offline:true});
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${base}/index.html`);
  await page.waitForFunction(()=>Boolean((window as any).ShopifyAPI));
  await expect(page.locator('.top-sellers_card-wrapper .product-card_link')).toHaveCount(4);
  await expect(page.locator('.categories-feature_card-wrapper a')).toHaveCount(4);
  await expect(page.locator('.collection_heading')).toHaveText('Smiley Face');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('link',{name:'Privacy Policy',exact:true}).click();
  await expect(page.locator('.text-rich-text')).not.toContainText('{{');
  await expect(page.locator('script[src*="shopify"]')).toHaveCount(0);
});

test('failed SDK loading leaves a clear purchase-unavailable state', async ({page}) => {
  await mockServices(page,{sdkUnavailable:true});
  await page.goto(`${base}/products/balloon-dog-earrings.html`);
  await expect(page.getByRole('status')).toContainText('Purchasing is temporarily unavailable');
  await expect(page.locator('main h1')).toHaveText('Balloon Dog Earrings');
  await expect(page.locator('.product-header_image').first()).toHaveAttribute('src',/cdn\.shopify\.com/);
});
