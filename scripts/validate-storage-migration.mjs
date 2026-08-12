#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){errors.push(message)}
function read(relativePath){
  return fs.readFileSync(path.join(ROOT,relativePath),'utf8')
}

const servicePath=path.join(ROOT,'src/services/storage/runtime-storage.js');

if(!fs.existsSync(servicePath)){
  fail('Storage runtime service is missing.')
}else{
  try{
    delete globalThis.DreamlandStorage;
    await import(`${pathToFileURL(servicePath).href}?storage-validation=${Date.now()}`);

    const service=globalThis.DreamlandStorage;

    if(!service){
      fail('Storage runtime service did not expose DreamlandStorage.')
    }else{
      if(service.version!=='B2-02'){
        fail(`Unexpected storage service version: ${service.version}`)
      }

      for(const scope of ['local','session']){
        const storage=service[scope];

        for(const method of ['getItem','setItem','removeItem']){
          if(typeof storage?.[method]!=='function'){
            fail(`DreamlandStorage.${scope}.${method} is missing.`)
          }
        }

        const key=`dreamland-storage-validator-${scope}`;
        storage?.setItem(key,'value');

        if(storage?.getItem(key)!=='value'){
          fail(`DreamlandStorage.${scope} failed set/get parity.`)
        }

        storage?.removeItem(key);

        if(storage?.getItem(key)!==null){
          fail(`DreamlandStorage.${scope} failed remove parity.`)
        }
      }
    }
  }catch(error){
    fail(`Storage runtime service execution failed: ${error.message}`)
  }
}

try{
  const indexSource=read('index.html');
  const scriptTag=
    '<script src="./src/services/storage/runtime-storage.js"></script>';

  const matches=indexSource.match(
    /<script src="\.\/src\/services\/storage\/runtime-storage\.js"><\/script>/g
  )||[];

  if(matches.length!==1){
    fail(`index.html must load runtime-storage.js exactly once; found ${matches.length}.`)
  }

  if(!indexSource.includes('const appStorage=window.DreamlandStorage;')){
    fail('index.html is missing the appStorage bridge.')
  }

  if(indexSource.includes('localStorage.')){
    fail('index.html still accesses localStorage directly.')
  }

  if(indexSource.includes('sessionStorage.')){
    fail('index.html still accesses sessionStorage directly.')
  }

  const scriptIndex=indexSource.indexOf(scriptTag);
  const bridgeIndex=indexSource.indexOf('const appStorage=window.DreamlandStorage;');
  const stateIndex=indexSource.indexOf("const STORAGE_KEY='productManualV2State';");

  if(
    scriptIndex<0||
    bridgeIndex<0||
    stateIndex<0||
    !(scriptIndex<bridgeIndex&&bridgeIndex<stateIndex)
  ){
    fail('Storage runtime load/bridge/state initialization order is incorrect.')
  }
}catch(error){
  fail(`index.html storage inspection failed: ${error.message}`)
}

try{
  const swSource=read('sw.js');

  if(!swSource.includes("const CACHE_VERSION = 'dreamland-pwa-v64';")){
    fail('sw.js cache version must be dreamland-pwa-v64 for B2-02.')
  }

  const matches=swSource.match(
    /'\.\/src\/services\/storage\/runtime-storage\.js'/g
  )||[];

  if(matches.length!==1){
    fail(`sw.js APP_SHELL must include runtime-storage.js exactly once; found ${matches.length}.`)
  }
}catch(error){
  fail(`sw.js storage inspection failed: ${error.message}`)
}

try{
  const startupSource=read('startup-loader.js');

  if(!startupSource.includes('localStorage')){
    fail(
      'startup-loader.js pre-bootstrap storage exception unexpectedly disappeared; '+
      'review startup sequencing before removing it.'
    )
  }
}catch(error){
  fail(`startup-loader.js exception inspection failed: ${error.message}`)
}

if(errors.length){
  console.error('\nStorage migration validation failed:\n');
  for(const error of errors)console.error(`- ${error}`);
  process.exit(1);
}

console.log('Storage migration validation: PASS');
