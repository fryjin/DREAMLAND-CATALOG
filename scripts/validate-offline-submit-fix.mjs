import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const errors=[];

[
  'function probeWeb3FormsReachability(',
  "mode:'no-cors'",
  "cache:'no-store'",
  "data.success!==true",
  "e?.code==='OFFLINE'",
  'applyPwaReachability(false,false)'
].forEach(marker=>{if(!index.includes(marker))errors.push('Missing index marker: '+marker)});

if(!sw.includes("dreamland-pwa-v6"))errors.push('Service worker was not upgraded to v6');
if(config.pwa?.connectivityProbeTarget!=='web3forms')errors.push('Connectivity probe target is not Web3Forms');
if(Number(config.pwa?.connectivityProbeTimeoutMs)<1500)errors.push('Connectivity probe timeout is invalid');

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Offline submission protection validation passed.');
