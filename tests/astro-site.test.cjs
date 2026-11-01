const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {load} = require('cheerio');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const snapshot = require('../src/data/shopify-snapshot.json');
const base = (process.env.BASE_PATH ?? '/beaubnana').replace(/\/$/,'');
const site = 'https://sylvgira.github.io';

function files(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? files(path.join(dir,entry.name)) : [path.join(dir,entry.name)]);
}

test('Astro generates every existing public HTML route with one shared shell', () => {
  const routes = files(dist).filter(file=>file.endsWith('.html')).map(file=>path.relative(dist,file));
  for(const route of ['index.html','all-products.html','401.html','404.html']) assert.ok(routes.includes(route),route);
  assert.ok(routes.some(route=>route.startsWith('products/')));
  for (const route of routes) {
    const $ = load(fs.readFileSync(path.join(dist,route),'utf8'));
    assert.match($('meta[name="generator"]').attr('content'),/^Astro/);
    assert.equal($('html').attr('lang'),'en');
    assert.equal($('.navbar_component').length,1,route);
    assert.equal($('main#main').length,1,route);
    assert.equal($('footer').length,1,route);
    assert.equal($('h1').length,1,route);
    assert.equal($('link[rel="canonical"]').length,1,route);
    assert.ok($('meta[property="og:image"]').attr('content')?.startsWith('https://'),route);
  }
});

test('local links and assets resolve for the selected hosting base', () => {
  for (const file of files(dist).filter(f=>f.endsWith('.html'))) {
    const html = fs.readFileSync(file,'utf8'), $ = load(html);
    $('[href],[src]').each((_,element)=>{
      for (const attr of ['href','src']) {
        const value=$(element).attr(attr);
        if (!value || /^(mailto:|tel:|data:|#)/.test(value)) continue;
        const url=new URL(value,`${site}${base}/${path.relative(dist,file)}`);
        if(url.origin!==site)continue;
        assert.ok(!base || url.pathname.startsWith(base+'/'),`${file}: ${value} escapes the base`);
        const local=url.pathname.slice(base.length).replace(/^\//,'') || 'index.html';
        assert.ok(fs.existsSync(path.join(dist,decodeURIComponent(local))),`${file}: missing ${value}`);
      }
    });
  }
});

test('catalogue and homepage are populated without browser JavaScript', () => {
  const $ = load(fs.readFileSync(path.join(dist,'all-products.html'),'utf8'));
  const products=files(path.join(dist,'products')).filter(file=>file.endsWith('.html'));
  assert.equal($('.filter_feed .product-card_link').length,products.length);
  const home=load(fs.readFileSync(path.join(dist,'index.html'),'utf8'));
  assert.equal(home('.top-sellers_card-wrapper .product-card_link').length,4);
  assert.equal(home('.hero_bg-image').attr('loading'),'eager');
});

test('policies are rendered and development files are not published', () => {
  for(const policy of snapshot.policies) {
    const $=load(fs.readFileSync(path.join(dist,'policies',policy.handle+'.html'),'utf8'));
    assert.ok($('.text-rich-text').text().trim().length>20);
    assert.ok(!/\{[{%]/.test($('.text-rich-text').html()));
    assert.equal($('script[src*="shopify"]').length,0);
  }
  for(const name of ['src','node_modules','package.json','server.js','update-config.js','products/template.html']) assert.ok(!fs.existsSync(path.join(dist,name)),name);
});

test('all inline scripts in the Astro artifact parse', () => {
  for(const file of files(dist).filter(f=>f.endsWith('.html'))) {
    const $=load(fs.readFileSync(file,'utf8'));
    $('script:not([src])').each((_,script)=>{
      assert.doesNotThrow(()=>new vm.Script($(script).html()),file);
    });
  }
});

test('serialized Shopify settings contain only public Storefront and Buy Button configuration', () => {
  const file=fs.readdirSync(path.join(dist,'products')).find(name=>name.endsWith('.html'));
  const $=load(fs.readFileSync(path.join(dist,'products',file),'utf8'));
  const script=$('script:not([src])').toArray().map(element=>$(element).html()).find(code=>code.includes('window.SHOPIFY_CONFIG'));
  const context={window:{}};vm.runInNewContext(script,context);
  assert.deepEqual(Object.keys(context.window.SHOPIFY_CONFIG).sort(),['domain','storefrontAccessToken']);
  assert.ok(!/admin|private/i.test(Object.keys(context.window.SHOPIFY_BUY_CONFIG).join(' ')));
  for(const artifact of files(dist).filter(file=>/\.(?:html|js)$/.test(file))) {
    assert.ok(!fs.readFileSync(artifact,'utf8').includes('SHOPIFY_ADMIN_TOKEN'),artifact);
  }
});

test('catalogue requests are deduplicated and failed requests remain retryable', async () => {
  let calls=0,offline=false;
  const context=vm.createContext({URL,AbortSignal,Response,console:{log(){},error(){}},document:{currentScript:{src:`${site}${base}/js/shopify.js`},addEventListener(){}},window:{SHOPIFY_CONFIG:{domain:'example.myshopify.com',storefrontAccessToken:'test'}},fetch:async()=>{calls++;if(offline)throw Error('offline');return new Response(JSON.stringify({data:{products:{edges:snapshot.products.map(node=>({node}))}}}));}});
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/shopify.js'),'utf8'),context);
  const first=await vm.runInContext('Promise.all([fetchProducts(),fetchProducts()])',context);
  assert.equal(calls,1);assert.equal(first[0].length,snapshot.products.length);
  assert.equal((await vm.runInContext("fetchProductsWithFilters({tag:'top-seller',limit:4})",context)).length,4);
  vm.runInContext('storefrontRequests.clear()',context);offline=true;
  assert.equal((await vm.runInContext('fetchProducts()',context)).length,0);
  offline=false;assert.equal((await vm.runInContext('fetchProducts()',context)).length,snapshot.products.length);
  assert.equal(calls,3);
});
