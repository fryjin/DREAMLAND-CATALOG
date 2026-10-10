#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const read=(rel)=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const errors=[];
const fail=message=>errors.push(message);

const source=read('src/astro/pages/index.astro');
const pkg=JSON.parse(read('package.json'));
const assets=JSON.parse(read('data/desktop-home-assets.json'));
const localeContract=read('src/astro/lib/locale-routing.mjs');

const headStart=source.indexOf('<Fragment slot="head">');
const marker='data-f4-home-hero-locale-first-paint';
const scriptStart=source.indexOf(marker);
const preloadStart=source.indexOf('href={view.hero.desktopImage}');
const inlineMatch=source.match(/<script is:inline data-f4-home-hero-locale-first-paint>([\s\S]*?)<\/script>/);

if(headStart<0)fail('Home head slot is missing.');
if(source.split(marker).length!==2)fail('Expected one early Home locale guard.');
if(scriptStart<0||preloadStart<0||!(headStart<scriptStart&&scriptStart<preloadStart)){
  fail('Locale guard must appear in the Home head before desktop Hero preload.');
}
if(!source.includes('{!routeLocale&&(')){
  fail('Home locale guard must be restricted to the unprefixed route.');
}
if(!inlineMatch){
  fail('Unable to extract the inline Home locale guard.');
}
if(!localeContract.includes("const STORAGE_KEY='productManualLang';")){
  fail('Canonical locale preference storage key changed.');
}
for(const lang of ['en','zh','ko']){
  if(!assets.hero?.localizedDesktop?.[lang]){
    fail('Missing localized desktop Hero for '+lang+'.');
  }
}
if(!source.includes('view.hero.desktopImage')){
  fail('Home desktop Hero must remain server-rendered for localized routes.');
}
const expectedCommand='node scripts/validate-f4-home-hero-locale-first-paint.mjs';
if(pkg.scripts?.['f4:home:hero-locale-first-paint']!==expectedCommand){
  fail('package.json must expose f4:home:hero-locale-first-paint.');
}
const validationSteps=String(pkg.scripts?.validate||'').split(' && ');
const homeRuntimeIndex=validationSteps.indexOf('npm run r4:astro:home-runtime');
const firstPaintIndex=validationSteps.indexOf('npm run f4:home:hero-locale-first-paint');
const catalogIndex=validationSteps.indexOf('npm run r4:astro:catalog');
if(
  homeRuntimeIndex<0||
  firstPaintIndex!==homeRuntimeIndex+1||
  catalogIndex!==firstPaintIndex+1
){
  fail('First-paint locale regression gate must run after Home Runtime and before Catalog.');
}
if(
  validationSteps.slice(-3).join(' && ')!==
  'npm run r4:visual:pdp-metadata-cleanup && npm run r4:copy:canonical-customer && npm run r4:copy:zh-customer'
){
  fail('Main validation chain must keep canonical-customer -> zh-customer as its final copy gates.');
}

// Browser-behavior simulation: the script must redirect before the first Hero
// preload on /, but never override an explicit /en/, /zh/ or /ko/ route.
if(inlineMatch){
  const code=inlineMatch[1];
  function trial({pathname='/',saved='',query='',hash='',storageError=false}){
    const calls=[];
    const location={pathname,search:query,hash,replace:url=>calls.push(url)};
    const localStorage={getItem:key=>{
      if(storageError)throw Error('Storage blocked');
      if(key!=='productManualLang')throw Error('Wrong language key: '+key);
      return saved;
    }};
    try{
      vm.runInNewContext(code,{window:{location,localStorage}}, {timeout:1000});
    }catch(error){
      fail('Home locale guard crashed: '+error.message);
    }
    return calls;
  }
  const cases=[
    [{saved:'zh'},['/zh/']],
    [{saved:'ko'},['/ko/']],
    [{saved:'ZH',query:'?src=mail',hash:'#hero'},['/zh/?src=mail#hero']],
    [{saved:'  KO  '},['/ko/']],
    [{saved:'en'},[]],
    [{saved:'fr'},[]],
    [{saved:''},[]],
    [{saved:'zh',pathname:'/en/'},[]],
    [{saved:'ko',pathname:'/zh/'},[]],
    [{saved:'zh',pathname:'/products/'},[]],
    [{saved:'zh',storageError:true},[]]
  ];
  for(const [input,expected] of cases){
    const actual=trial(input);
    if(JSON.stringify(actual)!==JSON.stringify(expected)){
      fail('First-paint locale behavior mismatch: '+JSON.stringify({input,actual,expected}));
    }
  }
}

// Optional dist check after build. Source-only mode avoids stale build artifacts.
if(process.argv.includes('--dist')){
  const rootPath=path.join(ROOT,'.r4-astro-dist/index.html');
  const zhPath=path.join(ROOT,'.r4-astro-dist/zh/index.html');
  const enPath=path.join(ROOT,'.r4-astro-dist/en/index.html');
  if(!fs.existsSync(rootPath)||!fs.existsSync(zhPath)||!fs.existsSync(enPath)){
    fail('Built Home pages are missing. Run npm run build first.');
  }else{
    const rootHtml=fs.readFileSync(rootPath,'utf8');
    const zhHtml=fs.readFileSync(zhPath,'utf8');
    const enHtml=fs.readFileSync(enPath,'utf8');
    const guardPos=rootHtml.indexOf(marker);
    const heroPos=rootHtml.indexOf('/images/desktop/home/hero/hero-main-en.webp');
    if(!(guardPos>=0&&heroPos>=0&&guardPos<heroPos)){
      fail('Built unprefixed Home must place the locale guard before English Hero preload.');
    }
    if(zhHtml.includes(marker)||enHtml.includes(marker)){
      fail('Explicit localized Home routes must not emit the root-only locale guard.');
    }
    if(!zhHtml.includes('/images/desktop/home/hero/hero-main-zh.webp')){
      fail('Built /zh/ Home lacks the native Chinese Hero asset.');
    }
    if(!enHtml.includes('/images/desktop/home/hero/hero-main-en.webp')){
      fail('Built /en/ Home lacks the native English Hero asset.');
    }
  }
}

if(errors.length){
  console.error('\nF4 HOME HERO LOCALE FIRST PAINT: FAIL');
  for(const error of errors)console.error('- '+error);
  process.exit(1);
}
console.log('\nF4 HOME HERO LOCALE FIRST PAINT: PASS');
console.log('Root Home resolves a saved ZH/KO locale before English Hero preload; explicit locale routes remain authoritative.');
if(process.argv.includes('--dist'))console.log('Built /, /zh/, and /en/ Home routes verified.');
