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

function compact(source){
  return String(
    source||
    ''
  ).replace(
    /\s+/g,
    ''
  );
}

function sliceBetween(
  source,
  startMarker,
  endMarker
){
  const start=
    source.indexOf(
      startMarker
    );

  if(start<0){
    return '';
  }

  const end=
    source.indexOf(
      endMarker,
      start+
        startMarker.length
    );

  return end<0
    ? source.slice(start)
    : source.slice(
        start,
        end
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
      `${pathToFileURL(runtimePath).href}?projection-validation=${Date.now()}`
    );

    const feature=
      globalThis.DreamlandInquiry;

    if(!feature){
      fail(
        'runtime-inquiry.js did not expose DreamlandInquiry.'
      );
    }else{
      if(
        feature.version!==
        'B5-05'
      ){
        fail(
          `Unexpected Inquiry runtime version: ${feature.version}`
        );
      }

      for(const method of [
        'configure',
        'getState',
        'itemSubtotal',
        'total',
        'buildViewModel',
        'projectionReady',
        'buildProjection'
      ]){
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
              scent:'rose',
              pattern:'花纹A',
              pack:'',
              qty:20,
              cover:'./p1.webp',
              nested:{
                keep:true
              }
            },
            {
              id:'c1',
              type:'custom',
              use:'品牌活动',
              qty:80,
              budget:'待确认',
              sizePref:'待推荐',
              scent:'花香调',
              color:'红色',
              pack:'定制包装',
              branding:'丝印',
              date:'2026-09',
              note:'备注',
              cover:'./c1.webp'
            }
          ],
          contact:{}
        })
      );

      const state=
        feature.configure({
          storage,
          storageKey:
            'productManualV2State',
          version:2,
          normalizeQuantity(
            value,
            min
          ){
            return Math.max(
              min,
              Math.trunc(
                Number(value)||
                min
              )
            );
          },
          pricingSeriesFor:
            item=>
              item?.series||
              '',
          tierUnitCny:
            ()=>
              10,
          packSurchargeCny:
            ()=>
              0,
          convertCnyToBase:
            value=>
              Number(value)/2,

          projectionText:
            key=>
              `ui:${key}`,

          projectionProductDisplayName:
            item=>
              item?.type==='custom'
                ? `custom:${item.id}`
                : `product:${item.id}`,

          projectionSeriesLabel:
            series=>
              `series:${series}`,

          projectionChoiceLabel:
            value=>
              value
                ? `choice:${value}`
                : '',

          projectionQtyUnit:
            ()=>
              'pcs',

          projectionItemMoq:
            ()=>
              50,

          projectionItemScentLabel:
            item=>
              `scent:${item.scent||''}`,

          projectionDefaultPack:
            ()=>
              '批发包装',

          projectionMoney:
            value=>
              `USD ${Number(value).toFixed(2)}`
        });

      if(
        feature.projectionReady()!==
        true
      ){
        fail(
          'Configured Inquiry projection must report projectionReady().'
        );
      }

      const contact={
        name:'Ada',
        company:'Dreamland'
      };

      const projection=
        feature.buildProjection({
          contact,
          inquiryId:'INQ-1',
          submittedAt:
            '2026-08-18T00:00:00.000Z',
          language:'en',
          privacyVersion:'v1'
        });

      if(
        projection.inquiryId!=='INQ-1'||
        projection.submittedAt!==
          '2026-08-18T00:00:00.000Z'||
        projection.language!=='en'||
        projection.privacyVersion!=='v1'
      ){
        fail(
          'Inquiry projection metadata parity failed.'
        );
      }

      if(
        projection.itemCount!==2||
        projection.productCount!==1||
        projection.customCount!==1||
        projection.products.length!==1||
        projection.customs.length!==1
      ){
        fail(
          'Inquiry projection type/count parity failed.'
        );
      }

      const productProjection=
        projection.products[0];

      if(
        productProjection.previewKey!==
          'product:p1'||
        productProjection.previewValue!==
          '20 pcs · MOQ 50 · M · scent:rose · choice:批发包装 · USD 100.00'||
        productProjection.summaryText!==
          'product:p1（series:classic / CLA001） - 20 pcs，M，scent:rose，choice:花纹A，choice:批发包装，ui:productEstimate USD 100.00'||
        productProjection.subtotal!==100||
        productProjection.subtotalDisplay!==
          'USD 100.00'
      ){
        fail(
          'Product Preview/Submission projection parity failed.'
        );
      }

      const customProjection=
        projection.customs[0];

      if(
        customProjection.previewKey!==
          'choice:品牌活动'||
        !customProjection.previewValue.includes(
          'scent:花香调'
        )||
        !customProjection.summaryText.includes(
          'scent:花香调'
        )||
        customProjection.previewValue.includes(
          '||ui('
        )||
        customProjection.summaryText.includes(
          '||ui('
        )
      ){
        fail(
          'Custom projection must emit clean scent presentation.'
        );
      }

      if(
        projection.estimatedTotal!==100||
        projection.estimatedTotalDisplay!==
          'USD 100.00'
      ){
        fail(
          'Inquiry projection estimated amount parity failed.'
        );
      }

      if(
        projection.itemsSummary!==
          (
            productProjection.summaryText+
            '\n'+
            customProjection.summaryText
          )
      ){
        fail(
          'itemsSummary must delimit item summaries with a newline.'
        );
      }

      if(
        projection.rawProductItems[0]
          .unitPrice!==undefined||
        projection.rawProductItems[0]
          .subtotal!==undefined||
        projection.rawProductItems[0]
          .nested?.keep!==true||
        projection.rawCustomItems[0]
          .use!=='品牌活动'
      ){
        fail(
          'Raw product/custom projection snapshots changed payload semantics.'
        );
      }

      if(
        projection.snapshotItems[0].type!==
          'product'||
        projection.snapshotItems[0].productId!==
          'CLA001'||
        projection.snapshotItems[0].name!==
          'product:p1'||
        projection.snapshotItems[0].qty!==20||
        projection.snapshotItems[0].size!=='M'||
        projection.snapshotItems[0].cover!==
          './p1.webp'||
        projection.snapshotItems[1].type!==
          'custom'||
        projection.snapshotItems[1].name!==
          'custom:c1'||
        projection.snapshotItems[1].size!==
          '待推荐'
      ){
        fail(
          'Submission archive projection parity failed.'
        );
      }

      if(
        projection.contact===
        contact||
        projection.rawProductItems[0]===
        state.items[0]||
        projection.rawCustomItems[0]===
        state.items[1]
      ){
        fail(
          'Inquiry projection must snapshot Contact/raw item inputs.'
        );
      }

      if(
        !Object.isFrozen(projection)||
        !Object.isFrozen(projection.items)||
        !Object.isFrozen(projection.products)||
        !Object.isFrozen(projection.customs)||
        !Object.isFrozen(projection.contact)||
        !Object.isFrozen(projection.rawProductItems[0])||
        !Object.isFrozen(projection.snapshotItems[0])
      ){
        fail(
          'Inquiry projection snapshots must be frozen.'
        );
      }

      const oldSubtotal=
        projection.products[0]
          .subtotal;

      state.items[0].qty=40;

      const nextProjection=
        feature.buildProjection({
          contact,
          inquiryId:'INQ-2'
        });

      if(
        oldSubtotal!==100||
        projection.products[0].subtotal!==100||
        nextProjection.products[0].subtotal!==200||
        nextProjection.estimatedTotal!==200
      ){
        fail(
          'Projection snapshot stability / fresh pricing derivation failed.'
        );
      }
    }
  }catch(error){
    fail(
      `Inquiry projection execution failed: ${error.message}`
    );
  }
}

try{
  const runtimeSource=
    read(
      'src/features/inquiry/runtime-inquiry.js'
    );

  if(
    runtimeSource.includes(
      'legacyScentSuffix'
    )
  ){
    fail(
      'Inquiry Projection must not expose the legacy Custom scent fallback token.'
    );
  }

  for(const forbidden of [
    'document.',
    'querySelector(',
    'innerHTML',
    'DreamlandSubmission',
    'DreamlandRisk',
    'DreamlandInquiryRenderer',
    'previewContent',
    'privacyConsent',
    'hcaptcha'
  ]){
    if(
      runtimeSource.includes(
        forbidden
      )
    ){
      fail(
        `Inquiry Projection crossed the Feature boundary: ${forbidden}`
      );
    }
  }

  for(const required of [
    'function projectionReady(',
    'function buildProjection(',
    'function buildProductProjection(',
    'function buildCustomProjection(',
    'projectionProductDisplayName',
    'projectionItemMoq',
    'projectionMoney'
  ]){
    if(
      !runtimeSource.includes(
        required
      )
    ){
      fail(
        `Inquiry Projection runtime source is missing: ${required}`
      );
    }
  }
}catch(error){
  fail(
    `Inquiry Projection runtime source inspection failed: ${error.message}`
  );
}

try{
  const indexSource=
    read(
      'index.html'
    );

  const compactIndex=
    compact(
      indexSource
    );

  for(const marker of [
    'projectionText:ui',
    'projectionProductDisplayName:productDisplayName',
    'projectionSeriesLabel:seriesLabel',
    'projectionChoiceLabel:choiceLabel',
    'projectionQtyUnit:qtyUnit',
    'projectionItemMoq:itemMoq',
    'projectionItemScentLabel:itemScentLabel',
    'projectionDefaultPack:defaultPack',
    'projectionMoney:money'
  ]){
    if(
      !compactIndex.includes(
        compact(
          marker
        )
      )
    ){
      fail(
        `index.html is missing Inquiry Projection adapter: ${marker}`
      );
    }
  }

  if(
    compactIndex.includes(
      'functionitemText('
    )
  ){
    fail(
      'Legacy itemText() must be removed in B5-05.'
    );
  }

  const previewSource=
    sliceBetween(
      indexSource,
      'function renderPreview(){',
      'function buildWeb3FormsPayload('
    );

  const payloadSource=
    sliceBetween(
      indexSource,
      'function buildWeb3FormsPayload(',
      'function submissionSnapshot('
    );

  const snapshotSource=
    sliceBetween(
     indexSource,
     'function submissionSnapshot(',
     'function resetSubmittedFormUi('
    );

  for(const [
    name,
    source,
    required
  ] of [
    [
      'renderPreview',
      previewSource,
      [
        'inquiryFeature.buildProjection(',
        'projection.products',
        'projection.customs',
        'projection.estimatedTotalDisplay',
        'requestAnimationFrame(assessSubmissionRisk)'
      ]
    ],
    [
      'buildWeb3FormsPayload',
      payloadSource,
      [
        'inquiryFeature.buildProjection(',
        'submissionPayloadPolicy.build('
      ]
    ],
    [
      'submissionSnapshot',
      snapshotSource,
      [
        'inquiryFeature.buildProjection(',
        'projection.snapshotItems',
        'projection.estimatedTotal',
        'projection.estimatedTotalDisplay'
      ]
    ]
  ]){
    const compactSource=
      compact(
        source
      );

    if(!source){
      fail(
        `${name}() could not be isolated.`
      );
      continue;
    }

    for(const marker of required){
      if(
        !compactSource.includes(
          compact(
            marker
          )
        )
      ){
        fail(
          `${name}() is missing the B5-05 Projection contract: ${marker}`
        );
      }
    }

    for(const forbidden of [
      'state.items',
      '.filter(i=>i.type===',
      '.map(itemText)',
      'itemSubtotal(',
      'total()'
    ]){
      if(
        compactSource.includes(
          compact(
            forbidden
          )
        )
      ){
        fail(
          `${name}() still re-interprets Inquiry state/pricing directly: ${forbidden}`
        );
      }
    }
  }

  for(const preserved of [
    'function itemSubtotal(',
    'function total(',
    'function kv(',
    'function collect(',
    'async function assessSubmissionRisk(',
    'async function submitInquiry('
  ]){
    if(
      !compactIndex.includes(
        compact(
          preserved
        )
      )
    ){
      fail(
        `B5-05 must preserve App/Pricing compatibility ownership: ${preserved}`
      );
    }
  }
}catch(error){
  fail(
    `index.html B5-05 Projection inspection failed: ${error.message}`
  );
}

try{
  const uiValidator=
    read(
      'scripts/validate-inquiry-ui-renderer-boundary.mjs'
    );

  if(
    uiValidator.includes(
      'dreamland-pwa-v75'
    )
  ){
    fail(
      'Historical B5-04 validator still owns B5-05 cache version: dreamland-pwa-v75'
    );
  }
}catch(error){
  fail(
    `Historical B5-04 validator inspection failed: ${error.message}`
  );
}

try{
  const swSource=
    read(
      'sw.js'
    );

  

  const inquiryMatches=
    swSource.match(
      /'\.\/src\/features\/inquiry\/runtime-inquiry\.js'/g
    )||[];

  if(
    inquiryMatches.length!==1
  ){
    fail(
      `sw.js must retain runtime-inquiry.js exactly once; found ${inquiryMatches.length}.`
    );
  }

  const rendererMatches=
    swSource.match(
      /'\.\/src\/ui\/inquiry\/runtime-inquiry-renderer\.js'/g
    )||[];

  if(
    rendererMatches.length!==1
  ){
    fail(
      `sw.js must retain runtime-inquiry-renderer.js exactly once; found ${rendererMatches.length}.`
    );
  }
}catch(error){
  fail(
    `B5-05 SW inspection failed: ${error.message}`
  );
}

try{
  const packageJson=
    JSON.parse(
      read(
        'package.json'
      )
    );

  if(
    packageJson.scripts
      ?.['inquiry-projection:boundary']!==
      'node scripts/validate-inquiry-projection-boundary.mjs'
  ){
    fail(
      'package.json is missing inquiry-projection:boundary.'
    );
  }

  if(
    !String(
      packageJson.scripts
        ?.validate||
      ''
    ).includes(
      'npm run inquiry-ui:boundary && npm run inquiry-projection:boundary'
    )
  ){
    fail(
      'B5-05 Projection validator must run after B5-04 UI Renderer validation.'
    );
  }
}catch(error){
  fail(
    `package.json B5-05 inspection failed: ${error.message}`
  );
}

if(errors.length){
  console.error(
    '\nInquiry Preview / Projection boundary validation failed:\n'
  );

  for(const error of errors){
    console.error(
      `- ${error}`
    );
  }

  process.exit(1);
}

console.log(
  'Inquiry Preview / Projection boundary validation: PASS'
);
