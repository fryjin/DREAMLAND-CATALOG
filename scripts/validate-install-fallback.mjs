import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const errors=[];

[
  "manualInstallTitle:'浏览器菜单安装'",
  "manualInstallAction:'查看安装方法'",
  'function schedulePwaInstallFallback()',
  "showPwaAction('manual')",
  "pwaActionType==='manual'",
  'clearPwaInstallFallback();'
].forEach(marker=>{if(!index.includes(marker))errors.push('Missing index marker: '+marker)});

if(!sw.includes("dreamland-pwa-v7"))errors.push('Service worker was not upgraded to v7');
if(config.pwa?.installFallbackMode!=='browser-menu-guide')errors.push('Fallback mode is not configured');
if(Number(config.pwa?.installFallbackDelayMs)!==15000)errors.push('Fallback delay must be 15000ms');

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Install fallback validation passed.');
