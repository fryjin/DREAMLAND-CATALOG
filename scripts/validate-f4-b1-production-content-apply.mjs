#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const errors=[];
const fail=message=>errors.push(message);
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/\r\n?/g,'\n');

function parseCsvLine(line){
  const fields=[]; let value=''; let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(quoted){
      if(ch==='"'&&line[i+1]==='"'){value+='"';i++;}
      else if(ch==='"'){quoted=false;}
      else value+=ch;
    }else{
      if(ch==='"') quoted=true;
      else if(ch===','){fields.push(value);value='';}
      else value+=ch;
    }
  }
  fields.push(value);
  return fields;
}
function rows(rel){
  const source=read(rel);
  const clean=source.charCodeAt(0)===0xFEFF ? source.slice(1) : source;
  const lines=clean.split('\n').filter(Boolean);
  const headers=parseCsvLine(lines.shift());
  return lines.map(line=>{
    const values=parseCsvLine(line);
    return Object.fromEntries(headers.map((header,index)=>[header,values[index]??'']));
  });
}

const holidayNames={
  "HOL001": {
    "name_zh": "冬莓初雪",
    "name_en": "Winterberry First Snow",
    "name_ko": "윈터베리의 첫눈"
  },
  "HOL002": {
    "name_zh": "绯雪序曲",
    "name_en": "Crimson Snow Prelude",
    "name_ko": "진홍빛 눈의 서곡"
  },
  "HOL003": {
    "name_zh": "十二月来信",
    "name_en": "A Letter from December",
    "name_ko": "12월에서 온 편지"
  },
  "HOL004": {
    "name_zh": "雪落平安镇",
    "name_en": "Snowfall over Noel Town",
    "name_ko": "노엘 마을에 내리는 눈"
  },
  "HOL005": {
    "name_zh": "糖霜落雪",
    "name_en": "Sugared Snowfall",
    "name_ko": "설탕눈이 내리던 날"
  },
  "HOL006": {
    "name_zh": "姜饼暖梦",
    "name_en": "Gingerbread Reverie",
    "name_ko": "진저브레드의 포근한 꿈"
  },
  "HOL007": {
    "name_zh": "白雪颂歌",
    "name_en": "A Carol in White",
    "name_ko": "하얀 눈의 캐럴"
  },
  "HOL008": {
    "name_zh": "白夜花冠",
    "name_en": "White Night Garland",
    "name_ko": "하얀 밤의 화관"
  },
  "HOL009": {
    "name_zh": "雪落松林",
    "name_en": "Snowfall in the Pines",
    "name_ko": "소나무 숲에 내리는 눈"
  },
  "HOL010": {
    "name_zh": "铃声穿过冬青",
    "name_en": "Bells Through the Holly",
    "name_ko": "호랑가시나무 사이로 울리는 종소리"
  },
  "HOL011": {
    "name_zh": "鹿鸣暖冬",
    "name_en": "Reindeer Lullaby",
    "name_ko": "순록의 겨울 자장가"
  },
  "HOL012": {
    "name_zh": "红鼻星愿",
    "name_en": "Red-Nosed Starwish",
    "name_ko": "빨간 코의 별빛 소원"
  },
  "HOL013": {
    "name_zh": "冬青圆舞曲",
    "name_en": "Holly Waltz",
    "name_ko": "홀리 왈츠"
  },
  "HOL014": {
    "name_zh": "绯红礼赞",
    "name_en": "Ode to Crimson",
    "name_ko": "진홍빛 찬가"
  },
  "HOL015": {
    "name_zh": "松树下的灯火",
    "name_en": "Lights Beneath the Fir",
    "name_ko": "전나무 아래의 불빛"
  },
  "HOL016": {
    "name_zh": "雪夜红宝石",
    "name_en": "Ruby on a Snowy Night",
    "name_ko": "눈 내리는 밤의 루비"
  }
};
const scentNames={
  "MPS001": "꿈결",
  "MPS002": "하얀 주머니",
  "MPS003": "비움",
  "MPS004": "태고의 시간",
  "MPS005": "은하의 기사",
  "MPS006": "채링크로스의 밤",
  "MPS007": "목마름",
  "MPS008": "시트 사이",
  "MPS009": "어둠 속의 빛",
  "MPS010": "낯선 이에게 반하다",
  "ADS001": "오리엔탈 플로럴",
  "ADS002": "아쿠아틱 머스크",
  "ADS003": "스파이시 우디",
  "CLS001": "시칠리안 아몬드",
  "CLS002": "오우드 & 베르가못",
  "CLS003": "웨스틴 화이트 티"
};
const supplierKo={
  "classic": "상하이 Excitin 향료",
  "advanced": "프랑스 Robertet Group 수입 향료",
  "masterpiece": "미국 CandleScience 수입 프래그런스 오일"
};

const products=rows('data/products.csv');
for(const [id,expected] of Object.entries(holidayNames)){
  const row=products.find(item=>item.product_id===id);
  if(!row){
    fail(id+' Holiday product missing.');
    continue;
  }
  for(const field of ['name_zh','name_en','name_ko']){
    if(row[field]!==expected[field]) fail(id+'.'+field+' does not match approved F4-B1 name.');
  }
}

const fallback=JSON.parse(read('data/products.json'));
for(const [id,expected] of Object.entries(holidayNames)){
  const product=(fallback.products||[]).find(item=>item.id===id);
  if(!product){
    fail(id+' generated fallback product missing.');
    continue;
  }
  for(const locale of ['zh','en','ko']){
    if(product.names?.[locale]!==expected['name_'+locale]){
      fail(id+'.products.json names.'+locale+' does not match approved F4-B1 name.');
    }
  }
}

const content=JSON.parse(read('data/pdp-content.json'));
if(
  content.revision!=='PDP-COPY-1A.4'||
  content.approval?.state!=='approved'||
  Number(content.approval?.storyCount)!==89||
  Number(content.approval?.placeholderCount)!==0
){
  fail('PDP content summary must be PDP-COPY-1A.4 / approved / 89 stories / 0 placeholders.');
}
for(const id of Object.keys(holidayNames)){
  const entry=content.colorStories?.[id];
  if(
    entry?.kind!=='story'||
    entry?.status!=='approved'||
    ['zh','en','ko'].some(locale=>!String(entry?.copy?.[locale]||'').trim())
  ){
    fail(id+' must have finalized approved zh/en/ko Color Story copy.');
  }
}
for(const [seriesId,expectedSupplier] of Object.entries(supplierKo)){
  if(content.scentStandards?.[seriesId]?.supplier?.ko!==expectedSupplier){
    fail(seriesId+' KO scent supplier standard does not match approved F4-B1 value.');
  }
}

const scents=rows('data/scents.csv');
for(const [id,expectedName] of Object.entries(scentNames)){
  const row=scents.find(item=>item.scent_id===id);
  if(!row){
    fail(id+' scent row missing.');
    continue;
  }
  if(row.name_ko!==expectedName) fail(id+'.name_ko does not match approved KO scent name.');
  for(const field of ['top_ko','heart_ko','base_ko','supplier_ko']){
    if(!String(row[field]||'').trim()) fail(id+'.'+field+' must be localized in KO.');
  }
}

const pkg=JSON.parse(read('package.json'));
if(pkg.scripts?.['f4:production-content']!=='node scripts/validate-f4-b1-production-content-apply.mjs'){
  fail('package.json is missing f4:production-content.');
}
const chain=String(pkg.scripts?.validate||'');
const approvedStep='npm run r4:pdp:copy-approved-content';
const f4Step='npm run f4:production-content';
const uiStep='npm run r4:pdp:copy-ui-wiring';

const approvedIndex=chain.indexOf(approvedStep);
const f4Index=chain.indexOf(f4Step);
const uiIndex=chain.indexOf(uiStep);

if(
  approvedIndex<0||
  f4Index<0||
  uiIndex<0||
  !(approvedIndex<f4Index&&f4Index<uiIndex)
){
  fail('Main validation chain must run F4-B1 after approved PDP content and before PDP copy UI wiring.');
}

if(errors.length){
  console.error('');
  console.error('F4-B1 PRODUCTION CONTENT APPLY: FAIL');
  for(const error of errors) console.error('- '+error);
  console.error('');
  process.exit(1);
}
console.log('');
console.log('F4-B1 PRODUCTION CONTENT APPLY: PASS');
console.log('Holiday names 16/16; Holiday Color Stories 16/16 finalized; all Color Stories 89/89; KO scents 16/16 localized.');
console.log('Holiday / Classic additional gallery media and Packaging / Scene media remain deferred by approved F4 scope.');
console.log('');
