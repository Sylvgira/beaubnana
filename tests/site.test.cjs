const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const {globSync} = require('glob');
const root = path.resolve(__dirname, '..');

test('published HTML links resolve inside the static artifact', () => {
    for (const file of globSync('{*.html,products/*.html,policies/*.html}', {cwd:path.join(root,'dist')})) {
        const html = fs.readFileSync(path.join(root,'dist',file),'utf8');
        assert.match(html, /<html[^>]*lang="en"/);
        for (const [,href] of html.matchAll(/href="([^"#?]+)(?:[?#][^"]*)?"/g)) {
            if (/^(https?:|mailto:|tel:)/.test(href)) continue;
            assert.ok(!href.startsWith('/'), `${file}: account-root link ${href}`);
            assert.ok(fs.existsSync(path.resolve(root,'dist',path.dirname(file),href)), `${file}: missing ${href}`);
        }
    }
    assert.ok(!fs.existsSync(path.join(root,'dist','node_modules')));
    assert.ok(!fs.existsSync(path.join(root,'dist','package.json')));
    assert.ok(!fs.existsSync(path.join(root,'dist','products/template.html')));
});

test('missing credentials fail before overwriting browser config', () => {
    const file = path.join(root,'js/config.js');
    const before = fs.readFileSync(file,'utf8');
    const result = spawnSync(process.execPath,['update-config.js'], {cwd:root, env:{...process.env,SHOPIFY_STORE_NAME:'',SHOPIFY_STOREFRONT_TOKEN:''},encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.equal(fs.readFileSync(file,'utf8'),before);
});

test('every inline script in the published artifact parses', () => {
    for (const file of globSync('**/*.html',{cwd:path.join(root,'dist')})) {
        const html=fs.readFileSync(path.join(root,'dist',file),'utf8');
        for (const [,attributes,script] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
            if (/application\/ld\+json/.test(attributes)) continue;
            assert.doesNotThrow(()=>new vm.Script(script),file);
        }
    }
});

test('config falls back to the public Storefront token and excludes the Admin token', () => {
    let generated;
    const env={SHOPIFY_STORE_NAME:'example.myshopify.com',SHOPIFY_STOREFRONT_TOKEN:'public-token',SHOPIFY_ADMIN_TOKEN:'private-admin-token'};
    vm.runInNewContext(fs.readFileSync(path.join(root,'update-config.js'),'utf8'), {
        require(name){if(name==='fs')return {writeFileSync(_file,content){generated=content}};if(name==='dotenv')return {config(){}};return require(name)},
        __dirname:root,process:{env},console:{log(){}}
    });
    const context={window:{},console:{log(){}}};vm.runInNewContext(generated,context);
    assert.equal(context.window.SHOPIFY_BUY_CONFIG.storefrontAccessToken,'public-token');
    assert.ok(!generated.includes('private-admin-token'));
});

test('concurrent catalog reads share a request; failed reads can retry', async () => {
    let calls=0, fail=false;
    const context = vm.createContext({URL,AbortSignal,Response,console,document:{currentScript:{src:'https://example.test/beaubnana/js/shopify.js'},addEventListener(){}},window:{SHOPIFY_CONFIG:{domain:'example.myshopify.com',storefrontAccessToken:'test'}},fetch:async()=>{calls++;if(fail)throw new Error('offline');return new Response(JSON.stringify({data:{products:{edges:[{node:{id:'1',title:'Bag',tags:[]}}]}}}));}});
    vm.runInContext(fs.readFileSync(path.join(root,'js/shopify.js'),'utf8'),context);
    const first=await vm.runInContext('Promise.all([fetchProducts(),fetchProducts()])',context);
    assert.equal(calls,1);assert.equal(first[0].length,1);assert.equal(first[1].length,1);
    vm.runInContext('storefrontRequests.clear()',context);fail=true;
    assert.equal((await vm.runInContext('fetchProducts()',context)).length,0);
    fail=false;
    assert.equal((await vm.runInContext('fetchProducts()',context)).length,1);
    assert.equal(calls,3);
});
