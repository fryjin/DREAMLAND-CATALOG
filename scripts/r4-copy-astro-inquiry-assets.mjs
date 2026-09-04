#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath
} from 'node:url';

const ROOT=
  path.resolve(
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

function fail(message){
  console.error('');
  console.error(
    '[R4.7B Inquiry Assets] FAIL'
  );
  console.error(
    '- '+message
  );
  console.error('');
  process.exit(1);
}

function ensureFile(
  file,
  label
){
  if(
    !fs.existsSync(
      file
    )
  ){
    fail(
      label+
      ' is missing: '+
      path.relative(
        ROOT,
        file
      )
    );
  }
}

function runtimeState(html){
  const match=
    html.match(
      /<script[^>]*id="inquiryRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="inquiryRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  if(!match){
    fail(
      'Inquiry runtime state is missing from isolated HTML.'
    );
  }

  try{
    return JSON.parse(
      match[1]
    );
  }catch(error){
    fail(
      'Inquiry runtime state JSON is invalid: '+
      error.message
    );
  }
}

const htmlFile=
  path.join(
    OUT,
    'inquiry',
    'index.html'
  );

ensureFile(
  htmlFile,
  'Isolated Astro Inquiry'
);

const html=
  fs.readFileSync(
    htmlFile,
    'utf8'
  );

for(const marker of [
  'data-r4-astro-inquiry="true"',
  'data-inquiry-runtime-presentation',
  'id="inquiryRuntimeState"',
  'src="/r4-inquiry-runtime.js"'
]){
  if(
    !html.includes(
      marker
    )
  ){
    fail(
      'Inquiry output is not R4.7B asset-ready: '+
      marker
    );
  }
}

const executable=[
  ...html.matchAll(
    /<script\b(?![^>]*type="application\/json")[^>]*>/gi
  )
];

if(
  executable.length!==1
){
  fail(
    'Inquiry output must contain exactly one executable runtime before asset copy; found '+
    executable.length+
    '.'
  );
}

const state=
  runtimeState(
    html
  );

if(
  state.version!=='R4.7B'||
  state.storage?.inquiryKey!==
    'productManualV2State'||
  state.storage?.languageKey!==
    'productManualLang'
){
  fail(
    'Inquiry runtime state does not match the R4.7B storage contract.'
  );
}

const runtimeSources=[
  'src/domain/pricing/runtime-pricing-policy.js',
  'src/features/inquiry/runtime-inquiry.js',
  'src/astro/runtime/inquiry-runtime.js'
];

const parts=[];

for(const relative of runtimeSources){
  const file=
    path.join(
      ROOT,
      relative
    );

  ensureFile(
    file,
    'Inquiry runtime source'
  );

  parts.push(
    fs.readFileSync(
      file,
      'utf8'
    )
  );
}

const runtimeFile=
  path.join(
    OUT,
    'r4-inquiry-runtime.js'
  );

fs.writeFileSync(
  runtimeFile,
  parts.join(
    '\n;\n'
  )+
  '\n',
  'utf8'
);

for(const product of state.products||[]){
  const cover=
    String(
      product?.cover||
      ''
    )
      .replace(
        /[?#].*$/,
        ''
      );

  if(!cover){
    continue;
  }

  const relative=
    cover.replace(
      /^\/+/,
      ''
    );

  const source=
    path.join(
      ROOT,
      relative
    );

  ensureFile(
    source,
    'Inquiry product cover'
  );

  const target=
    path.join(
      OUT,
      relative
    );

  fs.mkdirSync(
    path.dirname(
      target
    ),
    {
      recursive:true
    }
  );

  fs.copyFileSync(
    source,
    target
  );
}

console.log('');
console.log(
  '[R4.7B Inquiry Assets] PASS'
);
console.log(
  '- Runtime bundle: /r4-inquiry-runtime.js'
);
console.log(
  '- Canonical runtime owners: PricingPolicy + DreamlandInquiry + Astro Inquiry adapter'
);
console.log(
  '- Runtime product covers guaranteed:',
  (state.products||[]).length
);
console.log('');
