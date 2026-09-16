#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  '..'
);
const SOURCE_ROOT=path.join(ROOT,'.r4-astro-dist');
const TARGET_ROOT=path.join(ROOT,'dist');
const WRITE=process.argv.includes('--write');

function fail(message){
  console.error('');
  console.error('DREAMLAND B7-00B.4J R4.10C Production Success Promotion: FAIL');
  console.error('- '+message);
  console.error('');
  process.exit(1);
}

function ensureDirectory(directory,label){
  if(
    !fs.existsSync(directory)||
    !fs.statSync(directory).isDirectory()||
    fs.lstatSync(directory).isSymbolicLink()
  ){
    fail(
      label+
      ' is missing, not a directory, or unsafe: '+
      path.relative(ROOT,directory)
    );
  }
}

function ensureFile(file,label){
  if(
    !fs.existsSync(file)||
    !fs.statSync(file).isFile()||
    fs.lstatSync(file).isSymbolicLink()
  ){
    fail(
      label+
      ' is missing, not a regular file, or unsafe: '+
      path.relative(ROOT,file)
    );
  }
}

function hashFile(file){
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(file)
    )
    .digest('hex');
}

function read(file){
  ensureFile(file,'Required file');
  return fs.readFileSync(file,'utf8');
}

function copyExact(source,target){
  ensureFile(source,'Astro Success asset');
  fs.mkdirSync(
    path.dirname(target),
    {recursive:true}
  );

  if(fs.existsSync(target)){
    if(
      fs.lstatSync(target).isSymbolicLink()||
      !fs.statSync(target).isFile()
    ){
      fail(
        'Production asset target is unsafe: '+
        path.relative(ROOT,target)
      );
    }

    if(
      hashFile(source)!==
      hashFile(target)
    ){
      fail(
        'Production Astro asset collision has different bytes: '+
        path.relative(ROOT,target)
      );
    }

    return;
  }

  fs.copyFileSync(
    source,
    target
  );
}

function referencedAstroAssets(html){
  return [
    ...new Set(
      [
        ...html.matchAll(
          /(?:src|href)="(\/_astro\/[^"?#]+)(?:[?#][^"]*)?"/g
        )
      ].map(
        match=>match[1]
      )
    )
  ];
}

if(!WRITE){
  fail(
    'Refusing to mutate dist/ without --write.'
  );
}

ensureDirectory(
  SOURCE_ROOT,
  'Isolated Astro output'
);
ensureDirectory(
  TARGET_ROOT,
  'Production dist output'
);

const sourceSuccess=
  path.join(
    SOURCE_ROOT,
    'inquiry',
    'success',
    'index.html'
  );
const targetSuccess=
  path.join(
    TARGET_ROOT,
    'inquiry',
    'success',
    'index.html'
  );
const sourceRuntime=
  path.join(
    SOURCE_ROOT,
    'r4-success-runtime.js'
  );
const targetRuntime=
  path.join(
    TARGET_ROOT,
    'r4-success-runtime.js'
  );
const swFile=
  path.join(
    TARGET_ROOT,
    'sw.js'
  );
const manifestFile=
  path.join(
    TARGET_ROOT,
    'multipage-build-manifest.json'
  );

for(const [file,label] of [
  [sourceSuccess,'Isolated Astro Success HTML'],
  [sourceRuntime,'Isolated Astro Success runtime'],
  [targetSuccess,'Legacy Production Success HTML'],
  [swFile,'Production Service Worker'],
  [manifestFile,'Production ownership manifest']
]){
  ensureFile(file,label);
}

const sourceHtml=
  read(sourceSuccess);

for(const marker of [
  'data-r4-astro-foundation="true"',
  'data-r4-astro-success="true"',
  'data-r4-success-static="true"',
  'data-success-static-presentation',
  'data-site-language-enabled="true"',
  'name="robots" content="noindex,nofollow"',
  'rel="canonical" href="https://dreamland-catalog.pages.dev/inquiry/success/"',
  'id="successRuntimeState"',
  'src="/r4-success-runtime.js"',
  'data-success-guard-name="hasLastSubmission"',
  'data-success-guard-code="SUBMISSION_REQUIRED"',
  'data-success-static-action="explore"',
  'data-success-static-action="custom"'
]){
  if(!sourceHtml.includes(marker)){
    fail(
      'Isolated Astro Success is missing cutover marker: '+
      marker
    );
  }
}

for(const forbidden of [
  'DREAMLAND_MPA_ACTIVE',
  'runtime-desktop-experience.js',
  'runtime-desktop-success.js',
  'startup-loader.js',
  'serviceWorker.register',
  'navigator.serviceWorker'
]){
  if(sourceHtml.includes(forbidden)){
    fail(
      'Isolated Astro Success still contains Legacy/PWA shell marker: '+
      forbidden
    );
  }
}

const legacySuccess=
  read(targetSuccess);

if(
  !legacySuccess.includes(
    'window.DREAMLAND_MPA_ACTIVE=true;'
  )
){
  fail(
    'Production Success must still be Legacy immediately before R4.10C promotion.'
  );
}

const runtime=
  read(sourceRuntime);

for(const [marker,label] of [
  ['root.DreamlandStorage=Object.freeze','DreamlandStorage'],
  ['root.DreamlandPageGuards=Object.freeze','DreamlandPageGuards'],
  ['root.DreamlandSuccessRuntime=','DreamlandSuccessRuntime'],
  ["const VERSION='R4.10B';",'R4.10B adapter']
]){
  const count=
    runtime.split(marker).length-1;

  if(count!==1){
    fail(
      'Isolated Success runtime marker count must equal 1 for '+
      label+
      '; found '+
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
  if(runtime.includes(forbidden)){
    fail(
      'Isolated Success runtime crossed a forbidden owner boundary: '+
      forbidden
    );
  }
}

const swBefore=
  hashFile(swFile);

const products=
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'data',
        'products.json'
      ),
      'utf8'
    )
  ).products||
  [];

const activeProducts=
  products.filter(
    product=>
      product?.status==='active'
  );

if(activeProducts.length!==89){
  fail(
    'Expected 89 active Products for Production sentinels; found '+
    activeProducts.length+
    '.'
  );
}

const sentinelContracts=[
  {
    relative:'index.html',
    marker:'data-r4-production-home="true"'
  },
  {
    relative:'products/index.html',
    marker:'data-r4-astro-catalog="true"'
  },
  {
    relative:'custom/index.html',
    marker:'data-r4-astro-custom="true"'
  },
  {
    relative:'inquiry/index.html',
    marker:'data-r4-astro-inquiry="true"'
  },
  {
    relative:'inquiry/contact/index.html',
    marker:'data-r4-astro-contact="true"'
  },
  {
    relative:'inquiry/review/index.html',
    marker:'data-r4-astro-review="true"'
  },
  {
    relative:'sw.js',
    marker:"const CACHE_VERSION = 'dreamland-pwa-v129';"
  },
  {relative:'r4-home-runtime.js'},
  {relative:'r4-catalog-runtime.js'},
  {relative:'r4-pdp-runtime.js'},
  {relative:'r4-custom-runtime.js'},
  {relative:'r4-inquiry-runtime.js'},
  {relative:'r4-contact-runtime.js'},
  {relative:'r4-review-runtime.js'},
  {
    relative:'src/ui/desktop/success/runtime-desktop-success.js',
    marker:'root.DreamlandDesktopSuccess=Object.freeze'
  }
];

for(const product of activeProducts){
  const productId=
    String(
      product?.productId||
      product?.id||
      ''
    )
      .trim()
      .toUpperCase();

  if(!productId){
    fail(
      'Active Product is missing an ID.'
    );
  }

  sentinelContracts.push({
    relative:
      path.join(
        'products',
        productId,
        'index.html'
      ),
    marker:
      'data-r4-astro-product="true"'
  });
}

const sentinelHashes=
  new Map();

for(const contract of sentinelContracts){
  const file=
    path.join(
      TARGET_ROOT,
      contract.relative
    );

  ensureFile(
    file,
    'Production route sentinel'
  );

  if(
    contract.marker&&
    !fs.readFileSync(file,'utf8')
      .includes(contract.marker)
  ){
    fail(
      'Unexpected Production route owner before Success promotion: '+
      contract.relative
    );
  }

  sentinelHashes.set(
    contract.relative,
    hashFile(file)
  );
}

let manifest;

try{
  manifest=
    JSON.parse(
      fs.readFileSync(
        manifestFile,
        'utf8'
      )
    );
}catch(error){
  fail(
    'Production ownership manifest is invalid JSON: '+
    error.message
  );
}

for(const [key,expected] of [
  ['homeOwner','astro'],
  ['catalogOwner','astro'],
  ['pdpOwner','astro'],
  ['customOwner','astro'],
  ['inquiryOwner','astro'],
  ['contactOwner','astro'],
  ['reviewOwner','astro']
]){
  if(manifest[key]!==expected){
    fail(
      'Production ownership manifest prerequisite mismatch: '+
      key+
      '='+
      String(manifest[key])
    );
  }
}

if(
  manifest.reviewCutover!==
    'B7-00B.4J-R4.9D'||
  manifest.presentationOverrides?.review!==
    'astro-r4.9d'
){
  fail(
    'Production ownership manifest lost the Review cutover prerequisite.'
  );
}

if(
  manifest.successOwner||
  manifest.successCutover||
  manifest.presentationOverrides?.success
){
  fail(
    'Production ownership manifest already contains Success cutover ownership.'
  );
}

for(const href of referencedAstroAssets(sourceHtml)){
  const relative=
    href.replace(
      /^\/+/,
      ''
    );

  copyExact(
    path.join(
      SOURCE_ROOT,
      relative
    ),
    path.join(
      TARGET_ROOT,
      relative
    )
  );
}

if(
  fs.existsSync(targetRuntime)&&
  fs.lstatSync(targetRuntime).isSymbolicLink()
){
  fail(
    'Production Success runtime target is unsafe.'
  );
}

fs.copyFileSync(
  sourceRuntime,
  targetRuntime
);

fs.mkdirSync(
  path.dirname(targetSuccess),
  {recursive:true}
);

fs.copyFileSync(
  sourceSuccess,
  targetSuccess
);

manifest.presentationOverrides={
  ...(
    manifest.presentationOverrides||
    {}
  ),
  success:
    'astro-r4.10c'
};

manifest.successOwner=
  'astro';

manifest.successCutover=
  'B7-00B.4J-R4.10C';

fs.writeFileSync(
  manifestFile,
  JSON.stringify(
    manifest,
    null,
    2
  )+
  '\n',
  'utf8'
);

const promotedHtml=
  read(targetSuccess);

for(const marker of [
  'data-r4-astro-success="true"',
  'data-success-static-presentation',
  'id="successRuntimeState"',
  'src="/r4-success-runtime.js"',
  'data-success-guard-name="hasLastSubmission"'
]){
  if(!promotedHtml.includes(marker)){
    fail(
      'Promoted Production Success is missing: '+
      marker
    );
  }
}

if(
  promotedHtml.includes(
    'DREAMLAND_MPA_ACTIVE'
  )
){
  fail(
    'Promoted Production Success still contains the Legacy MPA marker.'
  );
}

if(
  hashFile(sourceSuccess)!==
  hashFile(targetSuccess)
){
  fail(
    'Production Success HTML is not byte-identical to the isolated Astro Success artifact.'
  );
}

if(
  hashFile(sourceRuntime)!==
  hashFile(targetRuntime)
){
  fail(
    'Production Success runtime is not byte-identical to the isolated R4.10B runtime artifact.'
  );
}

if(
  hashFile(swFile)!==
  swBefore
){
  fail(
    'R4.10C unexpectedly changed Production sw.js.'
  );
}

for(const [relative,beforeHash] of sentinelHashes){
  if(
    hashFile(
      path.join(
        TARGET_ROOT,
        relative
      )
    )!==
    beforeHash
  ){
    fail(
      'R4.10C changed a protected Production sentinel: '+
      relative
    );
  }
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R4.10C Production Success Promotion: PASS'
);
console.log(
  '- /inquiry/success/ promoted from the isolated Astro R4.10B artifact.'
);
console.log(
  '- Home / Catalog / 89 PDPs / Custom / Inquiry / Contact / Review / sw.js remained byte-identical.'
);
console.log(
  '- Legacy Success shell assets remain intentionally available until R4.10D detachment.'
);
console.log('');
