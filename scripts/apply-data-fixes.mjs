import {readFile,writeFile} from 'node:fs/promises';

const CSV_PATH='data/products.csv';
const JSON_PATH='data/products.json';
const UPDATED_AT='2026-07-30';
const NAME_OVERRIDES=new Map([
  ['HOL001','C01'],
  ['HOL002','C02']
]);

function parseCsv(source){
  const rows=[];
  let row=[];
  let cell='';
  let quoted=false;

  for(let index=0;index<source.length;index++){
    const char=source[index];
    const next=source[index+1];

    if(char==='"'){
      if(quoted&&next==='"'){
        cell+='"';
        index++;
      }else{
        quoted=!quoted;
      }
      continue;
    }

    if(char===','&&!quoted){
      row.push(cell);
      cell='';
      continue;
    }

    if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&next==='\n')index++;
      row.push(cell);
      rows.push(row);
      row=[];
      cell='';
      continue;
    }

    cell+=char;
  }

  if(cell||row.length){
    row.push(cell);
    rows.push(row);
  }

  return rows.filter(values=>values.some(value=>value!==''));
}

function csvCell(value){
  const text=String(value??'');
  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g,'""')}"`
    : text;
}

async function updateCsv(){
  const raw=await readFile(CSV_PATH,'utf8');
  const hasBom=raw.charCodeAt(0)===0xFEFF;
  const rows=parseCsv(raw.replace(/^\uFEFF/,''));
  const headers=rows[0];
  const idIndex=headers.indexOf('product_id');
  const nameZh=headers.indexOf('name_zh');
  const nameEn=headers.indexOf('name_en');
  const nameKo=headers.indexOf('name_ko');
  const updatedAt=headers.indexOf('updated_at');

  let changed=false;

  rows.slice(1).forEach(row=>{
    const nextName=NAME_OVERRIDES.get(row[idIndex]);
    if(!nextName)return;

    [nameZh,nameEn,nameKo].forEach(index=>{
      if(index>=0&&row[index]!==nextName){
        row[index]=nextName;
        changed=true;
      }
    });

    if(updatedAt>=0&&row[updatedAt]!==UPDATED_AT){
      row[updatedAt]=UPDATED_AT;
      changed=true;
    }
  });

  if(changed){
    const output=rows
      .map(row=>row.map(csvCell).join(','))
      .join('\n')+'\n';
    await writeFile(CSV_PATH,(hasBom?'\uFEFF':'')+output,'utf8');
  }

  return changed;
}

async function updateJson(){
  let raw;
  try{
    raw=await readFile(JSON_PATH,'utf8');
  }catch{
    return false;
  }

  const data=JSON.parse(raw);
  const products=Array.isArray(data)
    ? data
    : Array.isArray(data.products)
      ? data.products
      : [];
  let changed=false;

  products.forEach(product=>{
    const nextName=NAME_OVERRIDES.get(product.id||product.productId);
    if(!nextName)return;

    if(product.name!==nextName){
      product.name=nextName;
      changed=true;
    }

    const nextNames={
      ...(product.names||{}),
      zh:nextName,
      en:nextName,
      ko:nextName
    };

    if(JSON.stringify(product.names||{})!==JSON.stringify(nextNames)){
      product.names=nextNames;
      changed=true;
    }

    if(product.updatedAt!==UPDATED_AT){
      product.updatedAt=UPDATED_AT;
      changed=true;
    }
  });

  if(changed){
    await writeFile(
      JSON_PATH,
      JSON.stringify(data,null,2)+'\n',
      'utf8'
    );
  }

  return changed;
}

const csvChanged=await updateCsv();
const jsonChanged=await updateJson();
console.log(`Holiday names updated: CSV=${csvChanged}, JSON=${jsonChanged}`);
