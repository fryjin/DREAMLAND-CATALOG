# DREAMLAND frontend architecture

B2-01 establishes the **target module boundaries** without changing the current runtime.

## Current runtime

The production/preview application still runs from the existing legacy entry points:

```text
index.html
catalog-data.js
custom-scent-multi.js
copy-polish.js
image-manager.js
image-variants.js
detail-progressive.js
pattern-preview-swipe.js
startup-loader.js
sw.js
```

B2-01 does **not** load `src/app/foundation.js` in the browser.

## Target layers

```text
src/
├─ app/
│  ├─ foundation.js
│  ├─ layers.js
│  └─ legacy-map.js
├─ features/
│  └─ manifest.js
├─ ui/
│  └─ contracts.js
├─ services/
│  └─ contracts.js
└─ data/
   └─ product-data-contract.js
```

`src/data/product-data-contract.js` was introduced in B1-02 and is already runtime-active.
The new B2-01 files are architecture-only.

## Dependency direction

```text
app
├─ features
├─ ui
├─ services
└─ data

features
├─ ui
├─ services
└─ data

services
└─ data

ui
└─ (no higher-layer dependency)

data
└─ (no higher-layer dependency)
```

Rules:

1. `app` orchestrates; it should not own business implementation.
2. `features` own user-facing business flows.
3. `ui` owns reusable presentation primitives, not business state.
4. `services` own external/runtime capabilities such as data, media, storage, submission and PWA.
5. `data` owns pure data contracts and normalization.
6. New modules must not reintroduce runtime monkey-patching.
7. Migration is incremental: one legacy responsibility is moved at a time with behavior parity tests.

## B2-01 runtime guarantee

B2-01 intentionally does not modify:

- `index.html`
- `sw.js`
- runtime script order
- product data
- PWA behavior
- image behavior
- inquiry behavior
- UI/CSS

The only existing file modified in this phase is `package.json`, so CI can validate the new architecture.
