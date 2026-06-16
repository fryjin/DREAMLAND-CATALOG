import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const fn=fs.readFileSync('functions/api/submit.js','utf8');
const errors=[];

[
  'function assessSubmissionRisk(){',
  'function preloadHCaptchaScript(){',
  "if(n==='contact'){markRiskFormStart();preloadHCaptchaScript()}",
  "submissionRiskRequiresCaptcha",
  "action:'assess'",
  "action:'submit'",
  "risk-honeypot"
].forEach(marker=>{if(!index.includes(marker))errors.push('Missing index marker: '+marker)});

if(index.includes('https://js.hcaptcha.com/1/api.js?render=explicit\" async defer'))errors.push('Static hCaptcha script still exists');
if(Number(config.pwa?.installPromptDelayMs)!==5000)errors.push('Install prompt delay is not 5000ms');
if(config.hcaptcha?.mode!=='adaptive-risk')errors.push('hCaptcha mode is not adaptive-risk');
if(config.riskControl?.enabled!==true)errors.push('Risk control is not enabled');
if(config.submissionEndpoint!=='./api/submit')errors.push('Submission endpoint is incorrect');
if('web3formsAccessKey' in config)errors.push('Public Web3Forms access key still exists');
[
  'export async function onRequestPost',
  'api.hcaptcha.com/siteverify',
  'WEB3FORMS_ACCESS_KEY',
  'HCAPTCHA_SECRET',
  'HCAPTCHA_SITE_KEY',
  'RISK_STORE',
  'captcha_required'
].forEach(marker=>{if(!fn.includes(marker))errors.push('Missing function marker: '+marker)});
if(!/const CACHE_VERSION = 'dreamland-pwa-v\d+';/.test(sw))errors.push('Service worker version is missing');

if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Adaptive risk control validation passed.');
