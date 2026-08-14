#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const SRC_ROOT=path.join(ROOT,'src');
const errors=[];

function fail(message){errors.push(message)}
function read(relativePath){
  return fs.readFileSync(path.join(ROOT,relativePath),'utf8')
}
function exists(relativePath){
  return fs.existsSync(path.join(ROOT,relativePath))
}
function walkJs(directory){
  if(!fs.existsSync(directory))return [];
  const output=[];
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const full=path.join(directory,entry.name);
    if(entry.isDirectory())output.push(...walkJs(full));
    else if(entry.isFile()&&entry.name.endsWith('.js'))output.push(full);
  }
  return output;
}
function layerForFile(file){
  return path.relative(SRC_ROOT,file).split(path.sep)[0]
}
function resolveImport(fromFile,specifier){
  if(!specifier.startsWith('.'))return null;
  return path.resolve(path.dirname(fromFile),specifier)
}

const requiredFiles=[
  'src/README.md',
  'src/app/foundation.js',
  'src/app/layers.js',
  'src/app/legacy-map.js',
  'src/features/manifest.js',
  'src/ui/contracts.js',
  'src/services/contracts.js',
  'src/services/storage/runtime-storage.js',
  'src/services/pwa/runtime-pwa.js',
  'src/services/media/runtime-media.js',
  'src/app/runtime-hooks.js',
  'src/services/submission/runtime-submission.js',
  'src/services/risk/runtime-risk.js'
];

for(const file of requiredFiles){
  if(!exists(file))fail(`Frontend foundation file is missing: ${file}`)
}

let foundation=null;
let layersModule=null;

try{
  foundation=(await import(path.join(ROOT,'src/app/foundation.js'))).FRONTEND_FOUNDATION;
  layersModule=await import(path.join(ROOT,'src/app/layers.js'));
}catch(error){
  fail(`Cannot import frontend foundation: ${error.message}`)
}

if(foundation){
  if(foundation.phase!=='B4-02'){
    fail(`Unexpected frontend foundation phase: ${foundation.phase}`)
  }

  if(
    foundation.runtimeIntegrated!==true||
    foundation.runtimeIntegration!=='partial'
  ){
    fail('B4-02 must declare partial runtime integration.')
  }

  const uniqueIds=(items,label)=>{
    const ids=items.map(item=>item.id);
    const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
    if(duplicates.length){
      fail(`${label} contains duplicate IDs: ${[...new Set(duplicates)].join(', ')}`)
    }
  };

  uniqueIds(foundation.features,'Feature manifest');
  uniqueIds(foundation.ui,'UI contracts');
  uniqueIds(foundation.services,'Service contracts');

  if(foundation.features.some(item=>item.runtimeEnabled!==false)){
    fail('B4-02 does not migrate feature runtime ownership yet.')
  }

  if(foundation.ui.some(item=>item.runtimeEnabled!==false)){
    fail('B4-02 does not migrate UI runtime ownership yet.')
  }

  const enabledServices=foundation.services
    .filter(item=>item.runtimeEnabled===true)
    .map(item=>item.id);

  const enabledSet=
    new Set(enabledServices);

  if(
    enabledServices.length!==5||
    !enabledSet.has('storage')||
    !enabledSet.has('pwa')||
    !enabledSet.has('media')||
    !enabledSet.has('submission')||
    !enabledSet.has('risk')
  ){
    fail(
      `B4-02 must runtime-enable storage, pwa, media, submission and risk; found: `+
      `${enabledServices.join(', ')||'none'}`
    )
  }

  const storageService=foundation.services.find(item=>item.id==='storage');
  if(
    storageService?.runtimeOwner!==
    'src/services/storage/runtime-storage.js'
  ){
    fail('Storage service runtime owner is incorrect.')
  }

  const storageMigration=foundation.legacyMap.find(item=>item.id==='storage');
  if(
    storageMigration?.runtimeMigrated!==true||
    storageMigration?.status!=='migrated'
  ){
    fail('Legacy map does not mark storage as migrated.')
  }

  const pwaService=foundation.services.find(item=>item.id==='pwa');
  if(
    pwaService?.runtimeOwner!==
    'src/services/pwa/runtime-pwa.js'
  ){
    fail('PWA service runtime owner is incorrect.')
  }

  const pwaMigration=foundation.legacyMap.find(item=>item.id==='pwa');
  if(
    pwaMigration?.runtimeMigrated!==true||
    pwaMigration?.status!=='migrated'
  ){
    fail('Legacy map does not mark PWA as migrated.')
  }

  const mediaService=foundation.services.find(item=>item.id==='media');
  if(
    mediaService?.runtimeOwner!==
    'src/services/media/runtime-media.js'||
    mediaService?.migrationStatus!=='partial'
  ){
    fail('Media service ownership/status is incorrect for B2-04.')
  }

  const mediaMigration=foundation.legacyMap.find(item=>item.id==='media');
  if(
    mediaMigration?.status!=='partial'||
    !mediaMigration?.runtimeOwners?.includes(
      'src/services/media/runtime-media.js'
    )
  ){
    fail('Legacy map does not mark media as partially consolidated.')
  }


  const submissionService=foundation.services.find(item=>item.id==='submission');
  if(
    submissionService?.runtimeOwner!==
    'src/services/submission/runtime-submission.js'||
    submissionService?.migrationStatus!=='partial'
  ){
    fail('Submission service ownership/status is incorrect for B4-01.')
  }

  const submissionMigration=foundation.legacyMap.find(item=>item.id==='submission');
  if(
    submissionMigration?.status!=='partial'||
    submissionMigration?.runtimeMigrated!==false||
    !submissionMigration?.runtimeOwners?.includes(
      'src/services/submission/runtime-submission.js'
    )
  ){
    fail('Legacy map does not mark Submission as a partial runtime boundary.')
  }

  const riskService=foundation.services.find(item=>item.id==='risk');
  if(
    riskService?.runtimeOwner!==
    'src/services/risk/runtime-risk.js'||
    riskService?.migrationStatus!=='partial'
  ){
    fail('Risk service ownership/status is incorrect for B4-02.')
  }

  const riskMigration=foundation.legacyMap.find(item=>item.id==='risk');
  if(
    riskMigration?.status!=='partial'||
    riskMigration?.runtimeMigrated!==false||
    !riskMigration?.runtimeOwners?.includes(
      'src/services/risk/runtime-risk.js'
    )||
    !riskMigration?.runtimeOwners?.includes(
      'functions/api/submit.js'
    )
  ){
    fail('Legacy map does not mark Risk as a partial client/server boundary.')
  }
}

const architectureFiles=[
  ...walkJs(path.join(SRC_ROOT,'app')),
  ...walkJs(path.join(SRC_ROOT,'features')),
  ...walkJs(path.join(SRC_ROOT,'ui')),
  ...walkJs(path.join(SRC_ROOT,'services'))
];

const importPattern=
  /(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;

if(layersModule){
  const {FRONTEND_LAYERS,canLayerDependOn}=layersModule;

  for(const file of architectureFiles){
    const source=fs.readFileSync(file,'utf8');
    const fromLayer=layerForFile(file);

    if(!FRONTEND_LAYERS.includes(fromLayer)){
      fail(`Unknown source layer for ${path.relative(ROOT,file)}: ${fromLayer}`);
      continue;
    }

    for(const match of source.matchAll(importPattern)){
      const resolved=resolveImport(file,match[1]);
      if(!resolved)continue;

      if(!resolved.startsWith(SRC_ROOT+path.sep)){
        fail(`${path.relative(ROOT,file)} imports outside src/: ${match[1]}`);
        continue;
      }

      const toLayer=layerForFile(resolved);
      if(!canLayerDependOn(fromLayer,toLayer)){
        fail(
          `Layer violation: ${fromLayer} cannot depend on ${toLayer} `+
          `(${path.relative(ROOT,file)} → ${match[1]})`
        )
      }
    }
  }
}

try{
  const indexSource=read('index.html');
  for(const entry of [
    './src/app/foundation.js',
    './src/features/manifest.js',
    './src/ui/contracts.js',
    './src/services/contracts.js'
  ]){
    if(indexSource.includes(entry)){
      fail(`Architecture metadata module must not load in index.html: ${entry}`)
    }
  }
}catch(error){
  fail(`Cannot inspect index.html architecture boundary: ${error.message}`)
}

try{
  const swSource=read('sw.js');
  for(const entry of [
    './src/app/foundation.js',
    './src/features/manifest.js',
    './src/ui/contracts.js',
    './src/services/contracts.js'
  ]){
    if(swSource.includes(entry)){
      fail(`Architecture metadata file must not enter APP_SHELL: ${entry}`)
    }
  }
}catch(error){
  fail(`Cannot inspect sw.js architecture boundary: ${error.message}`)
}

if(errors.length){
  console.error('\nFrontend module foundation validation failed:\n');
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}

console.log('Frontend module foundation validation: PASS');
