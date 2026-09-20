#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  const file=path.join(ROOT,relative);

  if(!fs.existsSync(file)){
    fail('Missing required file: '+relative);
    return '';
  }

  return fs.readFileSync(file,'utf8')
    .replace(/\r\n?/g,'\n');
}

function parseCsv(source){
  source=String(source??'').replace(/^\uFEFF/,'');

  const rows=[];
  let row=[];
  let field='';
  let quoted=false;

  for(let index=0;index<source.length;index++){
    const char=source[index];

    if(quoted){
      if(char==='"'){
        if(source[index+1]==='"'){
          field+='"';
          index++;
        }else{
          quoted=false;
        }
      }else{
        field+=char;
      }
      continue;
    }

    if(char==='"'){
      quoted=true;
      continue;
    }

    if(char===','){
      row.push(field);
      field='';
      continue;
    }

    if(char==='\n'){
      row.push(field.replace(/\r$/,''));
      rows.push(row);
      row=[];
      field='';
      continue;
    }

    field+=char;
  }

  if(field||row.length){
    row.push(field.replace(/\r$/,''));
    rows.push(row);
  }

  const header=(rows.shift()||[])
    .map(value=>value.trim());

  return rows
    .filter(values=>values.some(value=>String(value).trim()))
    .map(values=>
      Object.fromEntries(
        header.map(
          (key,index)=>[
            key,
            values[index]??''
          ]
        )
      )
    );
}

function webpDimensions(file){
  const buffer=fs.readFileSync(file);

  if(
    buffer.length<30||
    buffer.toString('ascii',0,4)!=='RIFF'||
    buffer.toString('ascii',8,12)!=='WEBP'
  ){
    return null;
  }

  let offset=12;

  while(offset+8<=buffer.length){
    const type=buffer.toString(
      'ascii',
      offset,
      offset+4
    );

    const size=buffer.readUInt32LE(offset+4);
    const data=offset+8;

    if(type==='VP8 '){
      if(
        buffer[data+3]===0x9d&&
        buffer[data+4]===0x01&&
        buffer[data+5]===0x2a
      ){
        return {
          width:
            buffer.readUInt16LE(data+6)&0x3fff,
          height:
            buffer.readUInt16LE(data+8)&0x3fff
        };
      }
    }

    if(type==='VP8L'){
      if(buffer[data]===0x2f){
        const b1=buffer[data+1];
        const b2=buffer[data+2];
        const b3=buffer[data+3];
        const b4=buffer[data+4];

        return {
          width:
            1+
            (((b2&0x3f)<<8)|b1),
          height:
            1+
            (((b4&0x0f)<<10)|
              (b3<<2)|
              ((b2&0xc0)>>6))
        };
      }
    }

    if(type==='VP8X'){
      return {
        width:
          1+
          buffer[data+4]+
          (buffer[data+5]<<8)+
          (buffer[data+6]<<16),
        height:
          1+
          buffer[data+7]+
          (buffer[data+8]<<8)+
          (buffer[data+9]<<16)
      };
    }

    offset=
      data+
      size+
      (size%2);
  }

  return null;
}

const css=read(
  'src/astro/styles/pdp.css'
);

const blockMatch=
  css.match(
    /\.pdp-visual-option\s+img\s*\{([\s\S]*?)\}/
  );

if(!blockMatch){
  fail(
    'PDP visual option image CSS block is missing.'
  );
}else{
  const block=blockMatch[1];

  if(
    !/aspect-ratio\s*:\s*1\s*\/\s*1\s*;/.test(block)
  ){
    fail(
      'PDP visual option image container must use a 1:1 aspect ratio.'
    );
  }

  if(
    !/object-fit\s*:\s*cover\s*;/.test(block)
  ){
    fail(
      'PDP visual option images must preserve intrinsic ratio via object-fit: cover.'
    );
  }

  if(
    /aspect-ratio\s*:\s*4\s*\/\s*3\s*;/.test(block)
  ){
    fail(
      'Legacy 4:3 visual-option crop must not remain.'
    );
  }
}

const rows=parseCsv(
  read(
    'data/shared-assets.csv'
  )
)
  .filter(row=>
    String(row?.status||'')
      .trim()
      .toLowerCase()==='active'&&
    ['pattern','package']
      .includes(
        String(row?.category||'').trim()
      )
  );

if(rows.length!==14){
  fail(
    'Expected 14 active Pattern/Packaging visual assets; found '+
    rows.length+
    '.'
  );
}

for(const row of rows){
  const source=
    String(row?.image_path||'').trim();

  const preview=
    source
      .replace(
        '/images/shared/',
        '/images/generated/shared/'
      )
      .replace(
        /\/cover\.(?:webp|png|jpe?g)$/i,
        '/cover-960.webp'
      );

  const file=path.join(
    ROOT,
    preview.replace(/^\/+/,'')
  );

  if(!fs.existsSync(file)){
    fail(
      `${row.asset_id} preview asset is missing: ${preview}`
    );
    continue;
  }

  const dimensions=
    webpDimensions(file);

  if(!dimensions){
    fail(
      `${row.asset_id} preview dimensions could not be read: ${preview}`
    );
    continue;
  }

  if(
    dimensions.width!==
    dimensions.height
  ){
    fail(
      `${row.asset_id} preview must remain square; found ${dimensions.width}x${dimensions.height}.`
    );
  }
}

const pkg=
  JSON.parse(
    read('package.json')
  );

if(
  pkg.scripts
    ?.['r4:pdp:visual-options-ratio']!==
  'node scripts/validate-pdp-options-1b-fix3-visual-asset-ratio.mjs'
){
  fail(
    'package.json is missing r4:pdp:visual-options-ratio.'
  );
}

const validate=
  String(
    pkg.scripts?.validate||
    ''
  );

const wiring=
  validate.indexOf(
    'npm run r4:pdp:visual-options-ui-wiring'
  );

const ratio=
  validate.indexOf(
    'npm run r4:pdp:visual-options-ratio'
  );

const frontend=
  validate.indexOf(
    'npm run frontend:foundation'
  );

if(
  wiring<0||
  ratio<=wiring||
  frontend<=ratio
){
  fail(
    'PDP-OPTIONS-1B-FIX3 gate must run after visual-option UI wiring and before frontend foundation.'
  );
}

if(errors.length){
  console.error('');
  console.error(
    'PDP-OPTIONS-1B-FIX3 VISUAL ASSET RATIO ALIGNMENT: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'PDP-OPTIONS-1B-FIX3 VISUAL ASSET RATIO ALIGNMENT: PASS'
);
console.log(
  '14 Pattern/Packaging previews are square and the UI image container is aligned to 1:1 without geometric stretching.'
);
console.log('');
