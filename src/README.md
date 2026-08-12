# DREAMLAND frontend architecture

B2 establishes a progressive migration from the legacy single-page runtime to explicit frontend layers.

## Current target layers

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

## Migration status

### B1-02 — Product data contract

Runtime active:

```text
src/data/product-data-contract.js
```

Owns product CSV parsing, normalization and fallback mapping.

### B2-01 — Frontend module foundation

Established layer definitions, manifests, migration map and architecture validation.

### B2-02 — Storage service migration

Runtime active:

```text
src/services/storage/runtime-storage.js
```

The main application routes local/session persistence through:

```text
window.DreamlandStorage.local
window.DreamlandStorage.session
```

During this transitional phase `index.html` uses `appStorage.local` /
`appStorage.session` as a synchronous compatibility bridge so existing state
logic does not need to be rewritten in the same change.

Existing storage keys and serialized payloads are preserved.

`startup-loader.js` is intentionally excluded from B2-02 because it executes
before the main application runtime and must determine first/repeat-visit
behavior before the storage service is loaded.

## Runtime migration rules

1. Migrate one ownership slice at a time.
2. Preserve visible behavior and stored data contracts.
3. Do not reintroduce monkey-patching.
4. Migrated services must be represented in `SERVICE_CONTRACTS`.
5. Migrated responsibilities must be represented in `LEGACY_FRONTEND_MAP`.
6. Runtime files required offline must enter the PWA app shell.
7. Architecture metadata modules remain outside browser runtime.
