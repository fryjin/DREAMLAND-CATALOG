#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  SUPPORTED_LOCALES,
  htmlLangForLocale,
  localeRouteMap
} from '../src/astro/lib/locale-routing.mjs';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const DIST=path.join(ROOT,'.r4-astro-dist');
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs
    .readFileSync(
      path.join(ROOT,relative),
      'utf8'
    )
    .replace(/\r\n?/g,'\n');
}

function readDist(relative){
  return fs
    .readFileSync(
      path.join(DIST,relative),
      'utf8'
    );
}

function stateFromHtml(html,id){
  const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=
    html.match(
      new RegExp(
        '<script[^>]*id="'+escaped+'"[^>]*type="application\\/json"[^>]*>([\\s\\S]*?)<\\/script>',
        'i'
      )
    )||
    html.match(
      new RegExp(
        '<script[^>]*type="application\\/json"[^>]*id="'+escaped+'"[^>]*>([\\s\\S]*?)<\\/script>',
        'i'
      )
    );

  if(!match){
    return null;
  }

  try{
    return JSON.parse(match[1]);
  }catch(error){
    fail(id+' JSON is invalid: '+error.message);
    return null;
  }
}

if(!fs.existsSync(DIST)){
  fail('.r4-astro-dist is missing. Run npm run r4:astro:build first.');
}else{
  const products=
    JSON.parse(
      read('data/products.json')
    ).products||[];

  const firstProduct=
    products.find(product=>product?.status==='active');

  const productId=
    String(
      firstProduct?.productId||
      firstProduct?.id||
      ''
    )
      .trim()
      .toUpperCase();

  if(!productId){
    fail('No active product is available for F1.5-B validation.');
  }else{
    for(const locale of SUPPORTED_LOCALES){
      const routes=localeRouteMap(locale);
      const htmlLang=htmlLangForLocale(locale);

      const files={
        home:locale+'/index.html',
        catalog:locale+'/products/index.html',
        product:locale+'/products/'+productId+'/index.html',
        custom:locale+'/custom/index.html',
        inquiry:locale+'/inquiry/index.html',
        contact:locale+'/inquiry/contact/index.html',
        review:locale+'/inquiry/review/index.html',
        success:locale+'/inquiry/success/index.html'
      };

      const html={};

      for(const [name,relative] of Object.entries(files)){
        const full=path.join(DIST,relative);

        if(!fs.existsSync(full)){
          fail(locale+' '+name+' localized route is missing: '+relative);
          continue;
        }

        html[name]=readDist(relative);

        if(!html[name].includes('<html lang="'+htmlLang+'"')){
          fail(locale+' '+name+' first frame has the wrong HTML lang.');
        }

        if(!html[name].includes('data-route-locale="'+locale+'"')){
          fail(locale+' '+name+' is missing data-route-locale ownership.');
        }

        if(!html[name].includes('data-locale-href="/'+locale+'/')){
          fail(locale+' '+name+' Header is missing locale-switch targets.');
        }
      }

      if(html.home){
        for(const marker of [
          'href="'+routes.catalog+'"',
          'href="'+routes.custom+'"',
          'href="'+routes.inquiry+'"',
          'rel="canonical" href="https://dreamlandart.net/"'
        ]){
          if(!html.home.includes(marker)){
            fail(locale+' Home output is missing: '+marker);
          }
        }

        const state=stateFromHtml(html.home,'homeRuntimeState');
        if(
          state&&(
            state.defaultLanguage!==locale||
            state.routeLocale!==locale||
            state.localeRoutes?.home!==routes.home
          )
        ){
          fail(locale+' Home runtime locale contract changed.');
        }
      }

      if(html.catalog){
        const state=stateFromHtml(html.catalog,'catalogRuntimeState');
        if(
          state&&(
            state.defaultLanguage!==locale||
            state.routeLocale!==locale||
            !state.products?.every(product=>
              String(product?.href||'').startsWith('/'+locale+'/products/')
            )
          )
        ){
          fail(locale+' Catalog runtime routes are not locale-first.');
        }
      }

      if(html.product){
        const state=stateFromHtml(html.product,'pdpRuntimeState');
        if(
          state&&(
            state.defaultLanguage!==locale||
            state.routeLocale!==locale
          )
        ){
          fail(locale+' PDP runtime locale contract changed.');
        }

        if(!html.product.includes('href="'+routes.catalog+'"')){
          fail(locale+' PDP collection navigation lost locale.');
        }
      }

      if(html.inquiry){
        const state=stateFromHtml(html.inquiry,'inquiryRuntimeState');
        if(
          state&&(
            state.defaultLanguage!==locale||
            state.routeLocale!==locale||
            state.routes?.contact!==routes.contact
          )
        ){
          fail(locale+' Inquiry runtime route contract changed.');
        }
      }

      if(html.contact){
        const state=stateFromHtml(html.contact,'contactRuntimeState');
        if(
          state&&(
            state.defaultLanguage!==locale||
            state.routeLocale!==locale||
            state.routes?.review!==routes.review
          )
        ){
          fail(locale+' Contact runtime route contract changed.');
        }
      }

      if(html.review){
        const state=stateFromHtml(html.review,'reviewRuntimeState');
        if(
          state&&(
            state.defaultLanguage!==locale||
            state.routeLocale!==locale||
            state.localeRoutes?.success!==routes.success
          )
        ){
          fail(locale+' Review runtime route contract changed.');
        }
      }

      if(html.success){
        const state=stateFromHtml(html.success,'successRuntimeState');
        if(
          state&&(
            state.defaultLanguage!==locale||
            state.routeLocale!==locale||
            state.routes?.catalog!==routes.catalog||
            state.routes?.custom!==routes.custom
          )
        ){
          fail(locale+' Success runtime route contract changed.');
        }
      }
    }
  }

  if(fs.existsSync(path.join(DIST,'index.html'))){
    const legacy=readDist('index.html');

    if(!legacy.includes('<html lang="en"')){
      fail('Unprefixed compatibility Home must remain the EN static fallback.');
    }

    if(legacy.includes('data-route-locale=')){
      fail('Unprefixed compatibility Home must not claim a route locale.');
    }
  }
}

try{
  const wrappers=[
    'src/astro/pages/[lang]/index.astro',
    'src/astro/pages/[lang]/products/index.astro',
    'src/astro/pages/[lang]/products/[productId].astro',
    'src/astro/pages/[lang]/custom/index.astro',
    'src/astro/pages/[lang]/inquiry/index.astro',
    'src/astro/pages/[lang]/inquiry/contact/index.astro',
    'src/astro/pages/[lang]/inquiry/review/index.astro',
    'src/astro/pages/[lang]/inquiry/success/index.astro'
  ];

  for(const wrapper of wrappers){
    const source=read(wrapper);

    if(
      !source.includes('CanonicalPage')||
      !source.includes('SUPPORTED_LOCALES')||
      !source.includes('routeLocale={language}')
    ){
      fail('Localized wrapper is not a thin canonical-page adapter: '+wrapper);
    }
  }

  const header=read('src/astro/components/site/SiteHeader.astro');

  for(const marker of [
    'data-locale-routing="true"',
    'data-locale-href={withLocale(currentPath,option.value)}'
  ]){
    if(!header.includes(marker)){
      fail('SiteHeader locale navigation contract is missing: '+marker);
    }
  }

  if(
    header.includes('onchange=')||
    header.includes('onclick=')
  ){
    fail(
      'SiteHeader must remain declarative; locale navigation execution belongs to the existing page runtime.'
    );
  }

  for(const runtime of [
    'src/astro/runtime/home-runtime.js',
    'src/astro/runtime/catalog-runtime.js',
    'src/astro/runtime/pdp-runtime.js',
    'src/astro/runtime/custom-runtime.js',
    'src/astro/runtime/inquiry-runtime.js',
    'src/astro/runtime/contact-runtime.js',
    'src/astro/runtime/review-runtime.js',
    'src/astro/runtime/success-runtime.js'
  ]){
    const runtimeSource=
      read(runtime);

    if(!runtimeSource.includes('routeLocale')){
      fail('Route locale does not participate in runtime language precedence: '+runtime);
    }

    if(
      !runtimeSource.includes('localeHref')||
      !runtimeSource.includes('location')
    ){
      fail('Runtime-owned locale navigation contract is missing: '+runtime);
    }
  }

  const pkg=JSON.parse(read('package.json'));

  if(
    pkg.scripts?.['r4:locale:static-rendering']!==
    'node scripts/validate-f1-5b-localized-static-rendering.mjs'
  ){
    fail('package.json lost r4:locale:static-rendering.');
  }

  if(
    pkg.scripts?.['r4:production:locale-routes']!==
    'node scripts/r4-promote-locale-routes.mjs --write'
  ){
    fail('package.json lost r4:production:locale-routes.');
  }

  const validate=String(pkg.scripts?.validate||'');
  const expected=
    'npm run r4:astro:foundation && npm run r4:locale:static-rendering && npm run r4:astro:home';

  if(!validate.includes(expected)){
    fail('F1.5-B validator must run after Astro build and before route presentation gates.');
  }

  const build=String(pkg.scripts?.build||'');
  const buildExpected=
    'npm run r4:production:success && npm run r4:production:locale-routes && npm run r4:production:home:validate';

  if(!build.includes(buildExpected)){
    fail('Locale route promotion must run after all canonical cutovers and before Production validation.');
  }
}catch(error){
  fail('F1.5-B source/package inspection crashed: '+error.message);
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND F1.5-B LOCALIZED STATIC RENDERING: FAIL');
  for(const error of errors){
    console.error('- '+error);
  }
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND F1.5-B LOCALIZED STATIC RENDERING: PASS');
console.log('EN / ZH / KO static first frames / route-locale precedence / locale-preserving navigation / conversion-route inheritance / thin wrapper ownership verified.');
console.log('');
