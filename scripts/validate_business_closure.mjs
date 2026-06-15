import fs from 'node:fs';
const required=['index.html','privacy.html','data/app-config.json','data/products.json','data/series.json','data/i18n.json','sw.js'];
const errors=[];
for(const path of required)if(!fs.existsSync(path))errors.push('Missing: '+path);
const config=JSON.parse(fs.readFileSync('data/app-config.json','utf8'));
const products=JSON.parse(fs.readFileSync('data/products.json','utf8')).products||[];
const series=JSON.parse(fs.readFileSync('data/series.json','utf8')).series||{};
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
if(!config.web3formsAccessKey)errors.push('Missing web3formsAccessKey field');
if(!products.length)errors.push('No products');
for(const product of products)if(!Number.isInteger(Number(product.moq))||Number(product.moq)<1)errors.push('Invalid MOQ: '+product.id);
for(const [key,value] of Object.entries(series))if(!Number.isInteger(Number(value.defaultMoq))||Number(value.defaultMoq)<1)errors.push('Invalid series MOQ: '+key);
for(const marker of ['generateInquiryId','privacyConsent','hcaptchaContainer','archiveSubmission','clearSubmittedInquiry','productMoq'])if(!html.includes(marker))errors.push('Missing marker in index.html: '+marker);
if(!sw.includes('dreamland-pwa-v4'))errors.push('Service worker cache version was not updated');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log('Business closure validation passed: '+products.length+' products checked.');
