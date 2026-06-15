import fs from 'node:fs';

const seriesData=JSON.parse(fs.readFileSync('data/series.json','utf8'));
const productData=JSON.parse(fs.readFileSync('data/products.json','utf8'));
const i18nData=JSON.parse(fs.readFileSync('data/i18n.json','utf8'));

const errors=[];
const ids=new Set();
const seriesKeys=new Set(seriesData.seriesOrder||Object.keys(seriesData.series||{}));

for(const product of productData.products||[]){
  if(!product.id)errors.push('Product without id');
  if(ids.has(product.id))errors.push(`Duplicate product id: ${product.id}`);
  ids.add(product.id);
  if(!seriesKeys.has(product.series))errors.push(`Unknown series for ${product.id}: ${product.series}`);
  for(const lang of i18nData.languages||[]){
    if(!product.names?.[lang])errors.push(`Missing ${lang} name: ${product.id}`);
    if(!product.descriptions?.[lang])errors.push(`Missing ${lang} description: ${product.id}`);
  }
  if(!product.cover)errors.push(`Missing cover path: ${product.id}`);
  if(!Array.isArray(product.images)||product.images.length===0)errors.push(`Missing detail images: ${product.id}`);
}

for(const key of seriesKeys){
  const expected=Number(seriesData.series?.[key]?.count||0);
  const actual=(productData.products||[]).filter(product=>product.series===key).length;
  if(expected!==actual)errors.push(`Series count mismatch for ${key}: expected ${expected}, got ${actual}`);
}

if(errors.length){
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Catalog data valid: ${ids.size} products across ${seriesKeys.size} series.`);
