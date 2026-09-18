#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url)
  ),
  '..'
);

const SOURCE_MODE=
  process.argv.includes('--source');

const DIST_MODE=
  process.argv.includes('--dist');

if(SOURCE_MODE===DIST_MODE){
  console.error(
    'Usage: node scripts/validate-f3-e-conversion-closeout.mjs --source|--dist'
  );
  process.exit(1);
}

const errors=[];

function fail(message){
  errors.push(message);
}

function read(relative){
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  ).replace(
    /\r\n?/g,
    '\n'
  );
}

function json(relative){
  return JSON.parse(
    read(relative)
  );
}

function exists(relative){
  return fs.existsSync(
    path.join(
      ROOT,
      relative
    )
  );
}

function hash(relative){
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(
        path.join(
          ROOT,
          relative
        )
      )
    )
    .digest('hex');
}

function requireMarkers(
  label,
  source,
  markers
){
  for(const marker of markers){
    if(!source.includes(marker)){
      fail(
        label+
        ' is missing: '+
        marker
      );
    }
  }
}

function assertOrder(
  label,
  source,
  markers
){
  let cursor=-1;

  for(const marker of markers){
    const index=
      source.indexOf(
        marker
      );

    if(
      index<0||
      index<=cursor
    ){
      fail(
        label+
        ' order is invalid around: '+
        marker
      );
      return;
    }

    cursor=index;
  }
}

function runGate(
  relative,
  mode,
  label
){
  if(!exists(relative)){
    fail(
      label+
      ' gate is missing: '+
      relative
    );
    return;
  }

  const result=
    spawnSync(
      process.execPath,
      [
        path.join(
          ROOT,
          relative
        ),
        mode
      ],
      {
        cwd:ROOT,
        encoding:'utf8',
        timeout:120000
      }
    );

  if(
    result.error||
    result.status!==0
  ){
    fail(
      label+
      ' did not pass.\n'+
      String(
        result.stderr||
        result.stdout||
        result.error?.message||
        ''
      ).trim()
    );
  }
}

function identity(
  isolated,
  production,
  label
){
  if(
    !exists(isolated)||
    !exists(production)
  ){
    fail(
      label+
      ' artifact pair is missing: '+
      isolated+
      ' / '+
      production
    );
    return;
  }

  if(
    hash(isolated)!==
    hash(production)
  ){
    fail(
      label+
      ' isolated/Production artifacts are not byte-identical: '+
      production
    );
  }
}

if(SOURCE_MODE){
  /*
   * Re-run the final contract of every completed F3 stage.
   * This makes F3-E useful as a standalone release closeout command rather
   * than merely trusting package.json ordering.
   */
  for(const gate of [
    [
      'scripts/validate-r4-11b4-1ec4-commercial-closeout.mjs',
      '--source',
      'Commercial baseline'
    ],
    [
      'scripts/validate-f3-a2-inquiry-conversion-composition.mjs',
      '--source',
      'F3-A Inquiry composition'
    ],
    [
      'scripts/validate-f3-b5-interaction-closeout.mjs',
      '--source',
      'F3-B Interaction closeout'
    ],
    [
      'scripts/validate-f3-c4-contact-closeout.mjs',
      '--source',
      'F3-C Contact closeout'
    ],
    [
      'scripts/validate-f3-d4-review-submission-closeout.mjs',
      '--source',
      'F3-D Review/Submission closeout'
    ]
  ]){
    runGate(
      gate[0],
      gate[1],
      gate[2]
    );
  }

  try{
    const routes=
      json(
        'data/page-routes.json'
      )
        .routes||
      {};

    const expected={
      product:{
        path:'/products/{productId}/',
        public:true,
        dynamic:'productId'
      },
      custom:{
        path:'/custom/',
        public:true
      },
      inquiry:{
        path:'/inquiry/',
        public:false
      },
      contact:{
        path:'/inquiry/contact/',
        public:false,
        guard:'hasInquiry'
      },
      review:{
        path:'/inquiry/review/',
        public:false,
        guard:'hasValidContact'
      },
      success:{
        path:'/inquiry/success/',
        public:false,
        guard:'hasLastSubmission'
      }
    };

    for(const [
      name,
      contract
    ] of Object.entries(
      expected
    )){
      const route=
        routes[name]||
        {};

      for(const [
        key,
        value
      ] of Object.entries(
        contract
      )){
        if(route[key]!==value){
          fail(
            'F3-E route contract changed: '+
            name+
            '.'+
            key+
            '='+
            String(
              route[key]
            )
          );
        }
      }
    }
  }catch(error){
    fail(
      'F3-E route inspection failed: '+
      error.message
    );
  }

  /*
   * One persisted owner per lifecycle stage.
   */
  try{
    const inquiry=
      read(
        'src/astro/lib/inquiry-view-model.mjs'
      );

    const contact=
      read(
        'src/astro/lib/contact-view-model.mjs'
      );

    const review=
      read(
        'src/astro/lib/review-view-model.mjs'
      );

    const success=
      read(
        'src/astro/lib/success-view-model.mjs'
      );

    requireMarkers(
      'Inquiry state owner',
      inquiry,
      [
        "'productManualV2State'",
        'inquiryVersion:2'
      ]
    );

    requireMarkers(
      'Contact draft owner',
      contact,
      [
        "'dreamlandContactDraftV1'",
        "'productManualV2State'"
      ]
    );

    requireMarkers(
      'Review lifecycle owners',
      review,
      [
        "'dreamlandPendingInquiryIdV1'",
        'submissionAttemptKey'
      ]
    );

    requireMarkers(
      'Success archive owner',
      success,
      [
        "'dreamlandLastSubmissionV1'",
        "'hasLastSubmission'"
      ]
    );

    const config=
      json(
        'data/app-config.json'
      );

    if(
      config.submissionAttemptKey!==
        'dreamlandSubmissionAttemptV1'||
      config.submissionTransport!==
        'web3forms-direct'
    ){
      fail(
        'F3-E Submission persistence/transport contract changed.'
      );
    }
  }catch(error){
    fail(
      'F3-E state ownership inspection failed: '+
      error.message
    );
  }

  /*
   * Navigation ownership must remain staged, not duplicated.
   */
  try{
    const inquiry=
      read(
        'src/astro/lib/inquiry-view-model.mjs'
      );

    const contact=
      read(
        'src/astro/lib/contact-view-model.mjs'
      );

    const review=
      read(
        'src/astro/runtime/review-runtime.js'
      );

    const success=
      read(
        'src/astro/lib/success-view-model.mjs'
      );

    requireMarkers(
      'Inquiry -> Contact',
      inquiry,
      [
        "'/inquiry/contact/'"
      ]
    );

    requireMarkers(
      'Contact -> Review',
      contact,
      [
        "'/inquiry/review/'",
        "'hasInquiry'"
      ]
    );

    requireMarkers(
      'Review -> Success',
      review,
      [
        "'/inquiry/success/'",
        'submissionFlow.submit({'
      ]
    );

    requireMarkers(
      'Success next routes',
      success,
      [
        "'/products/'",
        "'/custom/'",
        "'hasLastSubmission'"
      ]
    );
  }catch(error){
    fail(
      'F3-E navigation ownership inspection failed: '+
      error.message
    );
  }

  /*
   * Globalization remains EN/ZH/KO across the funnel.
   */
  try{
    const routes=
      json(
        'data/page-routes.json'
      );

    if(
      JSON.stringify(
        routes.localePrefix
          ?.supported
      )!==
      JSON.stringify([
        'en',
        'zh',
        'ko'
      ])
    ){
      fail(
        'F3-E locale support changed from EN/ZH/KO.'
      );
    }

    for(const relative of [
      'src/astro/lib/inquiry-view-model.mjs',
      'src/astro/lib/contact-view-model.mjs',
      'src/astro/lib/review-view-model.mjs',
      'src/astro/lib/success-view-model.mjs'
    ]){
      if(!exists(relative)){
        fail(
          'F3-E locale owner is missing: '+
          relative
        );
      }
    }
  }catch(error){
    fail(
      'F3-E localization inspection failed: '+
      error.message
    );
  }

  try{
    const pkg=
      json(
        'package.json'
      );

    if(
      pkg.scripts
        ?.['r4:conversion:closeout']!==
      'node scripts/validate-f3-e-conversion-closeout.mjs --source'
    ){
      fail(
        'package.json is missing r4:conversion:closeout.'
      );
    }

    if(
      pkg.scripts
        ?.['r4:conversion:closeout:dist']!==
      'node scripts/validate-f3-e-conversion-closeout.mjs --dist'
    ){
      fail(
        'package.json is missing r4:conversion:closeout:dist.'
      );
    }

    assertOrder(
      'F3 source closeout topology',
      String(
        pkg.scripts
          ?.validate||
        ''
      ),
      [
        'npm run r4:conversion:interaction-closeout',
        'npm run r4:conversion:contact-closeout',
        'npm run r4:conversion:review-submission-closeout',
        'npm run r4:astro:success-runtime',
        'npm run r4:conversion:closeout',
        'npm run r4:production:home:contract'
      ]
    );

    assertOrder(
      'F3 Production closeout topology',
      String(
        pkg.scripts
          ?.build||
        ''
      ),
      [
        'npm run r4:conversion:interaction-closeout:dist',
        'npm run r4:conversion:contact-closeout:dist',
        'npm run r4:conversion:review-submission-closeout:dist',
        'npm run r4:conversion:closeout:dist'
      ]
    );
  }catch(error){
    fail(
      'F3-E package topology failed: '+
      error.message
    );
  }
}

if(DIST_MODE){
  /*
   * Final stage dist gates must still pass before release identity checks.
   */
  for(const gate of [
    [
      'scripts/validate-r4-11b4-1ec4-commercial-closeout.mjs',
      '--dist',
      'Commercial Production baseline'
    ],
    [
      'scripts/validate-f3-a2-inquiry-conversion-composition.mjs',
      '--dist',
      'F3-A Production composition'
    ],
    [
      'scripts/validate-f3-b5-interaction-closeout.mjs',
      '--dist',
      'F3-B Production interaction closeout'
    ],
    [
      'scripts/validate-f3-c4-contact-closeout.mjs',
      '--dist',
      'F3-C Production Contact closeout'
    ],
    [
      'scripts/validate-f3-d4-review-submission-closeout.mjs',
      '--dist',
      'F3-D Production Review/Submission closeout'
    ]
  ]){
    runGate(
      gate[0],
      gate[1],
      gate[2]
    );
  }

  try{
    const routePairs=[
      [
        '.r4-astro-dist/custom/index.html',
        'dist/custom/index.html',
        'Custom'
      ],
      [
        '.r4-astro-dist/inquiry/index.html',
        'dist/inquiry/index.html',
        'Inquiry'
      ],
      [
        '.r4-astro-dist/inquiry/contact/index.html',
        'dist/inquiry/contact/index.html',
        'Contact'
      ],
      [
        '.r4-astro-dist/inquiry/review/index.html',
        'dist/inquiry/review/index.html',
        'Review'
      ],
      [
        '.r4-astro-dist/inquiry/success/index.html',
        'dist/inquiry/success/index.html',
        'Success'
      ],
      [
        '.r4-astro-dist/r4-pdp-runtime.js',
        'dist/r4-pdp-runtime.js',
        'PDP runtime'
      ],
      [
        '.r4-astro-dist/r4-custom-runtime.js',
        'dist/r4-custom-runtime.js',
        'Custom runtime'
      ],
      [
        '.r4-astro-dist/r4-inquiry-runtime.js',
        'dist/r4-inquiry-runtime.js',
        'Inquiry runtime'
      ],
      [
        '.r4-astro-dist/r4-contact-runtime.js',
        'dist/r4-contact-runtime.js',
        'Contact runtime'
      ],
      [
        '.r4-astro-dist/r4-review-runtime.js',
        'dist/r4-review-runtime.js',
        'Review runtime'
      ],
      [
        '.r4-astro-dist/r4-success-runtime.js',
        'dist/r4-success-runtime.js',
        'Success runtime'
      ]
    ];

    for(const [
      isolated,
      production,
      label
    ] of routePairs){
      identity(
        isolated,
        production,
        label
      );
    }

    const products=
      json(
        'data/products.json'
      )
        .products||
      [];

    const active=
      products.filter(
        product=>
          product?.status===
          'active'
      );

    if(active.length!==89){
      fail(
        'F3-E expected 89 active PDPs; found '+
        active.length+
        '.'
      );
    }

    for(const product of active){
      const id=
        String(
          product?.productId||
          product?.id||
          ''
        )
          .trim()
          .toUpperCase();

      if(!id){
        fail(
          'F3-E active Product is missing an ID.'
        );
        continue;
      }

      identity(
        path.join(
          '.r4-astro-dist',
          'products',
          id,
          'index.html'
        ),
        path.join(
          'dist',
          'products',
          id,
          'index.html'
        ),
        'PDP '+id
      );
    }
  }catch(error){
    fail(
      'F3-E Production identity inspection failed: '+
      error.message
    );
  }

  try{
    const markers=[
      [
        'dist/custom/index.html',
        'data-r4-astro-custom="true"'
      ],
      [
        'dist/inquiry/index.html',
        'data-r4-astro-inquiry="true"'
      ],
      [
        'dist/inquiry/contact/index.html',
        'data-r4-astro-contact="true"'
      ],
      [
        'dist/inquiry/review/index.html',
        'data-r4-astro-review="true"'
      ],
      [
        'dist/inquiry/success/index.html',
        'data-r4-astro-success="true"'
      ]
    ];

    for(const [
      relative,
      marker
    ] of markers){
      if(!exists(relative)){
        fail(
          'F3-E Production route is missing: '+
          relative
        );
        continue;
      }

      if(
        !read(relative)
          .includes(
            marker
          )
      ){
        fail(
          'F3-E Production route owner regressed: '+
          relative
        );
      }
    }
  }catch(error){
    fail(
      'F3-E Production route marker inspection failed: '+
      error.message
    );
  }

  try{
    const manifest=
      json(
        'dist/multipage-build-manifest.json'
      );

    const owners=[
      'pdpOwner',
      'customOwner',
      'inquiryOwner',
      'contactOwner',
      'reviewOwner',
      'successOwner'
    ];

    for(const key of owners){
      if(manifest[key]!=='astro'){
        fail(
          'F3-E Production owner changed: '+
          key+
          '='+
          String(
            manifest[key]
          )
        );
      }
    }

    const cutovers={
      pdp:[
        'B7-00B.4J-R4.5C',
        'astro-r4.5c'
      ],
      custom:[
        'B7-00B.4J-R4.6C',
        'astro-r4.6c'
      ],
      inquiry:[
        'B7-00B.4J-R4.7C',
        'astro-r4.7c'
      ],
      contact:[
        'B7-00B.4J-R4.8C',
        'astro-r4.8c'
      ],
      review:[
        'B7-00B.4J-R4.9D',
        'astro-r4.9d'
      ],
      success:[
        'B7-00B.4J-R4.10C',
        'astro-r4.10c'
      ]
    };

    for(const [
      name,
      values
    ] of Object.entries(
      cutovers
    )){
      if(
        manifest[
          name+
          'Cutover'
        ]!==
          values[0]||
        manifest.presentationOverrides
          ?.[name]!==
          values[1]
      ){
        fail(
          'F3-E Production cutover changed: '+
          name
        );
      }
    }
  }catch(error){
    fail(
      'F3-E Production manifest inspection failed: '+
      error.message
    );
  }
}

if(errors.length){
  console.error('');
  console.error(
    'DREAMLAND F3-E CONVERSION CLOSEOUT: FAIL'
  );

  for(const error of errors){
    console.error(
      '- '+
      error
    );
  }

  console.error('');
  process.exit(1);
}

console.log('');
console.log(
  'DREAMLAND F3-E CONVERSION CLOSEOUT: PASS'
);
console.log(
  SOURCE_MODE
    ? 'Commercial baseline + F3-A/B/C/D + route guards + state ownership + EN/ZH/KO funnel contracts are closed.'
    : 'PDP/Custom -> Inquiry -> Contact -> Review -> Success Production funnel is fully Astro-owned and byte-identical to isolated artifacts.'
);
console.log('');
