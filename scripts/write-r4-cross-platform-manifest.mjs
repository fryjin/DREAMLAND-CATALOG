#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();

function arg(name,fallback=''){
  const index=process.argv.indexOf(name);

  if(index<0){
    return fallback;
  }

  return process.argv[index+1]??fallback;
}

const rootRelative=
  arg(
    '--root',
    'dist'
  );

const outputRelative=
  arg(
    '--output',
    '.cross-platform/manifest.json'
  );

const platform=
  arg(
    '--platform',
    process.platform
  );

const artifactRoot=
  path.resolve(
    ROOT,
    rootRelative
  );

const outputFile=
  path.resolve(
    ROOT,
    outputRelative
  );

if(!fs.existsSync(artifactRoot)){
  console.error(
    'Cross-platform manifest root is missing: '+
    rootRelative
  );
  process.exit(1);
}

const TEXT_EXTENSIONS=new Set([
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.svg',
  '.txt',
  '.webmanifest',
  '.xml'
]);

function normalizeLogicalText(value){
  return String(
    value??''
  ).replace(
    /\r\n?/g,
    '\n'
  );
}

function sha256(buffer){
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

function walk(directory){
  const output=[];

  for(
    const entry of fs.readdirSync(
      directory,
      {
        withFileTypes:true
      }
    )
  ){
    const absolute=
      path.join(
        directory,
        entry.name
      );

    if(entry.isDirectory()){
      output.push(
        ...walk(absolute)
      );
      continue;
    }

    if(entry.isFile()){
      output.push(absolute);
    }
  }

  return output;
}

const files=
  walk(artifactRoot)
    .sort(
      (a,b)=>
        a.localeCompare(b,'en')
    );

if(!files.length){
  console.error(
    'Cross-platform artifact manifest cannot be empty.'
  );
  process.exit(1);
}

const entries=
  files.map(
    absolute=>{
      const buffer=
        fs.readFileSync(
          absolute
        );

      const relative=
        path
          .relative(
            artifactRoot,
            absolute
          )
          .split(path.sep)
          .join('/');

      const extension=
        path
          .extname(relative)
          .toLowerCase();

      const text=
        TEXT_EXTENSIONS.has(
          extension
        );

      const entry={
        path:relative,
        physicalBytes:
          buffer.length,
        physicalSha256:
          sha256(buffer),
        logicalBytes:null,
        logicalSha256:null
      };

      if(text){
        const logical=
          normalizeLogicalText(
            buffer.toString('utf8')
          );

        const logicalBuffer=
          Buffer.from(
            logical,
            'utf8'
          );

        entry.logicalBytes=
          logicalBuffer.length;

        entry.logicalSha256=
          sha256(
            logicalBuffer
          );
      }

      return entry;
    }
  );

for(const required of [
  'index.html',
  'sw.js',
  'r4-home-runtime.js',
  'r4-catalog-runtime.js',
  'r4-pdp-runtime.js'
]){
  if(
    !entries.some(
      entry=>
        entry.path===required
    )
  ){
    console.error(
      'Cross-platform manifest is missing required Production artifact: '+
      required
    );
    process.exit(1);
  }
}

const manifest={
  schemaVersion:1,
  platform,
  node:process.version,
  artifactRoot:rootRelative,
  fileCount:entries.length,
  entries
};

fs.mkdirSync(
  path.dirname(
    outputFile
  ),
  {
    recursive:true
  }
);

fs.writeFileSync(
  outputFile,
  JSON.stringify(
    manifest,
    null,
    2
  )+
  '\n',
  'utf8'
);

console.log(
  'DREAMLAND R4 CROSS-PLATFORM ARTIFACT MANIFEST: PASS'
);

console.log(
  '- Platform: '+
  platform
);

console.log(
  '- Files: '+
  entries.length
);

console.log(
  '- Output: '+
  path.relative(
    ROOT,
    outputFile
  )
);
