#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(
      import.meta.url
    )
  ),
  '..'
);

const OUT=
  path.join(
    ROOT,
    '.r4-astro-dist'
  );

const SOURCES=Object.freeze([
  Object.freeze({
    owner:'Storage',
    path:
      'src/services/storage/runtime-storage.js'
  }),
  Object.freeze({
    owner:'PageGuards',
    path:
      'src/site/runtime/runtime-page-guards.js'
  }),
  Object.freeze({
    owner:'Astro Success adapter',
    path:
      'src/astro/runtime/success-runtime.js'
  })
]);

function fail(message){
  console.error(
    '[R4.10B Success Runtime Assets] FAIL'
  );
  console.error(
    '- '+
    message
  );
  process.exit(1);
}

if(
  !fs.existsSync(
    OUT
  )||
  fs.lstatSync(
    OUT
  ).isSymbolicLink()
){
  fail(
    'isolated Astro output is missing or unsafe.'
  );
}

const html=
  path.join(
    OUT,
    'inquiry',
    'success',
    'index.html'
  );

if(
  !fs.existsSync(
    html
  )
){
  fail(
    'isolated Success HTML is missing.'
  );
}

const htmlSource=
  fs.readFileSync(
    html,
    'utf8'
  );

for(const marker of [
  'id="successRuntimeState"',
  'src="/r4-success-runtime.js"'
]){
  if(!htmlSource.includes(marker)){
    fail(
      'isolated Success HTML is missing runtime boundary: '+
      marker
    );
  }
}

const chunks=[];

for(const source of SOURCES){
  const file=
    path.join(
      ROOT,
      source.path
    );

  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      'canonical owner is missing: '+
      source.path
    );
  }

  chunks.push(
    '/* R4.10B owner: '+
    source.owner+
    ' | '+
    source.path+
    ' */\n'+
    fs.readFileSync(
      file,
      'utf8'
    )
  );
}

const bundle=
  chunks.join(
    '\n\n'
  )+
  '\n';

for(const [
  marker,
  label
] of [
  [
    'root.DreamlandStorage=Object.freeze',
    'DreamlandStorage'
  ],
  [
    'root.DreamlandPageGuards=Object.freeze',
    'DreamlandPageGuards'
  ],
  [
    'root.DreamlandSuccessRuntime=',
    'DreamlandSuccessRuntime'
  ]
]){
  const count=
    bundle.split(
      marker
    ).length-1;

  if(count!==1){
    fail(
      label+
      ' owner definition count must equal 1; found '+
      count+
      '.'
    );
  }
}

for(const forbidden of [
  'root.DreamlandSubmission=',
  'root.DreamlandRisk=',
  'root.DreamlandInquirySubmissionFlow=',
  'root.DreamlandPwa=',
  'runtime-desktop-success.js'
]){
  if(bundle.includes(forbidden)){
    fail(
      'Success runtime bundle crossed a forbidden boundary: '+
      forbidden
    );
  }
}

fs.writeFileSync(
  path.join(
    OUT,
    'r4-success-runtime.js'
  ),
  bundle,
  'utf8'
);

console.log(
  '[R4.10B Success Runtime Assets] bundled canonical Storage + PageGuards + minimal Astro Success adapter -> .r4-astro-dist/r4-success-runtime.js'
);
