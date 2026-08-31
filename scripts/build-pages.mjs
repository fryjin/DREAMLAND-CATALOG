#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const WRITE=process.argv.includes('--write');
const CHECK=process.argv.includes('--check');

if(!WRITE&&!CHECK){
  console.error('Usage: node scripts/build-pages.mjs --write | --check');
  process.exit(1);
}

const routes=JSON.parse(
  fs.readFileSync(
    path.join(ROOT,'data/page-routes.json'),
    'utf8'
  )
);

const productData=JSON.parse(
  fs.readFileSync(
    path.join(ROOT,'data/products.json'),
    'utf8'
  )
);

const template=fs.readFileSync(
  path.join(
    ROOT,
    'src/site/templates/base-page.html'
  ),
  'utf8'
);

const activeProducts=(productData.products||[])
  .filter(product=>product?.status==='active');

const outputRoot=WRITE
  ? path.join(ROOT,'dist')
  : fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'dreamland-pages-'
      )
    );

function text(value){
  return String(value??'').trim();
}

function escapeHtml(value){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function normalizeProductId(value){
  const productId=text(value).toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(productId)){
    throw new Error('Invalid product id in build data: '+value);
  }
  return productId;
}

function routePath(name,params={}){
  const row=routes.routes?.[name];

  if(!row){
    throw new Error('Missing page route: '+name);
  }

  let value=text(row.path);

  if(row.dynamic==='productId'){
    value=value.replace(
      '{productId}',
      normalizeProductId(params.productId)
    );
  }

  if(/\{[^}]+\}/.test(value)){
    throw new Error('Missing route parameter for '+name);
  }

  return value;
}

function outputFile(route){
  if(route==='/'){
    return path.join(outputRoot,'index.html');
  }

  const normalized=route
    .replace(/^\/+/,'')
    .replace(/\/+$/,'');

  return path.join(
    outputRoot,
    normalized,
    'index.html'
  );
}

function fill(values){
  let html=template;

  for(const [key,value] of Object.entries(values)){
    html=html.split('{{'+key+'}}')
      .join(escapeHtml(value));
  }

  if(/\{\{[A-Z0-9_]+\}\}/.test(html)){
    throw new Error(
      'Unresolved page template token.'
    );
  }

  return html;
}

function writePage({
  page,
  route,
  productId='',
  title,
  description,
  heading
}){
  const file=outputFile(route);

  fs.mkdirSync(
    path.dirname(file),
    {recursive:true}
  );

  fs.writeFileSync(
    file,
    fill({
      PAGE:page,
      PRODUCT_ID:productId,
      ROUTE_PATH:route,
      TITLE:title,
      DESCRIPTION:description,
      HEADING:heading
    }),
    'utf8'
  );

  return file;
}

function fixedPage(name,title,description){
  const route=routePath(name);
  return writePage({
    page:name,
    route,
    title,
    description,
    heading:title
  });
}

function cleanOutput(){
  if(WRITE){
    fs.rmSync(
      outputRoot,
      {
        recursive:true,
        force:true
      }
    );
  }
  fs.mkdirSync(
    outputRoot,
    {recursive:true}
  );
}

function copyFoundationRuntime(){
  const sourceDir=path.join(
    ROOT,
    'src/site/runtime'
  );

  const targetDir=path.join(
    outputRoot,
    'src/site/runtime'
  );

  fs.mkdirSync(
    targetDir,
    {recursive:true}
  );

  for(const name of [
    'runtime-route.js',
    'runtime-page-context.js',
    'runtime-device-profile.js',
    'runtime-navigation-context.js',
    'runtime-site-bootstrap.js'
  ]){
    fs.copyFileSync(
      path.join(sourceDir,name),
      path.join(targetDir,name)
    );
  }

  fs.mkdirSync(
    path.join(outputRoot,'data'),
    {recursive:true}
  );

  fs.copyFileSync(
    path.join(ROOT,'data/page-routes.json'),
    path.join(outputRoot,'data/page-routes.json')
  );
}

function build(){
  cleanOutput();
  copyFoundationRuntime();

  const files=[];

  files.push(
    fixedPage(
      'home',
      'DREAMLAND',
      'DREAMLAND independent-site multipage foundation.'
    )
  );

  files.push(
    fixedPage(
      'catalog',
      'Products | DREAMLAND',
      'Browse DREAMLAND product collections.'
    )
  );

  files.push(
    fixedPage(
      'custom',
      'Custom Project | DREAMLAND',
      'Build a DREAMLAND custom project brief.'
    )
  );

  files.push(
    fixedPage(
      'inquiry',
      'Inquiry | DREAMLAND',
      'Review selected DREAMLAND products and custom projects.'
    )
  );

  files.push(
    fixedPage(
      'contact',
      'Contact | DREAMLAND',
      'Provide business contact information for your DREAMLAND inquiry.'
    )
  );

  files.push(
    fixedPage(
      'review',
      'Review Inquiry | DREAMLAND',
      'Review your DREAMLAND inquiry before submission.'
    )
  );

  files.push(
    fixedPage(
      'success',
      'Inquiry Received | DREAMLAND',
      'Your DREAMLAND inquiry has been received.'
    )
  );

  files.push(
    fixedPage(
      'privacy',
      'Privacy | DREAMLAND',
      'DREAMLAND privacy information.'
    )
  );

  for(const product of activeProducts){
    const productId=normalizeProductId(
      product.productId||product.id
    );

    const title=
      text(product.names?.en)||
      text(product.names?.zh)||
      text(product.name)||
      productId;

    const description=
      text(product.descriptions?.en)||
      text(product.descriptions?.zh)||
      text(product.desc)||
      'DREAMLAND product detail.';

    files.push(
      writePage({
        page:'product',
        route:routePath(
          'product',
          {productId}
        ),
        productId,
        title:title+' | DREAMLAND',
        description,
        heading:title
      })
    );
  }

  const notFoundFile=path.join(
    outputRoot,
    '404.html'
  );

  fs.writeFileSync(
    notFoundFile,
    fill({
      PAGE:'notFound',
      PRODUCT_ID:'',
      ROUTE_PATH:'/404/',
      TITLE:'Not Found | DREAMLAND',
      DESCRIPTION:'The requested DREAMLAND page could not be found.',
      HEADING:'Page not found'
    }),
    'utf8'
  );

  files.push(notFoundFile);

  const manifest={
    version:'B7-00B.4J-R1',
    routeContract:routes.version,
    fixedPages:8,
    productPages:activeProducts.length,
    totalPages:files.length,
    productIds:activeProducts.map(
      product=>normalizeProductId(
        product.productId||product.id
      )
    )
  };

  fs.writeFileSync(
    path.join(
      outputRoot,
      'multipage-build-manifest.json'
    ),
    JSON.stringify(manifest,null,2)+'\n',
    'utf8'
  );

  return {
    files,
    manifest
  };
}

function verify(result){
  const required=[
    routePath('home'),
    routePath('catalog'),
    routePath('custom'),
    routePath('inquiry'),
    routePath('contact'),
    routePath('review'),
    routePath('success'),
    routePath('privacy')
  ];

  for(const route of required){
    if(!fs.existsSync(outputFile(route))){
      throw new Error(
        'Generated page missing: '+route
      );
    }
  }

  for(const product of activeProducts){
    const productId=normalizeProductId(
      product.productId||product.id
    );

    if(
      !fs.existsSync(
        outputFile(
          routePath(
            'product',
            {productId}
          )
        )
      )
    ){
      throw new Error(
        'Generated product page missing: '+productId
      );
    }
  }

  for(const name of [
    'runtime-route.js',
    'runtime-page-context.js',
    'runtime-device-profile.js',
    'runtime-navigation-context.js',
    'runtime-site-bootstrap.js'
  ]){
    if(
      !fs.existsSync(
        path.join(
          outputRoot,
          'src/site/runtime',
          name
        )
      )
    ){
      throw new Error(
        'Generated foundation runtime missing: '+name
      );
    }
  }

  if(
    result.manifest.productPages!==
    activeProducts.length
  ){
    throw new Error(
      'Product page count mismatch.'
    );
  }

  if(!fs.existsSync(path.join(outputRoot,'404.html'))){
    throw new Error('404 page contract missing.');
  }

  return true;
}

let result;

try{
  result=build();
  verify(result);

  console.log('');
  console.log('DREAMLAND B7-00B.4J R1 multipage build: PASS');
  console.log('Output mode:',WRITE?'write':'check');
  console.log('Active product pages:',result.manifest.productPages);
  console.log('Fixed pages:',result.manifest.fixedPages);
  console.log('Total generated pages:',result.manifest.totalPages);
  console.log('');

  if(WRITE){
    console.log(
      'Output:',
      path.relative(ROOT,outputRoot)||'dist'
    );
  }
}finally{
  if(CHECK){
    fs.rmSync(
      outputRoot,
      {
        recursive:true,
        force:true
      }
    );
  }
}
