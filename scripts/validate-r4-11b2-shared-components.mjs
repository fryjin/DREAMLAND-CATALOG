#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
function fail(m){errors.push(m);}
function read(r){const f=path.join(ROOT,r);if(!fs.existsSync(f)){fail('Missing '+r);return '';}return fs.readFileSync(f,'utf8');}
function has(c,m,msg){if(!c.includes(m))fail(msg+' Missing: '+m);}

const layout=read('src/astro/layouts/SiteLayout.astro');
const header=read('src/astro/components/site/SiteHeader.astro');
const footer=read('src/astro/components/site/SiteFooter.astro');
const site=read('src/astro/styles/system/site.css');
const controls=read('src/astro/styles/system/controls.css');
const forms=read('src/astro/styles/system/forms.css');
const surface=read('src/astro/styles/system/surface.css');
const tokens=read('src/astro/styles/system/tokens.css');
const pkg=read('package.json');

for(const m of ["import '../styles/system/surface.css';","import '../styles/system/controls.css';","import '../styles/system/forms.css';","import '../styles/system/site.css';"])has(layout,m,'SiteLayout shared imports incomplete.');
for(const m of ['data-dl-site-header','data-home-header','dl-site-nav home-nav','dl-site-actions','data-home-language-select','data-home-inquiry-count','href="/products/"','href="/custom/"','href="/inquiry/"'])has(header,m,'SiteHeader contract changed.');
for(const m of ['data-dl-site-footer','data-home-footer','dl-site-footer__grid home-footer__grid','dl-site-footer__links home-footer__links','href="/privacy/"'])has(footer,m,'SiteFooter contract changed.');
for(const m of ['.dl-site-header.home-header','.dl-site-actions','.dl-inquiry-action.home-nav__inquiry','.dl-site-footer.home-footer','@media (max-width:900px)','@media (max-width:560px)'])has(site,m,'Site visual contract incomplete.');
for(const m of ['.dl-button{','.dl-button--primary','.dl-button--secondary','.dl-button--text','.dl-icon-button','.dl-pill,.dl-chip'])has(controls,m,'Control primitive missing.');
for(const m of ['.dl-field{','.dl-field__label','.dl-input,.dl-select,.dl-textarea','@media (max-width:720px)'])has(forms,m,'Form primitive missing.');
for(const m of ['.dl-surface{','.dl-surface--soft','.dl-surface--summary','.dl-surface--floating','.dl-info-row'])has(surface,m,'Surface primitive missing.');
for(const m of ['--dl-color-mobile-canvas:#f3f4f7;','--dl-shadow-soft:','--dl-shadow-floating:'])has(tokens,m,'B2 token extension missing.');

for(const [r,c] of [
  ['controls.css',controls],
  ['forms.css',forms],
  ['surface.css',surface]
]){
  for(const bad of ['.home-','.catalog-','.pdp-','.custom-','.inquiry-','.contact-','.review-','.success-']){
    if(c.includes(bad))fail(r+' must stay route-agnostic; found '+bad);
  }
}

has(pkg,'"r4:visual:components": "node scripts/validate-r4-11b2-shared-components.mjs"','Missing B2 package script.');
has(pkg,'npm run r4:visual:foundation && npm run r4:visual:components','Main validation chain must run B2 after B1.');

if(errors.length){
  console.error('\nR4.11B2 SHARED COMPONENTS: FAIL\n');
  for(const e of errors)console.error('- '+e);
  process.exit(1);
}
console.log('R4.11B2 SHARED COMPONENTS: PASS');
