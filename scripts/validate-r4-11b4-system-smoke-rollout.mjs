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

  return fs.readFileSync(file,'utf8');
}

function expect(content,marker,message){
  if(!content.includes(marker)){
    fail(message+' Missing: '+marker);
  }
}

const css=read(
  'src/astro/styles/system/rollout.css'
);

const catalogCss=read(
  'src/astro/styles/catalog.css'
);

const pdpCss=read(
  'src/astro/styles/pdp.css'
);

const flatCss=
  css.replace(/\s+/g,' ');

const layout=read(
  'src/astro/layouts/SiteLayout.astro'
);

const pkg=read('package.json');

/*
 * R4.11B4 is a smoke layer. Home and Catalog may graduate to
 * route-owned composition layers in later B4.1 stages.
 */
for(const marker of [
  'body[data-dreamland-page="product"] .pdp-hero',
  'body[data-dreamland-page="product"] .pdp-summary',
  'body[data-dreamland-page="contact"] .contact-progress ol',
  'body[data-dreamland-page="contact"] .contact-form-shell',
  'body[data-dreamland-page="contact"] .contact-next',
  '@media (min-width:1051px)',
  '@media (max-width:760px)'
]){
  expect(
    flatCss,
    marker,
    'B4 remaining smoke contract changed.'
  );
}

for(const marker of [
  'var(--dl-asym-gap-lg)',
  'var(--dl-asym-offset-md)',
  'var(--dl-asym-mobile-inset)',
  'var(--dl-color-mobile-canvas)'
]){
  expect(
    css,
    marker,
    'B4 must continue consuming the B1-B3 system.'
  );
}

if(
  pdpCss.includes(
    'R4.11B4.1E-A — Mobile PDP Feature Foundation'
  )
){
  if(
    css.includes(
      'Layered surface + variable media rhythm.'
    )
  ){
    fail(
      'Mobile PDP has graduated to E-A and must no longer be owned by rollout.css.'
    );
  }

  expect(
    css,
    'Mobile PDP graduated to R4.11B4.1E-A Mobile PDP Feature Foundation.',
    'B4 rollout must record Mobile PDP graduation.'
  );
}else{
  expect(
    flatCss,
    '@media (max-width:720px)',
    'Pre-E-A Mobile PDP smoke contract changed.'
  );
}

if(
  catalogCss.includes(
    'R4.11B4.1D-C — Mobile Editorial Flow System'
  )
){
  if(
    css.includes(
      'data-dreamland-page="catalog"'
    )
  ){
    fail(
      'Catalog has graduated to D-C and must no longer be owned by rollout.css.'
    );
  }
}else{
  for(const marker of [
    'body[data-dreamland-page="catalog"] .catalog-card',
    '.catalog-card:nth-child(even)',
    'var(--dl-asym-stagger-offset)'
  ]){
    expect(
      flatCss,
      marker,
      'Pre-D-C Catalog smoke contract changed.'
    );
  }
}

for(const forbiddenPage of [
  'data-dreamland-page="home"',
  'data-dreamland-page="custom"',
  'data-dreamland-page="inquiry"',
  'data-dreamland-page="review"',
  'data-dreamland-page="success"'
]){
  if(css.includes(forbiddenPage)){
    fail(
      'B4 smoke rollout expanded beyond representative routes: '+
      forbiddenPage
    );
  }
}

for(const forbidden of [
  'data-pdp-',
  'data-catalog-',
  'data-contact-',
  'display:none',
  'visibility:hidden',
  'pointer-events:none',
  'position:fixed',
  '!important'
]){
  if(css.includes(forbidden)){
    fail(
      'B4 visual rollout contains unsafe behavior: '+
      forbidden
    );
  }
}

expect(
  layout,
  "import '../styles/system/rollout.css';",
  'SiteLayout must import the B4 rollout layer.'
);

expect(
  pkg,
  '"r4:visual:rollout": "node scripts/validate-r4-11b4-system-smoke-rollout.mjs"',
  'package.json must expose the B4 validator.'
);

expect(
  pkg,
  'npm run r4:visual:asymmetry && npm run r4:visual:rollout',
  'Main validation chain must run B4 after B3.'
);

if(errors.length){
  console.error(
    '\nR4.11B4 SYSTEM SMOKE ROLLOUT: FAIL\n'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log(
  'R4.11B4 SYSTEM SMOKE ROLLOUT: PASS'
);
