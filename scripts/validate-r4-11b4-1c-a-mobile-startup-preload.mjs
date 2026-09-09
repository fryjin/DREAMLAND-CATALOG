#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
const fail=m=>errors.push(m);
const read=r=>fs.existsSync(path.join(ROOT,r))?fs.readFileSync(path.join(ROOT,r),'utf8'):(fail('Missing '+r),'');
const json=r=>JSON.parse(read(r));
const expect=(s,m,msg)=>{if(!s.includes(m))fail(msg+' Missing: '+m)};
const assets=json('data/mobile-home-assets.json');
const helper=read('src/astro/lib/mobile-home-startup.mjs');
const index=read('src/astro/pages/index.astro');
const page=read('src/astro/components/home/HomePage.astro');
const runtime=read('src/astro/runtime/home-runtime.js');
const layout=read('src/astro/layouts/SiteLayout.astro');
const copy=read('scripts/r4-copy-astro-home-assets.mjs');
const av=read('scripts/validate-r4-astro-home-runtime.mjs');
const pv=read('scripts/validate-r4-production-home-detachment.mjs');
const pkg=read('package.json');
if(assets.stage!=='R4.11B4.1C-A'||assets.catalog?.batchSize!==24)fail('Mobile startup asset contract changed.');
[
  'buildMobileHomeStartupManifest',
  'assets?.catalog?.batchSize',
  'listSort',
  'sortOrder',
  '.slice(0,batchSize)'
].forEach(
  marker=>
    expect(
      helper,
      marker,
      'Manifest builder changed.'
    )
);

if(
  !/\|\|\s*24/.test(helper)
){
  fail(
    'Manifest builder must preserve Catalog batch fallback 24.'
  );
}
['MobileStartupLoader','mobileHomeStartupState','mobileCover={mobileStartup.cover}','media="(max-width:720px)"'].forEach(m=>expect(index,m,'Home startup wiring changed.'));
['<picture>','srcset={mobileCover}','loading="eager"','fetchpriority="high"'].forEach(m=>expect(page,m,'Responsive hero contract changed.'));
const eager=[...page.matchAll(/<img\b[^>]*\bloading="eager"[^>]*>/gi)];if(eager.length!==1)fail('Home must keep exactly one eager img; found '+eager.length);
[
  'MOBILE_STARTUP_VERSION',
  'navigator.connection',
  'connection.saveData',
  'navigator.deviceMemory',
  'target:24',
  'new root.Image()',
  '.decode()',
  'mobileStartupSnapshot',
  'mountMobileStartup()'
].forEach(
  marker=>
    expect(
      runtime,
      marker,
      'Startup runtime changed.'
    )
);

if(
  !/target\s*:\s*24\s*,\s*minimum\s*:\s*preferFull\s*\?\s*24\s*:\s*16/s
    .test(runtime)
){
  fail(
    'Fast startup profile must preserve target 24 with minimum 16 / fast-full 24.'
  );
}
['startup-loader.js','DreamlandStartupLoader','fetch(','screen[data-screen','DreamlandMedia','ImageManager'].forEach(m=>{if(runtime.includes(m))fail('Legacy startup architecture returned: '+m)});
expect(layout,'<slot name="head" />','SiteLayout head slot missing.');
expect(copy,"'HOME001'",'Mobile cover copy missing.');
if(!av.includes('20*1024'))fail('Astro Home runtime budget is not 20 KiB.');
if(!pv.includes('runtimeRaw:20*1024'))fail('Production Home runtime budget is not 20 KiB.');
if(Buffer.byteLength(runtime,'utf8')>20*1024)fail('Home runtime exceeds 20 KiB.');
try{
  const products=json('data/products.json').products||[];
  const series=json('data/series.json').series||{};
  const {buildMobileHomeStartupManifest}=await import(pathToFileURL(path.join(ROOT,'src/astro/lib/mobile-home-startup.mjs')).href+'?v='+Date.now());
  delete globalThis.DreamlandDesktopCatalogView;
  await import(pathToFileURL(path.join(ROOT,'src/features/catalog/runtime-desktop-catalog-view.js')).href+'?v='+Date.now());
  const policy=globalThis.DreamlandDesktopCatalogView;
  policy.configure({products,seriesMeta:series,batchSize:24,productName:p=>String(p?.name||p?.id||''),productPriceValue:()=>0,productMoq:()=>1});
  policy.reset({scope:'all'});
  const expected=policy.buildViewModel().products.map(p=>{const x=String(p?.cover_image||'').trim();return x.startsWith('/')?x:'/'+x.replace(/^\.\//,'')}).filter(Boolean);
  const manifest=buildMobileHomeStartupManifest({products,assets});
  if(manifest.catalogImages.length!==Math.min(24,expected.length))fail('Startup manifest does not own the canonical first Catalog batch.');
  if(JSON.stringify(manifest.catalogImages)!==JSON.stringify(expected.slice(0,manifest.catalogImages.length)))fail('Startup preload order diverged from Catalog featured order.');
}catch(error){fail('Catalog preload parity failed: '+error.message)}
expect(pkg,'"r4:visual:mobile-startup": "node scripts/validate-r4-11b4-1c-a-mobile-startup-preload.mjs"','package script missing.');
expect(pkg,'npm run r4:visual:home-rhythm && npm run r4:visual:mobile-startup','validation chain missing.');
if(errors.length){console.error('\nR4.11B4.1C-A MOBILE STARTUP + CATALOG PRELOAD: FAIL\n');errors.forEach(e=>console.error('- '+e));console.error('');process.exit(1)}
console.log('R4.11B4.1C-A MOBILE STARTUP + CATALOG PRELOAD: PASS');
