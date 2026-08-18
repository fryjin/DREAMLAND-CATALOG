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
