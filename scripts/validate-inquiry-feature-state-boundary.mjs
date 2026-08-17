#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const errors=[];

function fail(message){
  errors.push(message);
}

function read(relativePath){
  return fs.readFileSync(
    path.join(
      ROOT,
      relativePath
    ),
    'utf8'
  );
}

const runtimePath=
  path.join(
    ROOT,
    'src/features/inquiry/runtime-inquiry.js'
  );

if(!fs.existsSync(runtimePath)){
  fail(
    'Inquiry runtime feature is missing.'
  );
}else{
  try{
    delete globalThis.DreamlandInquiry;

    await import(
      `${pathToFileURL(runtimePath).href}?inquiry-validation=${Date.now()}`
    );

    const feature=
      globalThis.DreamlandInquiry;

    if(!feature){
      fail(
        'runtime-inquiry.js did not expose DreamlandInquiry.'
      );
    }else{
      if(feature.version!=='B5-01'){
        fail(
          `Unexpected Inquiry runtime version: ${feature.version}`
        );
      }

      for(
        const method of [
          'configure',
          'getState',
          'items',
          'snapshot',
          'persist',
          'findItem',
          'addOrMergeProduct',
          'mergeDuplicateProducts',
          'replaceItem',
          'setProductQuantity',
          'removeItem',
          'clearItems',
          'addCustom'
        ]
      ){
        if(
          typeof feature[method]!==
          'function'
        ){
          fail(
            `DreamlandInquiry.${method} is missing.`
          );
        }
      }

      const memory=
        new Map();

      const storage={
        getItem(key){
          return memory.has(key)
            ? memory.get(key)
            : null;
        },
        setItem(key,value){
          memory.set(
            key,
            String(value)
          );
        }
      };

      memory.set(
        'productManualV2State',
        JSON.stringify({
          version:2,
          items:[
            {
              id:'p1',
              type:'product',
              productId:'CLA001',
              series:'classic',
              size:'M',
              scentId:'S01',
              pattern:'P01',
              pack:'批发包装',
              qty:10
            }
          ],
          contact:{
            name:'legacy-contact'
          }
        })
      );

      const identityKey=
        item=>[
          item.type,
          item.productId,
          item.series,
          item.size,
          item.scentId,
          item.pattern,
          item.pack
        ].join('|');

      const normalizeQuantity=
        (
          value,
          min=1
        )=>
          Math.min(
            100,
            Math.max(
              min,
              Math.trunc(
                Number(value)||
                min
              )
            )
          );

      const state=
        feature.configure({
          storage,
          storageKey:
            'productManualV2State',
          version:2,
          identityKey,
          normalizeQuantity
        });

      if(
        state!==
          feature.getState()||
        state.items.length!==1||
        state.contact.name!==
          'legacy-contact'
      ){
        fail(
          'Inquiry v2 state hydration/reference parity failed.'
        );
      }

      feature.addOrMergeProduct({
        id:'p2',
        type:'product',
        productId:'CLA001',
        series:'classic',
        size:'M',
        scentId:'S01',
        pattern:'P01',
        pack:'批发包装',
        qty:5
      });

      if(
        state.items.length!==1||
        state.items[0].qty!==15
      ){
        fail(
          'Inquiry product add/merge parity failed.'
        );
      }

      feature.addOrMergeProduct({
        id:'p3',
        type:'product',
        productId:'CLA002',
        series:'classic',
        size:'M',
        scentId:'S01',
        pattern:'P01',
        pack:'批发包装',
        qty:7
      });

      feature.addCustom({
        id:'c1',
        type:'custom',
        qty:50
      });

      if(
        state.items.length!==3
      ){
        fail(
          'Inquiry product/custom insertion parity failed.'
        );
      }

      feature.setProductQuantity(
        'p1',
        123,
        1
      );

      if(
        feature.findItem('p1')
          ?.qty!==100
      ){
        fail(
          'Inquiry quantity normalization delegation failed.'
        );
      }

      feature.replaceItem(
        'p3',
        {
          id:'p3',
          type:'product',
          productId:'CLA003',
          series:'classic',
          size:'L',
          scentId:'S02',
          pattern:'P02',
          pack:'精品包装',
          qty:20
        }
      );

      if(
        feature.findItem('p3')
          ?.productId!=='CLA003'
      ){
        fail(
          'Inquiry replaceItem parity failed.'
        );
      }

      state.items.push({
        id:'p4',
        type:'product',
        productId:'CLA003',
        series:'classic',
        size:'L',
        scentId:'S02',
        pattern:'P02',
        pack:'精品包装',
        qty:10
      });

      feature.mergeDuplicateProducts();

      if(
        state.items.filter(
          item=>
            item.type==='product'&&
            item.productId==='CLA003'
        ).length!==1||
        feature.findItem('p3')
          ?.qty!==30
      ){
        fail(
          'Inquiry duplicate consolidation parity failed.'
        );
      }

      feature.removeItem(
        'c1'
      );

      if(
        feature.findItem(
          'c1'
        )!==null
      ){
        fail(
          'Inquiry removeItem parity failed.'
        );
      }

      state.contact={
        name:'ephemeral'
      };

      const persisted=
        feature.persist();

      const stored=
        JSON.parse(
          memory.get(
            'productManualV2State'
          )
        );

      if(
        persisted.contact?.name||
        stored.contact?.name||
        stored.version!==2||
        !Array.isArray(
          stored.items
        )
      ){
        fail(
          'Inquiry persistence must preserve v2 items while excluding contact.'
        );
      }

      const beforeClear=
        state.items;

      feature.clearItems();

      if(
        state.items!==beforeClear||
        state.items.length!==0
      ){
        fail(
          'Inquiry clearItems must preserve the compatibility array reference.'
        );
      }

      memory.set(
        'productManualV2State',
        JSON.stringify({
          version:1,
          items:[
            {id:'legacy'}
          ],
          contact:{}
        })
      );

      const reset=
        feature.configure({
          storage,
          storageKey:
            'productManualV2State',
          version:2,
          identityKey,
          normalizeQuantity
        });

      if(
        reset.version!==2||
        reset.items.length!==0
      ){
        fail(
          'Inquiry state version-reset parity failed.'
        );
      }
    }
  }catch(error){
    fail(
      `Inquiry runtime execution failed: ${error.message}`
    );
  }
}

try{
  const runtimeSource=
    read(
      'src/features/inquiry/runtime-inquiry.js'
    );

  for(
    const forbidden of [
      'document.',
      'querySelector(',
      'innerHTML',
      'DreamlandSubmission',
      'DreamlandRisk',
      'window.hcaptcha'
    ]
  ){
    if(
      runtimeSource.includes(
        forbidden
      )
    ){
      fail(
        `Inquiry state runtime crossed its UI/service boundary: ${forbidden}`
      );
    }
  }
}catch(error){
  fail(
    `Inquiry runtime source inspection failed: ${error.message}`
  );
}

try{
  const indexSource=
    read('index.html');

  const compact=
    indexSource.replace(
      /\s+/g,
      ''
    );

  for(
    const marker of [
      './src/features/inquiry/runtime-inquiry.js',
      'const inquiryFeature=window.DreamlandInquiry',
      'inquiryFeature.configure(',
      'identityKey:productIdentityKey',
      'normalizeQuantity:normalizeQty',
      'inquiryFeature.persist(',
      'inquiryFeature.addOrMergeProduct(',
      'inquiryFeature.mergeDuplicateProducts(',
      'inquiryFeature.replaceItem(',
      'inquiryFeature.setProductQuantity(',
      'inquiryFeature.removeItem(',
      'inquiryFeature.clearItems(',
      'inquiryFeature.addCustom('
    ]
  ){
    if(
      !compact.includes(
        marker.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `index.html is missing Inquiry state integration: ${marker}`
      );
    }
  }

  for(
    const legacy of [
      'JSON.parse(appStorage.local.getItem(STORAGE_KEY)',
      'appStorage.local.setItem(STORAGE_KEY',
      'state.items.push(',
      'state.items=[]',
      'state.items=state.items.filter(',
      'state.items[index]=item'
    ]
  ){
    if(
      compact.includes(
        legacy.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `index.html still directly owns Inquiry item-state mutation/persistence: ${legacy}`
      );
    }
  }

  for(
    const preserved of [
      'function renderInquiry(',
      'function updateInquiryDynamicUi(',
      'function renderItem(',
      'function itemUnit(',
      'function itemSubtotal(',
      'function total(',
      'function buildWeb3FormsPayload(',
      'async function assessSubmissionRisk(',
      'async function submitInquiry(',
      'function collect(',
      'state.contact=contact'
    ]
  ){
    if(
      !compact.includes(
        preserved.replace(
          /\s+/g,
          ''
        )
      )
    ){
      fail(
        `B5-01 must preserve Inquiry UI/pricing/contact/submission ownership: ${preserved}`
      );
    }
  }
}catch(error){
  fail(
    `index.html Inquiry state boundary inspection failed: ${error.message}`
  );
}

try{
  const manifest=
    (await import(
      pathToFileURL(
        path.join(
          ROOT,
          'src/features/manifest.js'
        )
      ).href+
      `?manifest-validation=${Date.now()}`
    )).FEATURE_MANIFEST;

  const enabled=
    manifest.filter(
      item=>
        item.runtimeEnabled===true
    );

  const inquiry=
    manifest.find(
      item=>
        item.id==='inquiry'
    );

  if(
    enabled.length!==1||
    enabled[0]?.id!=='inquiry'||
    inquiry?.status!=='partial'||
    inquiry?.runtimeOwner!==
      'src/features/inquiry/runtime-inquiry.js'
  ){
    fail(
      'Feature manifest must runtime-enable only partial Inquiry in B5-01.'
    );
  }
}catch(error){
  fail(
    `Feature manifest Inquiry inspection failed: ${error.message}`
  );
}

try{
  const legacyMapSource=
    read(
      'src/app/legacy-map.js'
    );

  if(
    !legacyMapSource.includes(
      "'src/features/inquiry/runtime-inquiry.js'"
    )||
    !legacyMapSource.includes(
      "status:'partial'"
    )
  ){
    fail(
      'Legacy map does not describe partial Inquiry runtime ownership.'
    );
  }
}catch(error){
  fail(
    `Legacy map Inquiry inspection failed: ${error.message}`
  );
}

try{
  const riskValidator=
    read(
      'scripts/validate-risk-service-boundary.mjs'
    );

  if(
    riskValidator.includes(
      'dreamland-pwa-v71'
    )
  ){
    fail(
      'Historical B4-02 validator still owns fixed SW cache v71.'
    );
  }

  const swSource=
    read('sw.js');

  if(
    !swSource.includes(
      "const CACHE_VERSION = 'dreamland-pwa-v72';"
    )
  ){
    fail(
      'sw.js cache version must be dreamland-pwa-v72 for B5-01.'
    );
  }

  const matches=
    swSource.match(
      /'\.\/src\/features\/inquiry\/runtime-inquiry\.js'/g
    )||[];

  if(matches.length!==1){
    fail(
      `sw.js APP_SHELL must include runtime-inquiry.js exactly once; found ${matches.length}.`
    );
  }
}catch(error){
  fail(
    `SW/historical-validator Inquiry inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nInquiry feature state boundary validation failed:\n'
  );

  for(
    const error of errors
  ){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Inquiry feature state boundary validation: PASS'
);
