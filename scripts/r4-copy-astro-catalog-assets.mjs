#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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

const catalogFile=
  path.join(
    OUT,
    'products',
    'index.html'
  );

function fail(message){
  console.error('');
  console.error(
    '[R4 Astro Catalog Assets] FAIL'
  );
  console.error(
    '- '+message
  );
  console.error('');
  process.exit(1);
}

function read(file){
  return fs.readFileSync(
    file,
    'utf8'
  );
}

function runtimeState(html){
  const match=
    html.match(
      /<script[^>]*id="catalogRuntimeState"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    )||
    html.match(
      /<script[^>]*type="application\/json"[^>]*id="catalogRuntimeState"[^>]*>([\s\S]*?)<\/script>/i
    );

  if(!match){
    fail(
      'Catalog runtime state is missing from isolated output.'
    );
  }

  try{
    return JSON.parse(
      match[1]
    );
  }catch(error){
    fail(
      'Catalog runtime state JSON is invalid: '+
      error.message
    );
  }
}

if(
  !fs.existsSync(
    catalogFile
  )
){
  fail(
    'Catalog output is missing: .r4-astro-dist/products/index.html'
  );
}

const html=
  read(
    catalogFile
  );

const state=
  runtimeState(
    html
  );

const covers=[
  ...new Set(
    (
      Array.isArray(
        state?.products
      )
        ? state.products
        : []
    )
      .map(
        product=>
          String(
            product?.cover||
            ''
          )
            .trim()
      )
      .filter(
        pathname=>
          /^\/images\/products\/[^/]+\/cover\.webp$/
            .test(
              pathname
            )
      )
  )
];

if(covers.length!==89){
  fail(
    'R4.4B expected 89 runtime Catalog cover references; found '+
    covers.length+
    '.'
  );
}

for(const pathname of covers){
  const relative=
    pathname.replace(
      /^\/+/,
      ''
    );

  const source=
    path.join(
      ROOT,
      relative
    );

  const target=
    path.join(
      OUT,
      relative
    );

  if(!fs.existsSync(source)){
    fail(
      'Catalog source cover is missing: '+
      relative
    );
  }

  fs.mkdirSync(
    path.dirname(target),
    {
      recursive:true
    }
  );

  fs.copyFileSync(
    source,
    target
  );
}

const policySource=
  path.join(
    ROOT,
    'src',
    'features',
    'catalog',
    'runtime-desktop-catalog-view.js'
  );

const adapterSource=
  path.join(
    ROOT,
    'src',
    'astro',
    'runtime',
    'catalog-runtime.js'
  );

for(const source of [
  policySource,
  adapterSource
]){
  if(!fs.existsSync(source)){
    fail(
      'Catalog runtime source is missing: '+
      path.relative(
        ROOT,
        source
      )
    );
  }
}

const runtimeTarget=
  path.join(
    OUT,
    'r4-catalog-runtime.js'
  );

fs.writeFileSync(
  runtimeTarget,
  read(policySource)+
  '\n;\n'+
  read(adapterSource)+
  '\n',
  'utf8'
);

console.log(
  '[R4 Astro Catalog Assets] copied 89 route-scoped product covers into .r4-astro-dist.'
);

console.log(
  '[R4 Astro Catalog Runtime] bundled canonical Catalog ViewState + minimal Astro adapter → .r4-astro-dist/r4-catalog-runtime.js'
);
