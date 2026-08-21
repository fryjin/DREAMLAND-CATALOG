function uiContract(
  id,
  responsibility,
  options={}
){
  const runtimeEnabled=
    options.runtimeEnabled===true;

  return Object.freeze({
    id,
    layer:'ui',
    runtimeEnabled,
    migrationStatus:
      options.migrationStatus||
      (
        runtimeEnabled
          ? 'migrated'
          : 'legacy-owned'
      ),
    runtimeOwner:
      options.runtimeOwner||
      '',
    responsibility
  });
}

export const UI_CONTRACTS=Object.freeze([
  uiContract(
    'modal',
    'Dialog presentation and dismissal semantics.'
  ),
  uiContract(
    'sheet',
    'Bottom-sheet presentation and future drag lifecycle.'
  ),
  uiContract(
    'toast',
    'Transient feedback presentation.'
  ),
  uiContract(
    'carousel',
    'Generic direct-manipulation carousel surface.'
  ),
  uiContract(
    'tabs',
    'Series and section navigation controls.'
  ),
  uiContract(
    'bottom-navigation',
    'Primary mobile navigation surface.'
  ),
  uiContract(
  'catalog-renderer',
  'Own Catalog tabs, product-card HTML, two-column batch rendering, scroll-driven incremental rendering and Catalog UI event delegation while consuming injected presentation adapters and business callbacks.',
  {
    runtimeEnabled:true,
    migrationStatus:'migrated',
    runtimeOwner:
      'src/ui/catalog/runtime-catalog-renderer.js'
  }
  ),
  uiContract(
  'detail-renderer',
  'Own Detail configuration-card HTML, size/scent/pattern/pack/quantity presentation, Detail configuration UI event delegation and horizontal option-scroll lifecycle while consuming an injected Detail ViewModel, presentation adapters and business callbacks. Detail media/carousel/swipe and shared preview modals remain outside this renderer.',
  {
    runtimeEnabled:true,
    migrationStatus:'migrated',
    runtimeOwner:
      'src/ui/detail/runtime-detail-renderer.js'
  }
  ),
  uiContract(
    'inquiry-renderer',
    'Own Inquiry list/summary HTML templates, DOM rendering, incremental DOM updates and item-level event delegation while consuming injected presentation adapters and business callbacks.',
    {
      runtimeEnabled:true,
      migrationStatus:'migrated',
      runtimeOwner:
        'src/ui/inquiry/runtime-inquiry-renderer.js'
    }
  )
]);
