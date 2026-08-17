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
    'Inquiry item-state hydration/persistence/mutation plus Inquiry-specific quantity aggregation and item-derived unit/subtotal/total pricing are routed through DreamlandInquiry. Shared pricing rules (tier selection, package surcharge and CNY/base conversion), DOM rendering, preview, contact state and submission orchestration remain in index.html/copy-polish.js.',
    {
      status:'partial',
      runtimeMigrated:false,
      runtimeOwners:[
        'src/features/inquiry/runtime-inquiry.js',
        'index.html',
        'copy-polish.js'
      ]
    }
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
    'Shared media primitives are owned by DreamlandMedia. Catalog/detail media adapters, shared-asset candidate transformation, and inquiry media lifecycle integration now attach through DreamlandRuntimeHooks. The media-side global render-function monkey-patches tracked by B3-01 through B3-03 are removed; broader Inquiry feature ownership remains a later migration.',
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
      'index.html'
    ],
    'services',
    'submission',
    'Client Web3Forms transport, FormData assembly and response normalization are routed through DreamlandSubmission. Inquiry payload composition, snapshot/archive handling, connectivity checks and UI orchestration remain in index.html.',
    {
      status:'partial',
      runtimeMigrated:false,
      runtimeOwners:[
        'src/services/submission/runtime-submission.js'
      ]
    }
  ),
  entry(
    'risk',
    [
      'index.html',
      'functions/api/submit.js'
    ],
    'services',
    'risk',
    'Client risk context, local attempt tracking, risk-assessment transport and hCaptcha SDK lifecycle are routed through DreamlandRisk. Risk copy/status UI and honeypot DOM remain in index.html. Server-side scoring, RISK_STORE persistence and request validation remain in functions/api/submit.js for a later server-boundary phase.',
    {
      status:'partial',
      runtimeMigrated:false,
      runtimeOwners:[
        'src/services/risk/runtime-risk.js',
        'functions/api/submit.js'
      ]
    }
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
