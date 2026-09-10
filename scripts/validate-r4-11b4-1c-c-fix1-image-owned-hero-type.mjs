#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];const fail=m=>errors.push(m);
const read=r=>{const f=path.join(ROOT,r);if(!fs.existsSync(f)){fail('Missing '+r);return '';}return fs.readFileSync(f,'utf8')};
const json=r=>JSON.parse(read(r));
const expect=(s,m,msg)=>{if(!s.includes(m))fail(msg+' Missing: '+m)};
const page=read('src/astro/components/home/HomePage.astro');
const css=read('src/astro/styles/mobile-home.css');
const runtime=read('src/astro/runtime/home-runtime.js');
const content=json('data/site-content.json');
const pkg=read('package.json');
[
  'data-mobile-hero-type-owner="asset"',
  'class="home-mobile-cover__semantic home-sr-only"',
  'data-mobile-cover-semantic',
  'data-home-bind="hero.kicker"',
  'data-home-bind="hero.title"',
  'data-home-bind="hero.body"',
  'data-home-bind="hero.primary"'
].forEach(m=>expect(page,m,'Image-owned Hero contract changed.'));
const a=page.indexOf('data-mobile-cover-semantic');const b=a>=0?page.indexOf('</p>',a):-1;const sem=a>=0&&b>a?page.slice(a,b):'';
['data-home-bind="hero.kicker"','data-home-bind="hero.title"'].forEach(m=>expect(sem,m,'Kicker/title must remain semantic-only.'));
['class="home-mobile-cover__display"','<h2 data-home-bind="hero.title">'].forEach(m=>{if(page.includes(m))fail('Visible Hero kicker/title DOM returned: '+m)});
['en','zh','ko'].forEach(lang=>{const h=content?.languages?.[lang]?.hero;if(!h||!String(h.kicker||'').trim()||!String(h.title||'').trim())fail('Semantic Hero copy missing for '+lang)});
['.home-mobile-cover__display','.home-mobile-cover__copy h2'].forEach(m=>{if(css.includes(m))fail('Dead visible Hero typography CSS returned: '+m)});
['.home-mobile-cover__edition','.home-mobile-cover__copy p','.home-mobile-gate','.home-cover-language','rgba(8,6,5,.78) 100%','object-position:46% center;'].forEach(m=>expect(css,m,'Accepted Cover system changed.'));
const first=css.indexOf('@media (max-width:720px)');const base=first>=0?css.slice(0,first):css;if(!/\.home-mobile-cover\s*\{[^}]*display\s*:\s*none/s.test(base))fail('Desktop isolation changed.');
["const MOBILE_STARTUP_VERSION='R4.11B4.1C-A';",'target:24','minimum:preferFull?24:16','mobileStartupSnapshot','progress>=.72',"root.location.assign(gate.href)",'[data-home-language-option]'].forEach(m=>expect(runtime,m,'Runtime contract changed.'));
if(Buffer.byteLength(runtime,'utf8')>20*1024)fail('Home runtime exceeds 20 KiB.');
const eager=(page.match(/<img\b[^>]*\bloading="eager"[^>]*>/gi)||[]).length;if(eager!==1)fail('Expected exactly one eager Home image; found '+eager);
['startup-loader.js','DreamlandStartupLoader',"go('catalog')",'screen[data-screen','window.fetch =','root.fetch ='].forEach(m=>{if(runtime.includes(m))fail('Legacy Mobile architecture returned: '+m)});
expect(pkg,'"r4:visual:mobile-cover-image-type": "node scripts/validate-r4-11b4-1c-c-fix1-image-owned-hero-type.mjs"','Package script missing.');
expect(pkg,'npm run r4:visual:mobile-cover-polish && npm run r4:visual:mobile-cover-image-type','Validation chain missing.');
if(errors.length){console.error('\nR4.11B4.1C-C-FIX1 IMAGE-OWNED HERO TYPOGRAPHY: FAIL\n');errors.forEach(e=>console.error('- '+e));console.error('');process.exit(1)}
console.log('R4.11B4.1C-C-FIX1 IMAGE-OWNED HERO TYPOGRAPHY: PASS');
