function feature(
  id,
  responsibilities,
  legacyOwners
){
  return Object.freeze({
    id,
    layer:'features',
    status:'legacy-owned',
    runtimeEnabled:false,
    responsibilities:Object.freeze([
      ...responsibilities
    ]),
    legacyOwners:Object.freeze([
      ...legacyOwners
    ])
  });
}

export const FEATURE_MANIFEST=Object.freeze([
  feature(
    'home',
    [
      'entry experience',
      'home navigation'
    ],
    [
      'index.html'
    ]
  ),
  feature(
    'catalog',
    [
      'series navigation',
      'product masonry list',
      'catalog pagination'
    ],
    [
      'index.html',
      'catalog-data.js'
    ]
  ),
  feature(
    'detail',
    [
      'product detail presentation',
      'size / scent / pattern selection',
      'detail carousel'
    ],
    [
      'index.html',
      'detail-progressive.js',
      'pattern-preview-swipe.js'
    ]
  ),
  feature(
    'inquiry',
    [
      'inquiry list',
      'pricing preview',
      'contact / submission flow'
    ],
    [
      'index.html',
      'copy-polish.js'
    ]
  ),
  feature(
    'custom',
    [
      'custom product request',
      'multi scent selection'
    ],
    [
      'index.html',
      'custom-scent-multi.js'
    ]
  ),
  feature(
    'contact',
    [
      'contact information collection',
      'submission preparation'
    ],
    [
      'index.html'
    ]
  )
]);
