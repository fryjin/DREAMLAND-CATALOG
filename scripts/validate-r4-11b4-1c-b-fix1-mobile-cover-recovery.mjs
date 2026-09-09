#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];const fail=m=>errors.push(m);
function read(r){const f=path.join(ROOT,r);if(!fs.existsSync(f)){fail('Missing required file: '+r);return '';}return fs.readFileSync(f,'utf8');}
function json(r){try{return JSON.parse(read(r));}catch(e){fail('Invalid JSON: '+r+' — '+e.message);return {};}}
function expect(s,m,msg){if(!s.includes(m))fail(msg+' Missing: '+m);}
const viewModel=read('src/astro/lib/home-view-model.mjs');
const page=read('src/astro/components/home/HomePage.astro');
const css=read('src/astro/styles/mobile-home.css');
const runtime=read('src/astro/runtime/home-runtime.js');
const assets=json('data/mobile-home-assets.json');
const siteContent=json('data/site-content.json');
const pkg=read('package.json');
for(const m of ['const hero=','content?.hero||','hero:Object.freeze({','hero.kicker||','hero.title||','hero.body||','hero.primary||','hero.secondary||'])expect(viewModel,m,'FIX1 canonical Hero content pipeline changed.');
for(const language of ['en','zh','ko']){const hero=siteContent?.languages?.[language]?.hero;if(!hero||!String(hero.kicker||'').trim()||!String(hero.title||'').trim()||!String(hero.primary||'').trim())fail('FIX1 requires non-empty canonical Hero content for language: '+language);}
for(const m of ['const hero=content.hero||{};','data-home-bind="hero.kicker"','data-home-bind="hero.title"','data-home-bind="hero.body"','data-home-bind="hero.primary"','href="/products/"'])expect(page,m,'FIX1 Mobile Cover content binding changed.');
const firstMobileMedia=css.indexOf('@media (max-width:720px)');if(firstMobileMedia<0)fail('FIX1 could not find the Mobile breakpoint.');
const baseCss=firstMobileMedia>=0?css.slice(0,firstMobileMedia):css;
if(!/\.home-mobile-cover\s*\{[^}]*display\s*:\s*none\s*;?[^}]*\}/s.test(baseCss))fail('FIX1 Mobile Cover must be hidden by default outside <=720px.');
const coverStart=css.indexOf('/* R4.11B4.1C-B — Digital Catalog Cover */');const coverCss=coverStart>=0?css.slice(coverStart):'';
if(!/\.home-mobile-cover\s*\{[^}]*display\s*:\s*flex\s*;?/s.test(coverCss))fail('FIX1 Mobile Cover must still display inside the Mobile Cover breakpoint.');
const cleanCover='./images/desktop/home/hero/hero-main.webp';
if(assets?.cover?.image!==cleanCover)fail('FIX1 Mobile Cover must use the clean photography source: '+cleanCover);
if(String(assets?.cover?.image||'').includes('HOME001'))fail('FIX1 must not use the Legacy baked-layout HOME001 image as the live Mobile Cover.');
const coverFile=path.join(ROOT,cleanCover.replace(/^\.\//,''));if(!fs.existsSync(coverFile))fail('FIX1 clean Mobile Cover asset is missing: '+cleanCover);else{const bytes=fs.statSync(coverFile).size;if(bytes>400*1024)fail('FIX1 clean Mobile Cover candidate exceeds 400 KiB: '+bytes+' bytes.');}
const eagerCount=(page.match(/<img\b[^>]*\bloading="eager"[^>]*>/gi)||[]).length;if(eagerCount!==1)fail('FIX1 must preserve exactly one eager Home image; found '+eagerCount+'.');
for(const m of ["const MOBILE_STARTUP_VERSION='R4.11B4.1C-A';",'target:24','minimum:preferFull?24:16','startCatalogWarmup','mobileStartupSnapshot','mountMobileStartup();','mountMobileCoverGate();','progress>=.72',"root.location.assign(gate.href)"])expect(runtime,m,'FIX1 must preserve C-A preload and C-B Touch Handoff contracts.');
for(const f of ['startup-loader.js','DreamlandStartupLoader',"go('catalog')",'screen[data-screen','window.fetch =','root.fetch ='])if(runtime.includes(f))fail('FIX1 reintroduced Legacy Mobile architecture: '+f);
if(Buffer.byteLength(runtime,'utf8')>20*1024)fail('FIX1 Home runtime exceeds the existing controlled 20 KiB budget.');
expect(pkg,'"r4:visual:mobile-cover-recovery": "node scripts/validate-r4-11b4-1c-b-fix1-mobile-cover-recovery.mjs"','package.json must expose FIX1 validator.');
expect(pkg,'npm run r4:visual:mobile-cover && npm run r4:visual:mobile-cover-recovery','Main validation chain must run FIX1 after B4.1C-B.');
if(errors.length){console.error('\nR4.11B4.1C-B-FIX1 MOBILE COVER RECOVERY + ISOLATION: FAIL\n');for(const e of errors)console.error('- '+e);console.error('');process.exit(1);}
console.log('R4.11B4.1C-B-FIX1 MOBILE COVER RECOVERY + ISOLATION: PASS');
