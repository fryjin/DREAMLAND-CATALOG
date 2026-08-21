function feature(
  id,
  responsibilities,
  legacyOwners,
  options={}
){
  const runtimeEnabled=
    options.runtimeEnabled===true;

  return Object.freeze({
    id,
    layer:'features',
    status:
      options.status||
      (
        runtimeEnabled
          ? 'partial'
          : 'legacy-owned'
      ),
    runtimeEnabled,
    runtimeOwner:
      options.runtimeOwner||
      '',
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
    'catalog series state',
    'catalog product filtering / ordering',
    'catalog View Model',
    'product masonry list',
    'catalog pagination'
  ],
  [
    'index.html',
    'catalog-data.js'
  ],
  {
    status:'partial',
    runtimeEnabled:true,
    runtimeOwner:
      'src/features/catalog/runtime-catalog.js'
  }
  ),
  feature(
  'detail',
  [
    'product detail state',
    'size / scent / pattern / packaging configuration',
    'Detail configuration View Model',
    'Detail pricing / MOQ derivation',
    'product detail presentation',
    'detail carousel'
  ],
  [
    'index.html',
    'detail-progressive.js',
    'pattern-preview-swipe.js'
  ],
  {
    status:'partial',
    runtimeEnabled:true,
    runtimeOwner:
      'src/features/detail/runtime-detail.js'
  }
  ),
  feature(
    'inquiry',
    [
      'inquiry list',
      'pricing preview',
      'preview / submission projection'
    ],
    [
      'index.html',
      'copy-polish.js'
    ],
    {
      status:'partial',
      runtimeEnabled:true,
      runtimeOwner:
        'src/features/inquiry/runtime-inquiry.js'
    }
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
      'contact information state',
      'contact draft persistence',
       'contact validation'
    ],
    [
      'index.html'
    ],
   {
       status:'partial',
       runtimeEnabled:true,
        runtimeOwner:
        'src/features/contact/runtime-contact.js'
   }
  )
]);
