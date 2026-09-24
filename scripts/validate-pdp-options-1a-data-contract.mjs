#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  buildPdpVisualOptions,
  PDP_VISUAL_OPTIONS_VERSION
} from '../src/data/pdp-visual-options-contract.mjs';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
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

  return fs.readFileSync(file,'utf8');
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function parseCsv(source){
  source=String(source??'')
    .replace(/^\uFEFF/,'');

  const rows=[];
  let row=[];
  let field='';
  let quoted=false;

  for(let i=0;i<source.length;i++){
    const ch=source[i];

    if(quoted){
      if(ch==='"'){
        if(source[i+1]==='"'){
          field+='"';
          i++;
        }else{
          quoted=false;
        }
      }else{
        field+=ch;
      }
      continue;
    }

    if(ch==='"'){
      quoted=true;
      continue;
    }

    if(ch===','){
      row.push(field);
      field='';
      continue;
    }

    if(ch==='\n'){
      row.push(
        field.replace(/\r$/,'')
      );
      rows.push(row);
      row=[];
      field='';
      continue;
    }

    field+=ch;
  }

  if(field||row.length){
    row.push(
      field.replace(/\r$/,'')
    );
    rows.push(row);
  }

  const header=
    (rows.shift()||[])
      .map(value=>value.trim());

  return rows
    .filter(
      values=>
        values.some(
          value=>
            String(value).trim()
        )
    )
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

function sourcePath(webPath){
  return path.join(
    ROOT,
    String(webPath)
      .replace(/^\/+/,'')
  );
}

const series=
  json(
    'data/series.json'
  );

const assets=
  parseCsv(
    read(
      'data/shared-assets.csv'
    )
  );

let contract=null;

try{
  contract=
    buildPdpVisualOptions({
      sharedAssets:assets,
      seriesDocument:series
    });
}catch(error){
  fail(
    'PDP visual option contract build failed: '+
    error.message
  );
}

if(contract){
  if(
    contract.version!==
    PDP_VISUAL_OPTIONS_VERSION||
    contract.version!==1
  ){
    fail(
      'PDP visual option contract version must remain 1.'
    );
  }

  const expectedPatterns={
    S:[
      ['PATS01','小花卷','Small Floral Curl','스몰 플라워 컬'],
      ['PATS02','细波纹','Fine Wave','파인 웨이브'],
      ['PATS03','简约切线','Minimal Cut Lines','미니멀 컷 라인']
    ],
    M:[
      ['PATM01','经典花瓣','Classic Petal','클래식 페탈'],
      ['PATM02','海浪卷','Ocean Wave Curl','오션 웨이브 컬'],
      ['PATM03','礼盒花型','Gift Box Floral','기프트 플라워']
    ],
    L:[
      ['PATL01','大花瓣','Large Petal','라지 페탈'],
      ['PATL02','层叠波纹','Layered Wave','레이어드 웨이브'],
      ['PATL03','展陈花型','Display Floral','디스플레이 플라워']
    ],
    XL:[
      ['PATX01','大礼花','Grand Floral','그랜드 플라워'],
      ['PATX02','雕塑卷','Sculptural Curl','스컬프처 컬'],
      ['PATX03','陈列款','Display Style','디스플레이 스타일']
    ]
  };

  for(const [size,expected] of Object.entries(expectedPatterns)){
    const actual=
      contract
        .patternsBySize
        ?.[size]||
      [];

    if(actual.length!==3){
      fail(
        `PDP visual Pattern ${size} must expose exactly 3 options; found ${actual.length}.`
      );
      continue;
    }

    expected.forEach(
      (
        [
          id,
          zh,
          en,
          ko
        ],
        index
      )=>{
        const option=actual[index];

        if(
          option?.id!==id||
          option?.value!==zh||
          option?.size!==size||
          option?.labels?.zh!==zh||
          option?.labels?.en!==en||
          option?.labels?.ko!==ko
        ){
          fail(
            `PDP visual Pattern ${size}/${index+1} mapping changed.`
          );
        }
      }
    );
  }

  const packageAssets=
    contract
      .assets
      ?.packages||
    [];

  const expectedPackages=[
    [
      'PKG001',
      '默认包装',
      'Standard Packaging',
      '기본 포장'
    ],
    [
      'PKG002',
      '礼品包装',
      'Gift Packaging',
      '선물 포장'
    ]
  ];

  if(packageAssets.length!==2){
    fail(
      'PDP visual Packaging must expose exactly 2 active shared assets.'
    );
  }

  expectedPackages.forEach(
    (
      [
        id,
        zh,
        en,
        ko
      ],
      index
    )=>{
      const option=packageAssets[index];

      if(
        option?.id!==id||
        option?.value!==zh||
        option?.labels?.zh!==zh||
        option?.labels?.en!==en||
        option?.labels?.ko!==ko
      ){
        fail(
          `PDP visual Packaging ${index+1} mapping changed.`
        );
      }
    }
  );

  const expectedSeriesPackages={
    advanced:[
      'PKG001',
      'PKG002'
    ],
    masterpiece:[
      'PKG002'
    ],
    holiday:[
      'PKG001',
      'PKG002'
    ],
    classic:[
      'PKG001',
      'PKG002'
    ]
  };

  for(const [seriesId,expected] of Object.entries(expectedSeriesPackages)){
    const actual=
      (
        contract
          .packagesBySeries
          ?.[seriesId]||
        []
      )
        .map(
          option=>option.id
        );

    if(
      JSON.stringify(actual)!==
      JSON.stringify(expected)
    ){
      fail(
        'PDP visual Packaging series mapping changed: '+
        seriesId+
        ' / '+
        JSON.stringify(actual)
      );
    }
  }

  const all=[
    ...(
      contract
        .assets
        ?.patterns||
      []
    ),
    ...packageAssets
  ];

  if(all.length!==14){
    fail(
      'PDP visual options must resolve 14 active shared assets; found '+
      all.length+
      '.'
    );
  }

  for(const option of all){
    /*
     * Canonical + responsive preview assets are runtime dependencies.
     * Legacy fallback paths are optional metadata: the current repository
     * intentionally does not contain the old /images/patterns/* and
     * /images/packages/* trees referenced by historical fallback_path values.
     */
    for(const field of [
      'image',
      'preview'
    ]){
      const pathname=
        option?.[field];

      if(!pathname){
        fail(
          `${option?.id||'unknown'} is missing ${field}.`
        );
        continue;
      }

      if(
        !fs.existsSync(
          sourcePath(pathname)
        )
      ){
        fail(
          `${option.id} ${field} asset is missing: ${pathname}`
        );
      }
    }

    const fallback=
      String(
        option?.fallback||
        ''
      ).trim();

    if(
      fallback&&
      !fallback.startsWith('/images/')
    ){
      fail(
        `${option.id} fallback metadata must remain an /images/ web path: ${fallback}`
      );
    }
  }
}

const pkg=
  json(
    'package.json'
  );

if(
  pkg.scripts
    ?.['r4:pdp:visual-options-contract']!==
  'node scripts/validate-pdp-options-1a-data-contract.mjs'
){
  fail(
    'package.json is missing r4:pdp:visual-options-contract.'
  );
}

const validate=
  String(
    pkg.scripts?.validate||
    ''
  );

const dataContract=
  validate.indexOf(
    'npm run data:contract'
  );

const visualOptions=
  validate.indexOf(
    'npm run r4:pdp:visual-options-contract'
  );

const copyContract=
  validate.indexOf(
    'npm run r4:pdp:copy-content-contract'
  );

if(
  dataContract<0||
  visualOptions<=dataContract||
  copyContract<=visualOptions
){
  fail(
    'PDP visual option contract gate must run after data:contract and before PDP copy contract.'
  );
}

if(errors.length){
  console.error('');
  console.error(
    'PDP-OPTIONS-1A VISUAL OPTION DATA CONTRACT: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'PDP-OPTIONS-1A VISUAL OPTION DATA CONTRACT: PASS'
);
console.log(
  '12 Pattern assets / 2 Packaging assets / S-M-L-XL mapping / EN-ZH-KO labels / canonical+responsive media verified; legacy fallback metadata is optional.'
);
console.log('');
