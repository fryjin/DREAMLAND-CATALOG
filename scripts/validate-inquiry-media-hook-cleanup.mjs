#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const errors=[];

function fail(message){errors.push(message);}
function read(relativePath){return fs.readFileSync(path.join(ROOT,relativePath),'utf8');}

try{
  const indexSource=read('index.html');
  for(const eventName of ['inquiry.beforeRender','inquiry.afterRender']){
    if(!indexSource.includes(`'${eventName}'`)) fail(`index.html is missing Inquiry lifecycle event: ${eventName}`);
  }
  if(!/function\s+renderInquiry\s*\(\s*\)/.test(indexSource)) fail('index.html is missing the core renderInquiry function.');
  if(
    !/DreamlandRuntimeHooks\s*\?\.\s*emit\s*\(\s*['"]inquiry\.beforeRender['"]/.test(indexSource)&&
    !/DreamlandRuntimeHooks[\s\S]{0,120}\.emit\s*\(\s*['"]inquiry\.beforeRender['"]/.test(indexSource)
  ) fail('renderInquiry does not emit inquiry.beforeRender.');
  if(!/queueMicrotask\s*\([\s\S]{0,280}inquiry\.afterRender/.test(indexSource)){
    fail('inquiry.afterRender must be queued with queueMicrotask so early returns remain covered.');
  }
}catch(error){fail(`index.html Inquiry lifecycle inspection failed: ${error.message}`);}

try{
  const managerSource=read('image-manager.js');
  for(const eventName of ['inquiry.beforeRender','inquiry.afterRender']){
    if(!managerSource.includes(`'${eventName}'`)) fail(`image-manager.js is missing Inquiry lifecycle subscription: ${eventName}`);
  }
  for(const marker of ['renderInquiry=function','originalRenderInquiry','installHooks()']){
    if(managerSource.includes(marker)) fail(`image-manager.js still monkey-patches Inquiry rendering: ${marker}`);
  }
  if(!/inquiry\.beforeRender[\s\S]{0,240}syncActiveInquiryCovers\s*\(\s*\)/.test(managerSource)){
    fail('Inquiry beforeRender subscription must preserve syncActiveInquiryCovers().');
  }
  if(!/inquiry\.afterRender[\s\S]{0,520}requestAnimationFrame[\s\S]{0,520}mountInquiry\s*\(/.test(managerSource)){
    fail('Inquiry afterRender subscription must preserve requestAnimationFrame → mountInquiry ordering.');
  }
  for(const helper of ['inquiryImageCandidates','syncActiveInquiryCovers','createInquiryImage','loadInquiryImage','mountInquiry']){
    if(!managerSource.includes(`function ${helper}`)) fail(`image-manager.js lost Inquiry media helper: ${helper}`);
  }
}catch(error){fail(`image-manager.js Inquiry cleanup inspection failed: ${error.message}`);}

try{
  const b301=read('scripts/validate-media-hook-cleanup.mjs');
  const b302=read('scripts/validate-shared-asset-hook-cleanup.mjs');
  for(const [name,source] of [['B3-01',b301],['B3-02',b302]]){
    if(source.includes('renderInquiry=function')) fail(`${name} historical validator still requires the removed renderInquiry monkey patch.`);
  }
  if(b302.includes('dreamland-pwa-v68')) fail('Historical B3-02 validator still owns a fixed SW cache version.');
}catch(error){fail(`Historical validator compatibility inspection failed: ${error.message}`);}

try{
  const swSource=read('sw.js');
  for(const appShellPath of ['./src/app/runtime-hooks.js','./src/services/media/runtime-media.js','./image-manager.js']){
    const escaped=appShellPath.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const matches=swSource.match(new RegExp(`'${escaped}'`,'g'))||[];
    if(matches.length!==1) fail(`sw.js APP_SHELL must include ${appShellPath} exactly once; found ${matches.length}.`);
  }
}catch(error){fail(`sw.js B3-03 inspection failed: ${error.message}`);}

if(errors.length){
  console.error('\nInquiry media hook cleanup validation failed:\n');
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Inquiry media hook cleanup validation: PASS');
