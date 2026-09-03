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
  fs.readFileSync(
    catalogFile,
    'utf8'
  );

const covers=[
  ...new Set(
    [
      ...html.matchAll(
        /src="(\/images\/products\/[^"]+\/cover\.webp)"/g
      )
    ].map(
      match=>match[1]
    )
  )
];

if(covers.length!==24){
  fail(
    'R4.4A expected exactly 24 initial Catalog cover references; found '+
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

console.log(
  '[R4 Astro Catalog Assets] copied 24 route-scoped product covers into .r4-astro-dist.'
);
