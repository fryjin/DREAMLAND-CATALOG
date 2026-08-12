#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=process.cwd();
const SRC_ROOT=path.join(ROOT,'src');

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relativePath){
  return fs.readFileSync(
    path.join(ROOT,relativePath),
    'utf8'
  );
}

function exists(relativePath){
  return fs.existsSync(
    path.join(ROOT,relativePath)
  );
}

function walkJs(directory){
  if(!fs.existsSync(directory)){
    return [];
  }

  const output=[];

  for(const entry of fs.readdirSync(
    directory,
    {withFileTypes:true}
  )){
    const full=
      path.join(directory,entry.name);

    if(entry.isDirectory()){
      output.push(
        ...walkJs(full)
      );
    }else if(
      entry.isFile()&&
      entry.name.endsWith('.js')
    ){
      output.push(full);
    }
  }

  return output;
}

function layerForFile(file){
  const relative=
    path.relative(
      SRC_ROOT,
      file
    );

  return relative
    .split(path.sep)[0];
}

function resolveImport(
  fromFile,
  specifier
){
  if(!specifier.startsWith('.')){
    return null;
  }

  return path.resolve(
    path.dirname(fromFile),
    specifier
  );
}

const requiredFiles=[
  'src/README.md',
  'src/app/foundation.js',
  'src/app/layers.js',
  'src/app/legacy-map.js',
  'src/features/manifest.js',
  'src/ui/contracts.js',
  'src/services/contracts.js'
];

for(const file of requiredFiles){
  if(!exists(file)){
    fail(
      `Frontend foundation file is missing: ${file}`
    );
  }
}

let foundation=null;
let layersModule=null;

try{
  foundation=
    (
      await import(
        path.join(
          ROOT,
          'src/app/foundation.js'
        )
      )
    ).FRONTEND_FOUNDATION;

  layersModule=
    await import(
      path.join(
        ROOT,
        'src/app/layers.js'
      )
    );
}catch(error){
  fail(
    `Cannot import frontend foundation: ${error.message}`
  );
}

if(foundation){
  if(
    foundation.phase!=='B2-01'
  ){
    fail(
      `Unexpected frontend foundation phase: ${foundation.phase}`
    );
  }

  if(
    foundation.runtimeIntegrated!==false
  ){
    fail(
      'B2-01 must remain runtimeIntegrated=false.'
    );
  }

  const uniqueIds=(items,label)=>{
    const ids=items.map(item=>item.id);
    const duplicates=ids.filter(
      (id,index)=>
        ids.indexOf(id)!==index
    );

    if(duplicates.length){
      fail(
        `${label} contains duplicate IDs: ${[...new Set(duplicates)].join(', ')}`
      );
    }
  };

  uniqueIds(
    foundation.features,
    'Feature manifest'
  );

  uniqueIds(
    foundation.ui,
    'UI contracts'
  );

  uniqueIds(
    foundation.services,
    'Service contracts'
  );

  if(
    foundation.features.some(
      item=>item.runtimeEnabled!==false
    )
  ){
    fail(
      'B2-01 feature descriptors must remain runtimeEnabled=false.'
    );
  }

  if(
    foundation.ui.some(
      item=>item.runtimeEnabled!==false
    )
  ){
    fail(
      'B2-01 UI descriptors must remain runtimeEnabled=false.'
    );
  }

  if(
    foundation.services.some(
      item=>item.runtimeEnabled!==false
    )
  ){
    fail(
      'B2-01 service descriptors must remain runtimeEnabled=false.'
    );
  }
}

const architectureFiles=[
  ...walkJs(
    path.join(SRC_ROOT,'app')
  ),
  ...walkJs(
    path.join(SRC_ROOT,'features')
  ),
  ...walkJs(
    path.join(SRC_ROOT,'ui')
  ),
  ...walkJs(
    path.join(SRC_ROOT,'services')
  )
];

const importPattern=
  /(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;

if(layersModule){
  const {
    FRONTEND_LAYERS,
    canLayerDependOn
  }=layersModule;

  for(const file of architectureFiles){
    const source=
      fs.readFileSync(
        file,
        'utf8'
      );

    const fromLayer=
      layerForFile(file);

    if(
      !FRONTEND_LAYERS.includes(
        fromLayer
      )
    ){
      fail(
        `Unknown source layer for ${path.relative(ROOT,file)}: ${fromLayer}`
      );
      continue;
    }

    for(
      const match of source.matchAll(
        importPattern
      )
    ){
      const resolved=
        resolveImport(
          file,
          match[1]
        );

      if(!resolved){
        continue;
      }

      if(
        !resolved.startsWith(
          SRC_ROOT+path.sep
        )
      ){
        fail(
          `${path.relative(ROOT,file)} imports outside src/: ${match[1]}`
        );
        continue;
      }

      const toLayer=
        layerForFile(resolved);

      if(
        !canLayerDependOn(
          fromLayer,
          toLayer
        )
      ){
        fail(
          `Layer violation: ${fromLayer} cannot depend on ${toLayer} `+
          `(${path.relative(ROOT,file)} → ${match[1]})`
        );
      }
    }
  }
}

try{
  const indexSource=
    read('index.html');

  const forbiddenRuntimeEntries=[
    './src/app/foundation.js',
    './src/features/manifest.js',
    './src/ui/contracts.js',
    './src/services/contracts.js'
  ];

  for(
    const entry of forbiddenRuntimeEntries
  ){
    if(indexSource.includes(entry)){
      fail(
        `B2-01 must not load architecture-only module in index.html: ${entry}`
      );
    }
  }
}catch(error){
  fail(
    `Cannot inspect index.html runtime boundary: ${error.message}`
  );
}

try{
  const swSource=
    read('sw.js');

  const forbiddenShellEntries=[
    './src/app/foundation.js',
    './src/features/manifest.js',
    './src/ui/contracts.js',
    './src/services/contracts.js'
  ];

  for(
    const entry of forbiddenShellEntries
  ){
    if(swSource.includes(entry)){
      fail(
        `B2-01 architecture-only file must not be added to APP_SHELL: ${entry}`
      );
    }
  }
}catch(error){
  fail(
    `Cannot inspect sw.js runtime boundary: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nFrontend module foundation validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Frontend module foundation validation: PASS'
);
