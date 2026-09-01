#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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
  return fs.readFileSync(
    path.join(ROOT,relative),
    'utf8'
  );
}

function loadJson(relative){
  return JSON.parse(read(relative));
}

function execute(relative,extra={}){
  const sandbox={
    console,
    URL,
    URLSearchParams,
    Object,
    Array,
    String,
    Number,
    Boolean,
    JSON,
    Date,
    Math,
    RegExp,
    encodeURIComponent,
    decodeURIComponent,
    decodeURI,
    setTimeout,
    clearTimeout,
    ...extra
  };

  sandbox.globalThis=sandbox;

  vm.runInNewContext(
    read(relative),
    sandbox,
    {
      filename:relative
    }
  );

  return sandbox;
}

try{
  const routes=loadJson('data/page-routes.json');

  if(routes.version!=='B7-00B.4J-R1'){
    fail('Page route contract version must be B7-00B.4J-R1.');
  }

  const expected={
    home:'/',
    catalog:'/products/',
    product:'/products/{productId}/',
    custom:'/custom/',
    inquiry:'/inquiry/',
    contact:'/inquiry/contact/',
    review:'/inquiry/review/',
    success:'/inquiry/success/',
    privacy:'/privacy/',
    notFound:'/404/'
  };

  for(const [name,pathname] of Object.entries(expected)){
    if(routes.routes?.[name]?.path!==pathname){
      fail('Page route mismatch for '+name+': expected '+pathname);
    }
  }

  if(routes.routes?.contact?.guard!=='hasInquiry'){
    fail('Contact route must keep hasInquiry guard contract.');
  }

  if(routes.routes?.review?.guard!=='hasValidContact'){
    fail('Review route must keep hasValidContact guard contract.');
  }

  if(routes.routes?.success?.guard!=='hasLastSubmission'){
    fail('Success route must keep hasLastSubmission guard contract.');
  }

  if(routes.localePrefix?.enabled!==false){
    fail('Locale URL prefixes must stay disabled in 4J R1.');
  }

  const supported=routes.localePrefix?.supported||[];
  for(const lang of ['en','zh','ko']){
    if(!supported.includes(lang)){
      fail('Future locale route contract is missing '+lang+'.');
    }
  }

  const routeBox=execute(
    'src/site/runtime/runtime-route.js'
  );

  const route=routeBox.DreamlandRoute;

  if(!route){
    fail('DreamlandRoute runtime did not register.');
  }else{
    route.configure(routes);

    if(route.home()!=='/'){
      fail('Route home() must return /.');
    }

    if(route.catalog()!=='/products/'){
      fail('Route catalog() must return /products/.');
    }

    if(route.product('adv001')!=='/products/ADV001/'){
      fail('Product route must normalize stable product IDs.');
    }

    if(
      route.catalog({
        series:'masterpiece',
        size:['S','M']
      })!==
      '/products/?series=masterpiece&size=S&size=M'
    ){
      fail('Catalog route must preserve query-state URL values.');
    }

    const productResolved=route.resolve(
      '/products/MPC001/?from=home'
    );

    if(
      productResolved.page!=='product'||
      productResolved.productId!=='MPC001'||
      productResolved.query.from!=='home'
    ){
      fail('Route resolver failed product deep-link parsing.');
    }

    if(route.resolve('/unknown/').matched!==false){
      fail('Unknown routes must resolve as unmatched.');
    }
  }

  const pageBox=execute(
    'src/site/runtime/runtime-page-context.js',
    {
      DreamlandRoute:route
    }
  );

  const pageContext=pageBox.DreamlandPageContext;

  pageContext.configure({
    route,
    locationRef:{
      pathname:'/products/MPC001/',
      search:'?series=masterpiece'
    },
    documentRef:{
      body:{
        dataset:{}
      }
    }
  });

  const productContext=pageContext.snapshot();

  if(
    productContext.page!=='product'||
    productContext.productId!=='MPC001'
  ){
    fail('Page Context failed to derive product route identity.');
  }

  pageContext.configure({
    route,
    locationRef:{
      pathname:'/inquiry/review/',
      search:''
    },
    documentRef:{
      body:{
        dataset:{}
      }
    }
  });

  const reviewContext=pageContext.snapshot();

  if(
    reviewContext.page!=='review'||
    reviewContext.guard!=='hasValidContact'
  ){
    fail('Page Context failed to expose Review guard.');
  }

  const deviceBox=execute(
    'src/site/runtime/runtime-device-profile.js'
  );

  const device=deviceBox.DreamlandDeviceProfile;

  const iphone=device.classifySignals({
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    platform:'iPhone',
    viewportWidth:390,
    viewportHeight:844,
    maxTouchPoints:5,
    coarsePointer:true,
    hover:false
  });

  if(
    iphone.family!=='phone'||
    iphone.presentation!=='mobile'||
    iphone.input!=='touch'
  ){
    fail('Device Profile must classify iPhone as Mobile touch.');
  }

  const smallTablet=device.classifySignals({
    userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',
    platform:'iPad',
    viewportWidth:820,
    viewportHeight:1180,
    maxTouchPoints:5,
    coarsePointer:true,
    hover:false
  });

  if(
    smallTablet.family!=='tablet'||
    smallTablet.presentation!=='mobile'
  ){
    fail('Small tablet must use Mobile presentation.');
  }

  const largeTablet=device.classifySignals({
    userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',
    platform:'iPad',
    viewportWidth:1366,
    viewportHeight:1024,
    maxTouchPoints:5,
    coarsePointer:true,
    hover:false
  });

  if(
    largeTablet.family!=='tablet'||
    largeTablet.presentation!=='desktop'||
    largeTablet.touchOptimized!==true
  ){
    fail('Large tablet must use Desktop Touch presentation.');
  }

  const desktop=device.classifySignals({
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    platform:'Win32',
    viewportWidth:1440,
    viewportHeight:900,
    maxTouchPoints:0,
    coarsePointer:false,
    hover:true
  });

  if(
    desktop.family!=='desktop'||
    desktop.presentation!=='desktop'||
    desktop.input!=='pointer'
  ){
    fail('Desktop profile must use Desktop pointer presentation.');
  }

  const narrowDesktop=device.classifySignals({
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    platform:'Win32',
    viewportWidth:600,
    viewportHeight:900,
    maxTouchPoints:0,
    coarsePointer:false,
    hover:true
  });

  if(narrowDesktop.presentation!=='mobile'){
    fail('Narrow Desktop viewport must fall back to Mobile layout.');
  }

  const override=device.classifySignals({
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    platform:'iPhone',
    viewportWidth:390,
    viewportHeight:844,
    maxTouchPoints:5,
    coarsePointer:true,
    hover:false,
    presentationOverride:'desktop'
  });

  if(override.presentation!=='desktop'){
    fail('Explicit presentation override must take precedence.');
  }

  const navStore=new Map();

  const storage={
    getItem(key){
      return navStore.has(key)
        ? navStore.get(key)
        : null;
    },
    setItem(key,value){
      navStore.set(key,String(value));
    },
    removeItem(key){
      navStore.delete(key);
    }
  };

  const navigationBox=execute(
    'src/site/runtime/runtime-navigation-context.js',
    {
      sessionStorage:storage
    }
  );

  const navigation=
    navigationBox.DreamlandNavigationContext;

  navigation.configure({storage});

  navigation.setEditInquiryItem(
    'line-01',
    'MPC001',
    '/inquiry/'
  );

  const editContext=navigation.read();

  if(
    editContext?.mode!=='edit-inquiry-item'||
    editContext?.itemId!=='line-01'||
    editContext?.productId!=='MPC001'||
    editContext?.returnTo!=='/inquiry/'
  ){
    fail('Navigation Context failed cross-document edit state.');
  }

  if(
    navigation.consume('edit-inquiry-item')
      ?.itemId!=='line-01'
  ){
    fail('Navigation Context consume() failed.');
  }

  if(navigation.read()!==null){
    fail('Navigation Context consume() must clear session state.');
  }

  const bootstrap=read(
    'src/site/runtime/runtime-site-bootstrap.js'
  );

  for(const marker of [
    "const VERSION='B7-00B.4J-R1';",
    "const ROUTE_CONTRACT_URL='/data/page-routes.json';",
    'data-dreamland-site-foundation',
    'dreamland:site-foundation-ready',
    'body.dataset.deviceFamily',
    'body.dataset.presentation'
  ]){
    if(!bootstrap.includes(marker)){
      fail('Site Bootstrap is missing foundation marker: '+marker);
    }
  }

  const template=read(
    'src/site/templates/base-page.html'
  );

  for(const marker of [
    '<base href="/">',
    'data-dreamland-page="{{PAGE}}"',
    'data-product-id="{{PRODUCT_ID}}"',
    'id="desktopPageRoot"',
    'id="mobilePageRoot"',
    'meta name="robots" content="noindex,nofollow"',
    'B7-00B.4J R1 generated page shell'
  ]){
    if(!template.includes(marker)){
      fail('Base page template is missing: '+marker);
    }
  }

  const build=read('scripts/build-pages.mjs');

  for(const marker of [
    "product?.status==='active'",
    "path.join(ROOT,'dist')",
    "'multipage-build-manifest.json'",
    "const notFoundFile=path.join("
  ]){
    if(!build.includes(marker)){
      fail('Page builder is missing: '+marker);
    }
  }

  // B7-00B.4J R2.3 — Builder semantic compatibility.
  // R2 reformatted the production manifest but preserved the R1 invariant:
  // generated product page count is owned by activeProducts.length.
  if(
    !/productPages\s*:\s*activeProducts\.length/
      .test(build)
  ){
    fail(
      'Page builder is missing productPages: activeProducts.length semantics.'
    );
  }

  const packageJson=loadJson('package.json');
  const scripts=packageJson.scripts||{};

  if(
    scripts['build:pages']!==
    'node scripts/build-pages.mjs --write'
  ){
    fail('package.json build:pages script is missing.');
  }

  if(
    scripts.build!==
    'npm run data:build && npm run build:pages'
  ){
    fail('package.json build script is missing.');
  }

  if(
    scripts['multipage:foundation']!==
    'node scripts/validate-b7-multipage-foundation.mjs && node scripts/build-pages.mjs --check'
  ){
    fail('package.json multipage:foundation script is missing.');
  }

  if(
    !String(scripts.validate||'')
      .includes('npm run multipage:foundation')
  ){
    fail('Main validation chain must include multipage:foundation.');
  }

  const gitignore=read('.gitignore');

  if(
    !gitignore
      .split(/\r?\n/)
      .includes('/dist/')
  ){
    fail('Generated dist/ must be gitignored in R1.');
  }

  const products=loadJson('data/products.json');
  const active=(products.products||[])
    .filter(product=>product?.status==='active');

  if(!active.length){
    fail('Multipage foundation requires active product records.');
  }

  const ids=new Set();

  for(const product of active){
    const id=String(
      product.productId||
      product.id||
      ''
    ).trim().toUpperCase();

    if(!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(id)){
      fail('Active product has an invalid route id: '+id);
      continue;
    }

    if(ids.has(id)){
      fail('Duplicate active product route id: '+id);
    }

    ids.add(id);
  }
}catch(error){
  fail(
    'Multipage foundation validation crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R1 multipage foundation: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R1 multipage foundation: PASS'
);
console.log(
  'Route / Page Context / Device Profile / Navigation Context / Build contract verified.'
);
console.log('');
