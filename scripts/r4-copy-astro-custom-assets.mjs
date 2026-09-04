#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'.r4-astro-dist');

function fail(message){
  console.error('');
  console.error('[R4 Astro Custom Runtime] FAIL');
  console.error('- '+message);
  console.error('');
  process.exit(1);
}
function read(file){return fs.readFileSync(file,'utf8');}

const customPage=path.join(OUT,'custom','index.html');
if(!fs.existsSync(customPage)) fail('Custom Astro output is missing before runtime assembly.');
const html=read(customPage);
for(const marker of ['id="customRuntimeState"','src="/r4-custom-runtime.js"']){
  if(!html.includes(marker)) fail('Custom Astro output is not R4.6B runtime-ready: '+marker);
}

const runtimeSources=[
  path.join(ROOT,'src','features','custom','runtime-custom.js'),
  path.join(ROOT,'src','features','inquiry','runtime-inquiry.js'),
  path.join(ROOT,'src','astro','runtime','custom-runtime.js')
];
for(const source of runtimeSources){
  if(!fs.existsSync(source)) fail('Custom runtime source is missing: '+path.relative(ROOT,source));
}

const target=path.join(OUT,'r4-custom-runtime.js');
fs.writeFileSync(target,runtimeSources.map(read).join('\n;\n')+'\n','utf8');
console.log('[R4 Astro Custom Runtime] bundled Custom + Inquiry + minimal Astro adapter → .r4-astro-dist/r4-custom-runtime.js');
