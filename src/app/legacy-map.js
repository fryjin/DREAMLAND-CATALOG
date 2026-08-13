function entry(
  id,
  legacyFiles,
  targetLayer,
  targetArea,
  notes='',
  options={}
){
  const runtimeMigrated=
    options.runtimeMigrated===true;

  return Object.freeze({
    id,
    legacyFiles:Object.freeze([
      ...legacyFiles
    ]),
    targetLayer,
    targetArea,
    status:
      options.status||
      (
        runtimeMigrated
          ? 'migrated'
          : 'legacy-owned'
      ),
    runtimeMigrated,
    runtimeOwners:Object.freeze([
      ...(options.runtimeOwners||[])
    ]),
    notes
  });
}

export const LEGACY_FRONTEND_MAP=Object.freeze([
  entry(
    'app-shell',
    [
      'index.html',
      'startup-loader.js'
    ],
    'app',
    'bootstrap',
    'Application startup, screen orchestration and legacy global state remain in the current runtime.'
  ),
  entry(
    'catalog',
    [
      'index.html',
      'catalog-data.js'
    ],
    'features',
    'catalog',
    'Catalog rendering remains legacy-owned. B1-02 already extracted the shared product data contract.'
  ),
  entry(
    'detail',
    [
      'index.html',
      'detail-progressive.js',
      'pattern-preview-swipe.js'
    ],
    'features',
    'detail',
    'Detail rendering and swipe behavior remain legacy-owned.'
  ),
  entry(
    'inquiry',
    [
      'index.html',
      'copy-polish.js'
    ],
    'features',
    'inquiry',
    'Inquiry state, preview, pricing and submission remain legacy-owned.'
  ),
  entry(
    'custom-request',
    [
      'index.html',
      'custom-scent-multi.js'
    ],
    'features',
    'custom',
    'Custom request behavior remains legacy-owned.'
  ),
  entry(
    'media',
    [
      'image-manager.js',
      'image-variants.js',
      'detail-progressive.js',
      'pattern-preview-swipe.js'
    ],
    'services',
    'media',
    'Shared media primitives are owned by DreamlandMedia. Catalog/detail media adapters now attach through DreamlandRuntimeHooks instead of overwriting renderProductCard, appendCatalogBatch, renderDetailMedia, startDetailCarousel or updateDetailSlide. sharedAssetCandidates and renderInquiry remain explicit legacy patches for later B3 cleanup.',
    {
      status:'partial',
      runtimeMigrated:false,
      runtimeOwners:[
        'src/services/media/runtime-media.js',
        'image-manager.js',
        'image-variants.js',
        'detail-progressive.js',
        'pattern-preview-swipe.js'
      ]
    }
  ),
  entry(
    'storage',
    [
      'index.html'
    ],
    'services',
    'storage',
    'Main-application local/session storage access is routed through DreamlandStorage. startup-loader.js remains a deliberate pre-bootstrap storage exception.',
    {
      status:'migrated',
      runtimeMigrated:true,
      runtimeOwners:[
        'src/services/storage/runtime-storage.js'
      ]
    }
  ),
  entry(
    'submission',
    [
      'index.html',
      'functions/api/submit.js'
    ],
    'services',
    'submission',
    'Submission boundary is intentionally deferred to B4.'
  ),
  entry(
    'pwa',
    [
      'index.html',
      'sw.js',
      'startup-loader.js'
    ],
    'services',
    'pwa',
    'PWA browser lifecycle, install/update orchestration and network reachability are routed through DreamlandPwa. sw.js remains the service-worker implementation; startup-loader.js remains a pre-bootstrap concern.',
    {
      status:'migrated',
      runtimeMigrated:true,
      runtimeOwners:[
        'src/services/pwa/runtime-pwa.js',
        'sw.js'
      ]
    }
  )
]);
