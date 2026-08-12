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
    'Resolve responsive image variants, progressive loading and preloading.',
    [
      'image-manager.js',
      'image-variants.js',
      'detail-progressive.js'
    ]
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
    'Encapsulate service-worker registration, install/update state and offline lifecycle.',
    [
      'index.html',
      'sw.js'
    ]
  )
]);
