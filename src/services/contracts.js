function serviceContract(
  id,
  responsibility,
  legacyOwners,
  options={}
){
  return Object.freeze({
    id,
    layer:'services',
    runtimeEnabled:
      options.runtimeEnabled===true,
    migrationStatus:
      options.migrationStatus||
      (
        options.runtimeEnabled
          ? 'migrated'
          : 'legacy-owned'
      ),
    runtimeOwner:
      options.runtimeOwner||'',
    responsibility,
    legacyOwners:Object.freeze([
      ...legacyOwners
    ])
  });
}

export const SERVICE_CONTRACTS=Object.freeze([
  serviceContract(
    'catalog-data',
    'Load product, series, scent and shared-asset data without owning UI rendering.',
    [
      'catalog-data.js',
      'src/data/product-data-contract.js'
    ]
  ),
  serviceContract(
    'media',
    'Own shared responsive variant resolution, network policy, candidate loading, image-state transitions, decode and preloading primitives.',
    [
      'image-manager.js',
      'image-variants.js',
      'detail-progressive.js',
      'pattern-preview-swipe.js'
    ],
    {
      runtimeEnabled:true,
      migrationStatus:'partial',
      runtimeOwner:
        'src/services/media/runtime-media.js'
    }
  ),
  serviceContract(
    'storage',
    'Own main-application localStorage/sessionStorage access and provide a synchronous compatibility boundary during progressive migration.',
    [
      'index.html'
    ],
    {
      runtimeEnabled:true,
      migrationStatus:'migrated',
      runtimeOwner:
        'src/services/storage/runtime-storage.js'
    }
  ),
  serviceContract(
    'submission',
    'Prepare and send inquiry payloads through the future server boundary.',
    [
      'index.html',
      'functions/api/submit.js'
    ]
  ),
  serviceContract(
    'risk',
    'Encapsulate risk evaluation and captcha coordination.',
    [
      'index.html',
      'functions/api/submit.js'
    ]
  ),
  serviceContract(
    'pwa',
    'Own service-worker registration, install/update state, network reachability and the existing PWA guidance surfaces.',
    [
      'index.html',
      'sw.js'
    ],
    {
      runtimeEnabled:true,
      migrationStatus:'migrated',
      runtimeOwner:
        'src/services/pwa/runtime-pwa.js'
    }
  )
]);
