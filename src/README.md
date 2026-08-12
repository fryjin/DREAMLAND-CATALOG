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

## Runtime migration rules

1. Migrate one ownership slice at a time.
2. Preserve visible behavior and persisted data contracts.
3. Do not reintroduce monkey-patching.
4. Migrated services must be represented in `SERVICE_CONTRACTS`.
5. Migrated responsibilities must be represented in `LEGACY_FRONTEND_MAP`.
6. Runtime files required offline must enter the PWA app shell.
7. Architecture metadata modules remain outside browser runtime.
