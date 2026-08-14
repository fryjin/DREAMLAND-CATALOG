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

