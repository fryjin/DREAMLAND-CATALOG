# DREAMLAND frontend architecture

B2 progressively migrates the stable legacy runtime into explicit frontend layers.

## Target layers

```text
src/
├─ app/
├─ features/
├─ ui/
├─ services/
└─ data/
```

Dependency direction:

```text
app       → features / ui / services / data
features  → ui / services / data
services  → data
ui        → no higher-layer dependency
data      → no higher-layer dependency
```

## Runtime migration status

### B1-02 — Product data contract

Runtime active:

```text
src/data/product-data-contract.js
```

Owns product CSV parsing, normalization and fallback mapping.

### B2-01 — Frontend module foundation

Established the layer definitions, manifests, migration map and architecture validation.

### B2-02 — Storage service

Runtime active:

```text
src/services/storage/runtime-storage.js
```

Main-app local/session persistence is routed through `DreamlandStorage`.
`startup-loader.js` remains the explicit pre-bootstrap storage exception.

### B2-03 — PWA service

Runtime active:

```text
src/services/pwa/runtime-pwa.js
```

Owns:

- Service Worker registration and update checks;
- `beforeinstallprompt` / `appinstalled`;
- native install prompt coordination;
- iOS / WeChat / browser-menu install guidance;
- PWA update banner lifecycle;
- network/offline reachability probing;
- existing PWA-specific localized copy;
- PWA DOM guidance surfaces.

The main application keeps only narrow integration calls:

```text
pwaService.configure(...)
pwaService.probeReachability(...)
pwaService.applyReachability(...)
pwaService.text(...)
pwaService.refreshUi()
pwaService.initExperience()
```

The existing PWA DOM remains in `index.html`, so B2-03 changes runtime ownership without redesigning UI.

`sw.js` remains the actual Service Worker implementation and is owned by the PWA service boundary.

### B2-04 — Media core service

Runtime active:

```text
src/services/media/runtime-media.js
```

Owns the shared low-level media policy:

- 480 / 960 responsive-width selection;
- save-data / 2G constrained-network policy;
- generated WebP variant path resolution;
- image candidate loading and fallback;
- decode handling;
- preload probes;
- shared `is-loading / is-loaded / is-error` frame state;
- responsive image request de-duplication.

Legacy media adapters remain intentionally active:

```text
image-manager.js
image-variants.js
detail-progressive.js
pattern-preview-swipe.js
```

B2-04 changes their low-level dependency to `DreamlandMedia` but does not yet remove all rendering hooks or monkey-patching. That is deferred to B3.

Notably:

- `image-manager.js` no longer overrides catalog/detail rendering or slide updates; it retains skeleton styles and inquiry-media mounting.
- `image-variants.js` remains the catalog/detail responsive adapter and shared-asset compatibility layer.
- `detail-progressive.js` remains the detail progressive-loading and carousel orchestrator, but delegates variant, network and preload primitives to `DreamlandMedia`.
- `pattern-preview-swipe.js` remains a UI/gesture owner and is not migrated in this phase.

## Runtime migration rules

1. Migrate one ownership slice at a time.
2. Preserve visible behavior and persisted data contracts.
3. Do not reintroduce monkey-patching.
4. Migrated services must be represented in `SERVICE_CONTRACTS`.
5. Migrated responsibilities must be represented in `LEGACY_FRONTEND_MAP`.
6. Runtime files required offline must enter the PWA app shell.
7. Architecture metadata modules remain outside browser runtime.

### B3-01 — Media adapter hook cleanup

Runtime active:

```text
src/app/runtime-hooks.js
```

The core page now exposes explicit extension points:

```text
catalog.renderProductCard
catalog.afterAppendBatch
detail.renderMedia
detail.startCarousel
detail.afterSlideUpdate
```

`image-variants.js` and `detail-progressive.js` register/subscribe to these points through
`DreamlandRuntimeHooks`. They no longer replace the corresponding global functions at runtime.

This phase intentionally leaves two legacy monkey-patches for later B3 work:

```text
sharedAssetCandidates = ...
renderInquiry = ...
```

The goal is to remove the high-risk catalog/detail renderer override chain first without mixing in
shared-asset or inquiry ownership changes.

### B3-02 — Shared Asset Hook Cleanup

The shared-asset candidate pipeline now exposes one explicit slot:

```text
sharedAssets.transformCandidates
```

Core ownership remains in `index.html`:

```text
sharedAssetRecord()
→ sharedAssetCandidates()
→ optional DreamlandRuntimeHooks slot
```

`image-variants.js` registers the responsive candidate transformer instead of replacing
`sharedAssetCandidates` at runtime.

Behavior remains:

```text
home
→ original shared-asset candidates only

pattern / package / other shared assets
→ responsive generated WebP candidate(s)
→ original candidate(s)
```

Existing callers are unchanged, including:

```text
mountSharedImages
patternThumb
packThumb
openPreview
pattern-preview-swipe.js
```

After B3-02, the remaining explicitly tracked runtime monkey-patch in the media/inquiry area is:

```text
renderInquiry = ...
```

That belongs to a later Inquiry Ownership Migration and is intentionally out of scope here.

### B3-03 — Inquiry Media Hook Cleanup

The remaining `renderInquiry` wrapper in `image-manager.js` is removed.

Core `renderInquiry()` now emits two explicit lifecycle events:

```text
inquiry.beforeRender
inquiry.afterRender
```

The lifecycle preserves the old ordering:

```text
beforeRender
→ syncActiveInquiryCovers()
→ existing Inquiry DOM render
→ afterRender (microtask)
→ requestAnimationFrame
→ mountInquiry()
```

`inquiry.afterRender` is queued with `queueMicrotask`, so it still runs after the synchronous
core renderer completes even when the empty-inquiry branch returns early.

`image-manager.js` retains ownership of Inquiry media concerns:

```text
inquiryImageCandidates
syncActiveInquiryCovers
createInquiryImage
loadInquiryImage
mountInquiry
```

It no longer owns or replaces the core Inquiry renderer.

After B3-03, the media-side global render-function monkey patches tracked in B3-01 through
B3-03 are removed. This does not mean the entire Inquiry feature has been modularized; broader
Inquiry business ownership remains a later feature migration.

### B4-01 — Submission Service Boundary

Runtime active:

```text
src/services/submission/runtime-submission.js
```

`DreamlandSubmission` owns the external submission transport boundary:

```text
configure
ready
buildFormData
submit
```

Current flow becomes:

```text
Inquiry / Preview (index.html)
→ buildWeb3FormsPayload()
→ Risk / hCaptcha stays outside Submission
→ DreamlandSubmission.submit(payload, { captchaToken })
→ Web3Forms
→ normalized submission result
```

B4-01 deliberately does **not** move:

```text
buildWeb3FormsPayload
submissionSnapshot
archiveSubmission
clearSubmittedInquiry
pwa reachability checks
cooldown / duplicate-submit UI state
risk assessment
hCaptcha lifecycle
```

Those are separate business, persistence, connectivity or Risk responsibilities.

`functions/api/submit.js` currently implements the adaptive **risk assessment** endpoint (`action: assess`);
it is not the Web3Forms transport implementation and is therefore tracked under the Risk boundary for B4-02.

Submission service status remains `partial` because the transport boundary is runtime-owned while payload composition and Inquiry orchestration are still legacy-owned.

### B4-02 — Risk Service Boundary

Runtime active:

```text
src/services/risk/runtime-risk.js
```

The client Risk boundary now owns:

```text
risk session/form timing
trusted interaction counting
dreamlandRiskAttempts read/write/pruning
risk context assembly
POST action=assess transport
risk response normalization

hCaptcha SDK loading/preload
hCaptcha widget lifecycle
captcha token lifecycle
invisible challenge execution/reset
```

The core page still owns UI/business orchestration:

```text
RISK_COPY / riskText
risk status DOM
captcha section DOM
honeypot DOM field
privacy-consent flow
when to assess
when to ask for CAPTCHA
Inquiry payload composition
Submission transport call
```

The server boundary is intentionally unchanged:

```text
functions/api/submit.js
```

It still owns:

```text
payload validation
risk scoring
RISK_STORE read/write
threshold decision
captcha_required response
```

So B4-02 is a **client Risk/hCaptcha boundary**, not a rewrite of server risk policy.
A later phase can decide whether the server implementation needs its own contract extraction.

### B5-01 — Inquiry Feature State Boundary

B5 starts the first real Feature runtime migration.

Runtime active:

```text
src/features/inquiry/runtime-inquiry.js
```

The Inquiry feature now owns:

```text
productManualV2State hydration
v2 compatibility state object
items persistence
product add/merge
duplicate-product consolidation
item replacement
product quantity mutation
item removal
clear-all item mutation
custom-intent insertion
```

The existing `state` variable in `index.html` becomes a compatibility reference returned by
`DreamlandInquiry.configure()`. Existing render/pricing code may still read `state.items`,
but B5-01 removes direct item-state persistence and the core item write paths from the page.

The page deliberately continues to own:

```text
renderInquiry / renderItem
dynamic Inquiry DOM updates
pricing / tiers / totals
toasts and navigation
pending Inquiry ID
contact draft state
preview
Risk orchestration
Submission orchestration
```

`state.contact` remains legacy-written compatibility state and is still excluded from
`productManualV2State` persistence exactly as before.

Feature manifest status:

```text
inquiry
  runtimeEnabled: true
  status: partial
  runtimeOwner: src/features/inquiry/runtime-inquiry.js
```

All other Features remain `legacy-owned` in B5-01.

### B5-02 — Inquiry Pricing / Derived State Boundary

Runtime extended:

```text
src/features/inquiry/runtime-inquiry.js
version: B5-02
```

New Inquiry-derived calculations:

```text
pricingReady()
seriesQuantity()
pricingGroupQuantity()
itemUnit()
itemSubtotal()
total()
derivedSummary()
```

The Feature does **not** become the global pricing engine.

These shared rules remain in `index.html` because Detail/Catalog also use them:

```text
pricingSeriesFor()
tierFor()
currentTierIndex()
nextTierFor()
tierUnitCny()
packSurchargeCny()
cnyToBase()
configUnit()
catalogUnit()
```

`DreamlandInquiry.configure()` receives narrow adapters:

```text
pricingSeriesFor
tierUnitCny
packSurchargeCny
convertCnyToBase
```

The page keeps compatibility wrappers:

```text
seriesQty()
pricingGroupQty()
itemUnit()
itemSubtotal()
total()
```

but those wrappers no longer compute directly from `state.items`.

`derivedSummary()` exposes:

```text
itemCount
productCount
customCount
productQuantity
estimatedTotal
```

for the later Inquiry View Model / Renderer migration.

Inquiry remains `partial/runtimeEnabled` because DOM rendering, shared pricing policy, localized
currency formatting, Contact, Risk and Submission are not migrated in B5-02.

### B5-03 — Inquiry View Model / Renderer Boundary

`DreamlandInquiry` is extended from `B5-02` to `B5-03`.

New API:

```text
buildViewModel()
```

The View Model is locale-neutral and DOM-free.

Shape:

```text
{
  empty,
  items: [
    {
      ...item fields,
      normalizedQty,
      unitPrice,
      subtotal
    }
  ],
  groups: [
    {
      key,
      type,
      itemCount,
      quantity,
      items
    }
  ],
  summary: {
    itemCount,
    productCount,
    customCount,
    productQuantity,
    estimatedTotal
  }
}
```

Ownership after B5-03:

```text
DreamlandInquiry
├─ state hydration / persistence
├─ item mutation
├─ Inquiry pricing derivation
└─ Inquiry View Model

index.html
├─ localized labels / money formatting
├─ HTML templates
├─ DOM updates
├─ click/input handlers
└─ render lifecycle hooks
```

`renderInquiry()` and `updateInquiryDynamicUi()` both consume a fresh
`DreamlandInquiry.buildViewModel()` snapshot.

This removes the previous duplication where full rendering and dynamic quantity updates each
re-derived group counts, item prices and summary totals independently.

The following compatibility pricing wrappers remain in `index.html` because Preview / payload
composition still use them:

```text
seriesQty()
pricingGroupQty()
itemUnit()
itemSubtotal()
total()
```

B5-03 does not migrate Preview, Contact, Risk, Submission, shared pricing policy or the actual DOM
renderer.

Inquiry remains:

```text
status: partial
runtimeEnabled: true
```

### B5-04 — Inquiry UI Renderer Boundary

B5-04 does **not** change the Inquiry Feature contract introduced in B5-03.

`DreamlandInquiry` remains:

```text
State
→ Mutation
→ Pricing / Derived State
→ View Model
```

A new UI runtime is added:

```text
src/ui/inquiry/runtime-inquiry-renderer.js
window.DreamlandInquiryRenderer
version: B5-04
```

API:

```text
configure()
snapshot()
ready()
render(viewModel)
update(viewModel)
```

The UI runtime owns:

```text
Inquiry empty-state HTML
group/list HTML
product/custom item HTML
summary HTML

full DOM render
incremental DOM update

item-level event delegation:
- empty-state navigation
- delete
- quantity +/- buttons
- quantity input change
- edit item
- tier sheet action
```

It deliberately does **not** import or reference:

```text
DreamlandInquiry
DreamlandSubmission
DreamlandRisk
DreamlandStorage
DreamlandRuntimeHooks

state.items
products
seriesMeta
currencyMap
```

The `ui` layer therefore keeps its existing architectural rule:

```text
ui → no dependencies
```

`index.html` remains the App/orchestration boundary and injects:

```text
presentation adapters:
- ui
- seriesLabel
- choiceLabel
- qtyUnit
- htmlAttr
- money
- currencyUnit
- itemScentLabel
- productDisplayName
- maximumQuantity

business callbacks:
- go
- del
- qty
- setItemQty
- openEditProductItem
- openItemTierSheet
```

After B5-04:

```text
renderInquiry()
  → beforeRender hook
  → merge/persist
  → DreamlandInquiry.buildViewModel()
  → DreamlandInquiryRenderer.render()
  → afterRender hook

updateInquiryDynamicUi()
  → DreamlandInquiry.buildViewModel()
  → DreamlandInquiryRenderer.update()
```

The large `renderItem()` template is removed from `index.html`.

B5-04 does not migrate:

```text
Preview / itemText
submission projection
Contact
Risk / hCaptcha
Submission orchestration
shared pricing policy
screen navigation
badge
media lifecycle
```

Inquiry remains a partial Feature because these orchestration and downstream projection paths are still legacy-owned.

### B5-05 — Inquiry Preview / Projection Boundary

B5-05 extends the existing `DreamlandInquiry` runtime without moving Preview DOM or Submission orchestration into the Feature.

Runtime:

```text
src/features/inquiry/runtime-inquiry.js
B5-03 → B5-05
```

New API:

```text
projectionReady()
buildProjection(context)
```

Projection context:

```text
{
  contact,
  inquiryId,
  submittedAt,
  language,
  privacyVersion
}
```

Projection output provides one stable Inquiry interpretation for:

```text
Preview
Web3Forms payload composition
submission archive snapshots
```

The projection includes:

```text
products / customs
previewKey / previewValue
summaryText
rawProductItems / rawCustomItems
snapshotItems
itemCount / productCount / customCount
itemsSummary
estimatedTotal
estimatedTotalDisplay
contact snapshot
metadata
```

Presentation adapters are injected through `DreamlandInquiry.configure()`:

```text
projectionText
projectionProductDisplayName
projectionSeriesLabel
projectionChoiceLabel
projectionQtyUnit
projectionItemMoq
projectionItemScentLabel
projectionDefaultPack
projectionMoney
```

They are function references only. The Feature remains DOM-free and does not own localization state, currency state, Contact state, Risk, Submission or Preview HTML.

After B5-05:

```text
renderPreview()
  → buildProjection()
  → Preview DOM

buildWeb3FormsPayload()
  → buildProjection()
  → Web3Forms-specific flat fields

submissionSnapshot()
  → buildProjection()
  → archive record
```

The legacy `itemText()` helper is removed.

Compatibility wrappers remain temporarily:

```text
itemSubtotal()
total()
```

even though Preview/Submission no longer consume them. Their cleanup is intentionally deferred so B5-05 does not mix Projection migration with shared Pricing compatibility cleanup.

B5-05 preserves existing output parity, including two pre-existing legacy string behaviors:

```text
custom scent preview/summary retains the literal:
||ui('scentRecommend')

items_summary retains the historical no-delimiter concatenation
```

Those are not corrected in this architecture-only migration.

Still legacy/App-owned:

```text
Preview HTML / kv()
Contact draft and validation
privacy consent UI
Risk / hCaptcha
Web3Forms field names
Submission orchestration
archive persistence
```
### B5-06 — contact-submission-orchestration

DreamlandContact
version B5-06

DreamlandInquirySubmissionFlow
version B5-06

Contact Feature owns:
- contact state
- draft TTL
- draft persistence
- validation

Submission Flow owns:
- duplicate/cooldown gate
- submission readiness
- reachability
- risk attempt recording
- DreamlandSubmission.submit()
- archive / last-submission persistence
- success cleanup:
  Inquiry.clearItems + persist
  Contact.clearAll
  pending inquiry storage clear

index remains:
- DOM collection
- invalid styles
- privacy consent
- captcha/risk UI
- toast/button/navigation

The previous clearSubmittedInquiry() reassigned the legacy global state object and could bypass DreamlandInquiry's internal state. B5-06 routes successful clearing through DreamlandInquiry.clearItems() + persist().

### B6-01 — Catalog State / ViewModel Boundary

Runtime active:

```text
src/features/catalog/runtime-catalog.js
```

`DreamlandCatalog` owns:

```text
active-series state
default-series fallback
available-series derivation
current-series product filtering
listSort / sortOrder ordering
Catalog ViewModel snapshots
```

The Catalog ViewModel exposes:

```text
empty
activeSeries
availableSeries
displayCount
series
products
```

`index.html` remains responsible for:

```text
renderTabs / renderProducts / renderProductCard
Catalog DOM writes
batch cursor / loading / render token / timer
scroll-driven batch scheduling
media hooks
openDetail navigation
```

So Catalog is `partial/runtimeEnabled` in B6-01.

B6-02 is responsible for the actual Catalog Renderer migration.

PWA cache:

```text
dreamland-pwa-v78
```

### B6-02 — Catalog UI Renderer Boundary

Runtime active:

```text
src/ui/catalog/runtime-catalog-renderer.js
```

`DreamlandCatalogRenderer` owns:

```text
Catalog tabs HTML and click delegation
Catalog two-column product grid HTML
product-card HTML
Catalog batch render token / timer / cursor / loading state
incremental batch rendering
scroll-driven lazy rendering
Catalog card / quick-add event delegation
responsive-image data attributes
```

Current Catalog flow:

```text
DreamlandCatalog.buildViewModel()
→ DreamlandCatalogRenderer
→ catalog.afterAppendBatch
→ image-variants.js
→ DreamlandMedia
```

B6-02 retires the B3 transitional whole-card slot:

```text
catalog.renderProductCard
```

and preserves:

```text
catalog.afterAppendBatch
```

for responsive image mounting.

`index.html` keeps only narrow Catalog UI wrappers plus business/orchestration callbacks:

```text
renderTabs
renderProducts
cancelCatalogRender
setActiveSeries
openDetail
quickAdd
shared pricing adapters
RuntimeHooks event bridge
```

Catalog remains `partial/runtimeEnabled`.

Runtime-enabled UI contracts are now:

```text
catalog-renderer
inquiry-renderer
```

PWA cache:

```text
dreamland-pwa-v79
```