#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_MODE=process.argv.includes('--source');
const DIST_MODE=process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error('Usage: node scripts/validate-f3-b1-locale-safe-edit-return.mjs --source|--dist');
  process.exit(1);
}

const errors=[];
const fail=message=>errors.push(message);
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8').replace(/\\r\\n?/g,'\\n');
const json=relative=>JSON.parse(read(relative));

function requireMarker(source,marker,label){
  if(!source.includes(marker)) fail(label+': '+marker);
}
function rejectPattern(source,pattern,label){
  if(pattern.test(source)) fail(label);
}
function literalCount(source,value){
  return source.split(value).length-1;
}

if(SOURCE_MODE){
  try{
    const localeRouting=read('src/astro/lib/locale-routing.mjs');
    for(const marker of ['function localeRouteMap(','function decorateLocaleRuntimeState(','localeRoutes:']){
      requireMarker(localeRouting,marker,'Locale routing contract missing');
    }
    for(const relative of ['src/astro/pages/products/[productId].astro','src/astro/pages/custom/index.astro']){
      requireMarker(read(relative),'decorateLocaleRuntimeState(',relative+' must decorate runtime state');
    }
  }catch(error){
    fail('Locale runtime-state validation failed: '+error.message);
  }

  try{
    const runtime=read('src/astro/runtime/pdp-inquiry-edit-runtime.js');
    for(const marker of [
      'function inquiryHref(state)',
      'state?.localeRoutes',
      'text(\n          state?.routeLocale',
      'back.href=\n        inquiryHref(',
      'root.location.assign(\n            inquiryHref(',
      'root.location.assign(\n          inquiryHref('
    ]){
      requireMarker(runtime,marker,'PDP edit locale-safe return missing');
    }
    if(literalCount(runtime,"'/inquiry/'")!==1){
      fail('PDP edit runtime must keep /inquiry/ only as one fallback literal.');
    }
    rejectPattern(runtime,/back\.href\s*=\s*['"]\/inquiry\/['"]/,'PDP edit Back still hardcodes /inquiry/.');
    rejectPattern(runtime,/location\.assign\(\s*['"]\/inquiry\/['"]\s*\)/,'PDP edit redirect still hardcodes /inquiry/.');
    const bytes=Buffer.byteLength(runtime,'utf8');
    if(bytes>8*1024) fail('PDP Inquiry Edit runtime exceeded protected 8 KiB budget: '+bytes+' bytes.');
  }catch(error){
    fail('PDP edit validation failed: '+error.message);
  }

  try{
    const runtime=read('src/astro/runtime/custom-runtime.js');
    requireMarker(
      runtime,
      "function inquiryHref(){ return text(state?.localeRoutes?.inquiry||state?.routes?.inquiry)||'/inquiry/'; }",
      'Custom edit locale-safe helper missing'
    );
    if(literalCount(runtime,"'/inquiry/'")!==1){
      fail('Custom runtime must keep /inquiry/ only as one fallback literal.');
    }
    rejectPattern(runtime,/location\.assign\(\s*['"]\/inquiry\/['"]\s*\)/,'Custom edit redirect still hardcodes /inquiry/.');
    for(const retained of ['.addCustom(','.replaceItem(','.persist()','customEditSave','saveChanges']){
      requireMarker(runtime,retained,'Custom canonical create/edit flow was lost');
    }
    const bytes=Buffer.byteLength(runtime,'utf8');
    if(bytes>36*1024) fail('Custom runtime exceeded protected 36 KiB budget: '+bytes+' bytes.');
  }catch(error){
    fail('Custom edit validation failed: '+error.message);
  }

  try{
    const pkg=json('package.json');
    if(pkg.scripts?.['r4:conversion:locale-safe-edit-return']!=='node scripts/validate-f3-b1-locale-safe-edit-return.mjs --source'){
      fail('package.json is missing r4:conversion:locale-safe-edit-return.');
    }
    if(pkg.scripts?.['r4:conversion:locale-safe-edit-return:dist']!=='node scripts/validate-f3-b1-locale-safe-edit-return.mjs --dist'){
      fail('package.json is missing r4:conversion:locale-safe-edit-return:dist.');
    }

    const validate=String(pkg.scripts?.validate||'');
    const customEdit=validate.indexOf('npm run r4:conversion:custom-edit');
    const localeSafe=validate.indexOf('npm run r4:conversion:locale-safe-edit-return');
    const unified=validate.indexOf('npm run r4:conversion:unified-commercial-group');
    if(customEdit<0||localeSafe<=customEdit||unified<=localeSafe){
      fail('F3-B1 source gate must run after Custom Edit and before unified commercial grouping.');
    }

    const build=String(pkg.scripts?.build||'');
    const customEditDist=build.indexOf('npm run r4:conversion:custom-edit:dist');
    const localeSafeDist=build.indexOf('npm run r4:conversion:locale-safe-edit-return:dist');
    const unifiedDist=build.indexOf('npm run r4:conversion:unified-commercial-group:dist');
    if(customEditDist<0||localeSafeDist<=customEditDist||unifiedDist<=localeSafeDist){
      fail('F3-B1 dist gate must run after Custom Edit dist and before unified commercial grouping dist.');
    }
  }catch(error){
    fail('F3-B1 package topology validation failed: '+error.message);
  }
}

if(DIST_MODE){
  try{
    for(const relative of ['.r4-astro-dist/r4-pdp-runtime.js','dist/r4-pdp-runtime.js']){
      const runtime=read(relative);
      for(const marker of ['function inquiryHref(state)','state?.localeRoutes','back.href=\n        inquiryHref(']){
        requireMarker(runtime,marker,relative+' lost locale-safe PDP edit return');
      }
      rejectPattern(runtime,/back\.href\s*=\s*['"]\/inquiry\/['"]/ ,relative+' restored a hardcoded PDP Back route.');
      rejectPattern(runtime,/location\.assign\(\s*['"]\/inquiry\/['"]\s*\)/,relative+' restored a hardcoded PDP edit redirect.');
    }

    for(const relative of ['.r4-astro-dist/r4-custom-runtime.js','dist/r4-custom-runtime.js']){
      const runtime=read(relative);
      requireMarker(
        runtime,
        "function inquiryHref(){ return text(state?.localeRoutes?.inquiry||state?.routes?.inquiry)||'/inquiry/'; }",
        relative+' lost locale-safe Custom edit return'
      );
      rejectPattern(runtime,/location\.assign\(\s*['"]\/inquiry\/['"]\s*\)/,relative+' restored a hardcoded Custom edit redirect.');
    }

    const productId=String(json('data/products.json').products?.find(row=>row?.status==='active')?.productId||'').trim().toUpperCase();
    if(!productId){
      fail('No active product is available for localized PDP artifact validation.');
    }else{
      for(const base of ['.r4-astro-dist','dist']){
        for(const locale of ['zh','ko']){
          for(const relative of [
            `${base}/${locale}/custom/index.html`,
            `${base}/${locale}/products/${productId}/index.html`
          ]){
            requireMarker(
              read(relative),
              `"inquiry":"/${locale}/inquiry/"`,
              relative+' is missing localized localeRoutes.inquiry'
            );
          }
        }
      }
    }
  }catch(error){
    fail('F3-B1 Production artifact validation failed: '+error.message);
  }
}

if(errors.length){
  console.error('');
  console.error('DREAMLAND F3-B1 LOCALE-SAFE EDIT RETURN: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}

console.log('');
console.log('DREAMLAND F3-B1 LOCALE-SAFE EDIT RETURN: PASS');
console.log(
  SOURCE_MODE
    ? 'PDP + Custom edit returns inherit localeRoutes.inquiry; PDP edit language obeys route locale > storage; runtime budgets preserved.'
    : 'Astro + Production PDP/Custom runtimes and localized HTML preserve locale-safe edit return.'
);
console.log('');
