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

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function execute(
  relative,
  extra={}
){
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
    Set,
    Map,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
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
  const index=
    read('index.html');

  for(const marker of [
    "window.DREAMLAND_RELEASE='b7-00b4j-r3-v129';",
    'window.DREAMLAND_MPA_ACTIVE=false;',
    "window.DREAMLAND_PUBLIC_ROUTE_ENTRY=Object.freeze({page:'home',productId:'',pathname:'/'});",
    '<base href="/">',
    '<meta name="robots" content="index,follow"/>',
    '<link rel="canonical" href="https://dreamland-catalog.pages.dev/"/>',
    'runtime-public-navigation.js?release=b7-00b4j-r3-v129',
    'runtime-catalog-url-state.js?release=b7-00b4j-r3-v129',
    'window.DreamlandPublicNavigation',
    'navigateScreen?.(',
    'openProduct?.(',
    'editInquiryItem?.(',
    'applyPublicRouteEntry',
    'window.DreamlandCatalogUrlState'
  ]){
    if(!index.includes(marker)){
      fail(
        'index.html is missing R2 marker: '+
        marker
      );
    }
  }

  if(
    !index.includes(
      '<body data-dreamland-page="home" data-product-id="">'
    )
  ){
    fail(
      'Source index must expose the default Home page marker.'
    );
  }

  const routes=
    json('data/page-routes.json');

  const routeBox=
    execute(
      'src/site/runtime/runtime-route.js'
    );

  const route=
    routeBox.DreamlandRoute;

  route.configure(routes);

  const navStorage=
    new Map();

  const storage={
    getItem(key){
      return navStorage.has(key)
        ? navStorage.get(key)
        : null;
    },
    setItem(key,value){
      navStorage.set(
        key,
        String(value)
      );
    },
    removeItem(key){
      navStorage.delete(key);
    }
  };

  const navContextBox=
    execute(
      'src/site/runtime/runtime-navigation-context.js',
      {
        sessionStorage:storage
      }
    );

  const navContext=
    navContextBox
      .DreamlandNavigationContext;

  navContext.configure({
    storage
  });

  const assigned=[];

  const locationRef={
    pathname:'/products/',
    search:'?series=masterpiece',
    assign(value){
      assigned.push(value);
    },
    replace(value){
      assigned.push(
        'replace:'+value
      );
    }
  };

  const publicNavBox=
    execute(
      'src/site/runtime/runtime-public-navigation.js',
      {
        DreamlandRoute:route,
        DreamlandNavigationContext:
          navContext,
        DREAMLAND_MPA_ACTIVE:true,
        DREAMLAND_PUBLIC_ROUTE_ENTRY:{
          page:'catalog',
          productId:'',
          pathname:'/products/'
        },
        location:locationRef
      }
    );

  const publicNav=
    publicNavBox
      .DreamlandPublicNavigation;

  publicNav.configure({
    route,
    navigationContext:
      navContext,
    locationRef
  });

  if(
    publicNav.href('home')!=='/'
  ){
    fail(
      'Public Navigation home href is incorrect.'
    );
  }

  if(
    publicNav.productHref('mpc001')!==
      '/products/MPC001/'
  ){
    fail(
      'Public Navigation product href is incorrect.'
    );
  }

  publicNav.openProduct(
    'MPC001',
    {
      returnTo:
        '/products/?series=masterpiece'
    }
  );

  if(
    assigned.at(-1)!==
      '/products/MPC001/'
  ){
    fail(
      'Public Navigation did not navigate to the product deep link.'
    );
  }

  const browseContext=
    navContext.read();

  if(
    browseContext?.mode!==
      'browse-product'||
    browseContext?.returnTo!==
      '/products/?series=masterpiece'
  ){
    fail(
      'Product browse return context was not persisted.'
    );
  }

  if(
    publicNav.productBackHref()!==
      '/products/?series=masterpiece'
  ){
    fail(
      'Product back href did not restore Catalog query context.'
    );
  }

  const catalogUrlBox=
    execute(
      'src/site/runtime/runtime-catalog-url-state.js',
      {
        DreamlandRoute:route
      }
    );

  const catalogUrl=
    catalogUrlBox
      .DreamlandCatalogUrlState;

  const parsed=
    catalogUrl.parse(
      '/products/?series=advanced&q=rose&size=S&size=M&sort=price-low'
    );

  if(
    parsed.scope!=='advanced'||
    parsed.query!=='rose'||
    parsed.sort!=='price-low'||
    JSON.stringify(
      [...parsed.sizes]
    )!==
    JSON.stringify(['S','M'])
  ){
    fail(
      'Catalog URL State parser failed.'
    );
  }

  const invalidSort=
    catalogUrl.parse(
      '/products/?sort=not-real'
    );

  if(
    invalidSort.sort!==
      'featured'
  ){
    fail(
      'Catalog URL State must normalize invalid sorts.'
    );
  }

  const home=
    read(
      'src/ui/desktop/home/runtime-desktop-home.js'
    );

  for(const marker of [
    'function upgradePublicLinks()',
    'DreamlandPublicNavigation',
    "actionNode.tagName==='A'",
    'upgradePublicLinks();'
  ]){
    if(!home.includes(marker)){
      fail(
        'Desktop Home public-link migration is missing: '+
        marker
      );
    }
  }

  const catalog=
    read(
      'src/ui/desktop/catalog/runtime-desktop-catalog.js'
    );

  for(const marker of [
    'function upgradePublicProductLinks()',
    'DreamlandPublicNavigation',
    "productButton.tagName==='A'",
    'upgradePublicProductLinks();'
  ]){
    if(!catalog.includes(marker)){
      fail(
        'Desktop Catalog public-link migration is missing: '+
        marker
      );
    }
  }

  const shell=
    read(
      'src/ui/desktop/shell/runtime-desktop-shell.js'
    );

  for(const marker of [
    'function upgradePublicShellLinks',
    'DreamlandPublicNavigation',
    "actionButton.tagName==='A'"
  ]){
    if(!shell.includes(marker)){
      fail(
        'Desktop Shell public-link migration is missing: '+
        marker
      );
    }
  }

  const experience=
    read(
      'src/ui/desktop/runtime-desktop-experience.js'
    );

  if(
    !experience.includes(
      'root.DreamlandDeviceProfile'
    )||
    !experience.includes(
      "profile?.presentation==='desktop'"
    )
  ){
    fail(
      'Desktop Experience must honor the R1 Device Profile during R2 Production routing.'
    );
  }

  const sw=
    read('sw.js');

  for(const marker of [
    "const CACHE_VERSION = 'dreamland-pwa-v129';",
    "'b7-00b4j-r3-v129'"
  ]){
    if(!sw.includes(marker)){
      fail(
        'Service Worker release convergence is missing: '+
        marker
      );
    }
  }

  if(
    sw.includes(
      "['./index.html','./offline.html']"
    )
  ){
    fail(
      'Multi-page navigation must not fall back from a Product URL to Home.'
    );
  }

  if(
    !sw.includes(
      "['./offline.html']"
    )
  ){
    fail(
      'Multi-page navigation requires offline.html fallback.'
    );
  }

  const appConfig=
    json('data/app-config.json');

  if(
    appConfig.privacyUrl!==
      './privacy.html'
  ){
    fail(
      'Source app-config privacyUrl must remain ./privacy.html so the repository target exists.'
    );
  }

  const build=
    read(
      'scripts/build-pages.mjs'
    );

  for(const marker of [
    "const RELEASE='b7-00b4j-r3-v129';",
    "const PWA='dreamland-pwa-v129';",
    'function rewriteProductionAppConfig(){',
    "productionConfig.privacyUrl=",
    "'/privacy/'",
    "product?.status==='active'",
    "path.join(ROOT,'dist')",
    "'multipage-build-manifest.json'",
    "productPages:",
    "const notFoundFile=path.join(",
    'window.DREAMLAND_MPA_ACTIVE=true;',
    "robots:'index,follow'",
    "'noindex,nofollow'"
  ]){
    if(!build.includes(marker)){
      fail(
        'Production page builder is missing: '+
        marker
      );
    }
  }

  const packageJson=
    json('package.json');

  if(
    packageJson.scripts
      ?.['public-route:migration']!==
      'node scripts/validate-b7-public-route-migration.mjs'
  ){
    fail(
      'package.json public-route:migration script is missing.'
    );
  }

  const validate=
    String(
      packageJson.scripts
        ?.validate||
      ''
    );

  const expectedOrder=
    'npm run multipage:foundation && npm run public-route:migration && npm run conversion-route:gateway && npm run desktop:home';

  if(!validate.includes(expectedOrder)){
    fail(
      'R2 validator must run after multipage:foundation, before the R3 conversion gate, and before the Desktop aggregate chain.'
    );
  }

  if(
    !validate.endsWith(
      'npm run desktop:catalog'
    )
  ){
    fail(
      'desktop:catalog must remain the final Desktop aggregate gate.'
    );
  }

  if(
    !validate.includes(
      'npm run desktop:home-assets && npm run desktop:visual-foundation && npm run desktop:inquiry-closure'
    )
  ){
    fail(
      'Historical Desktop Home Assets -> Visual Foundation -> Inquiry Closure order changed.'
    );
  }
}catch(error){
  fail(
    'Public route migration validation crashed: '+
    error.message
  );
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND B7-00B.4J R2 Public Route Migration: FAIL'
  );

  for(const error of errors){
    console.error('- '+error);
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND B7-00B.4J R2 Public Route Migration: PASS'
);
console.log(
  'Home / Catalog / PDP deep links / Catalog URL state / Device Profile / Legacy conversion bridge / PWA navigation contract verified.'
);
console.log('');
