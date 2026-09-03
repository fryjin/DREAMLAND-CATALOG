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

function fail(message){
  console.error('');
  console.error(
    '[R4 Astro PDP Assets] FAIL'
  );
  console.error(
    '- '+message
  );
  console.error('');
  process.exit(1);
}

const products=
  JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        'data/products.json'
      ),
      'utf8'
    )
  )
    .products
    .filter(
      product=>
        product?.status===
        'active'
    );

if(products.length!==89){
  fail(
    'R4.5A expected 89 active products; found '+
    products.length+
    '.'
  );
}

const referenced=
  new Set();

for(const product of products){
  const id=
    String(
      product?.productId||
      product?.id||
      ''
    )
      .trim()
      .toUpperCase();

  const page=
    path.join(
      OUT,
      'products',
      id,
      'index.html'
    );

  if(!fs.existsSync(page)){
    fail(
      'PDP output is missing: '+
      path.relative(
        ROOT,
        page
      )
    );
  }

  const html=
    fs.readFileSync(
      page,
      'utf8'
    );

  const paths=[
    ...html.matchAll(
      /(?:src|content)="(\/images\/products\/[^"]+\.(?:webp|png|jpe?g))"/gi
    )
  ].map(
    match=>match[1]
  );

  if(!paths.length){
    fail(
      'PDP has no route-scoped product image references: '+
      id
    );
  }

  paths.forEach(
    pathname=>
      referenced.add(
        pathname
      )
  );
}

for(const pathname of referenced){
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
      'PDP source image is missing: '+
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
  '[R4 Astro PDP Assets] copied '+
  referenced.size+
  ' referenced product images into .r4-astro-dist.'
);
