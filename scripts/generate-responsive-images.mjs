import {readdir,readFile,stat,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOTS=[
  'images/products',
  'images/shared',
  'images/patterns',
  'images/packages'
];
const OUTPUT_ROOT='images/generated';
const REPORT_PATH='data/image-optimization-report.json';
const SUPPORTED=new Set(['.jpg','.jpeg','.png','.webp']);

sharp.concurrency(2);
sharp.cache({files:0,items:100,memory:128});

async function walk(directory){
  let entries=[];
  try{
    entries=await readdir(directory,{withFileTypes:true});
  }catch{
    return [];
  }

  const files=[];
  for(const entry of entries){
    const full=path.join(directory,entry.name);
    if(entry.isDirectory()){
      if(entry.name==='generated')continue;
      files.push(...await walk(full));
    }else if(SUPPORTED.has(path.extname(entry.name).toLowerCase())){
      files.push(full);
    }
  }
  return files;
}

function targetWidths(file){
  const base=path.basename(file,path.extname(file)).toLowerCase();
  if(file.startsWith(`images${path.sep}products${path.sep}`)){
    return base==='cover'?[480,960]:[960];
  }
  return [960];
}

function outputPath(file,width){
  const relative=path.relative('images',file);
  const parsed=path.parse(relative);
  return path.join(
    OUTPUT_ROOT,
    parsed.dir,
    `${parsed.name}-${width}.webp`
  );
}

function qualityFor(width){
  return width<=480?72:78;
}

async function optimizeOne(file,width){
  const target=outputPath(file,width);
  await mkdir(path.dirname(target),{recursive:true});

  const before=(await stat(file)).size;
  const input=await readFile(file);
  const sourceHash=crypto
    .createHash('sha256')
    .update(input)
    .digest('hex')
    .slice(0,12);

  const pipeline=sharp(input,{failOn:'none'})
    .rotate()
    .resize({
      width,
      withoutEnlargement:true,
      fit:'inside',
      kernel:sharp.kernel.lanczos3
    })
    .webp({
      quality:qualityFor(width),
      effort:5,
      smartSubsample:true
    });

  const info=await pipeline.toFile(target);
  const after=(await stat(target)).size;

  return {
    source:file.replaceAll(path.sep,'/'),
    output:target.replaceAll(path.sep,'/'),
    requestedWidth:width,
    width:info.width,
    height:info.height,
    sourceBytes:before,
    outputBytes:after,
    savedBytes:Math.max(0,before-after),
    savedPercent:before>0
      ? Number(((1-after/before)*100).toFixed(1))
      : 0,
    sourceHash
  };
}

const sourceFiles=(await Promise.all(ROOTS.map(walk)))
  .flat()
  .filter(file=>!file.replaceAll(path.sep,'/').includes('/shared/home/'))
  .sort();
const jobs=[];

for(const file of sourceFiles){
  for(const width of targetWidths(file)){
    jobs.push([file,width]);
  }
}

const results=[];
const concurrency=4;
let cursor=0;

async function worker(){
  while(cursor<jobs.length){
    const index=cursor++;
    const [file,width]=jobs[index];
    try{
      results.push(await optimizeOne(file,width));
      console.log(`[${index+1}/${jobs.length}] ${file} -> ${width}px`);
    }catch(error){
      console.error(`Failed: ${file} (${width}px)`,error);
      process.exitCode=1;
    }
  }
}

await Promise.all(
  Array.from({length:Math.min(concurrency,jobs.length||1)},worker)
);

results.sort((a,b)=>a.output.localeCompare(b.output));
const summary={
  generatedAt:new Date().toISOString(),
  sourceCount:sourceFiles.length,
  outputCount:results.length,
  uniqueSourceBytes:(await Promise.all(sourceFiles.map(file=>stat(file))))
    .reduce((sum,item)=>sum+item.size,0),
  generatedBytes:results.reduce((sum,item)=>sum+item.outputBytes,0)
};

await mkdir(path.dirname(REPORT_PATH),{recursive:true});
await writeFile(
  REPORT_PATH,
  JSON.stringify({summary,files:results},null,2)+'\n',
  'utf8'
);

console.log(JSON.stringify(summary,null,2));
