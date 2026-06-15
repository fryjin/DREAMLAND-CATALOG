import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const errors=[];

const requiredIndex=[
  'id="pwaNetworkBanner"',
  'id="pwaActionBanner"',
  'beforeinstallprompt',
  'appinstalled',
  "window.addEventListener('offline'",
  'registerPwaServiceWorker',
  "updateViaCache:'none'",
  "navigator.onLine===false"
];
for(const marker of requiredIndex)if(!index.includes(marker))errors.push('Missing index marker: '+marker);

const requiredSw=[
  "dreamland-pwa-v5",
  "event.data?.type === 'SKIP_WAITING'",
  'productImageNetworkFirst',
  "cache: 'no-store'",
  "'./data/app-config.json'"
];
for(const marker of requiredSw)if(!sw.includes(marker))errors.push('Missing service worker marker: '+marker);
if(sw.includes('.then(() => self.skipWaiting())'))errors.push('Service worker still forces skipWaiting during install');

if(manifest.prefer_related_applications!==false)errors.push('prefer_related_applications must be false');
if(config.pwa?.offlineStrategy!=='on-demand')errors.push('PWA offline strategy must be on-demand');
if(config.pwa?.productImageStrategy!=='network-first')errors.push('Product image strategy must be network-first');
if(!fs.existsSync('PWA-TEST-CHECKLIST.md'))errors.push('Missing PWA test checklist');

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('PWA phase 4 validation passed.');
