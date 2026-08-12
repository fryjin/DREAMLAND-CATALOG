function entry(
  id,
  legacyFiles,
  targetLayer,
  targetArea,
  notes=''
){
  return Object.freeze({
    id,
    legacyFiles:Object.freeze([
      ...legacyFiles
    ]),
    targetLayer,
    targetArea,
    status:'legacy-owned',
    runtimeMigrated:false,
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
    'Detail rendering and swipe behavior are not migrated in B2-01.'
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
      'detail-progressive.js'
    ],
    'services',
    'media',
    'Image loading and responsive variant behavior remain untouched.'
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
    'PWA runtime and service-worker behavior remain untouched.'
  )
]);
