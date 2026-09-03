# DREAMLAND R4 — Astro Migration

## R4.1 — Astro Build Foundation

R4.1 proved that Astro can coexist with the repository without replacing the
current Production builder.

The isolated Astro build remains:

```text
npm run r4:astro:foundation
→ Astro static build
→ .r4-astro-dist/
```

Production still remains:

```text
npm run build
→ data:build
→ scripts/build-pages.mjs
→ dist/
```

## R4.3A — Astro Home Static Presentation

Status: migration stage.

The isolated `/` route is no longer a Foundation placeholder. It now renders the
real DREAMLAND Home presentation at build time.

### New Astro Home ownership

```text
src/astro/pages/index.astro
src/astro/layouts/SiteLayout.astro
src/astro/components/site/
src/astro/components/home/
src/astro/lib/home-view-model.mjs
src/astro/styles/home.css
```

### Build-time inputs

The Home uses the existing canonical data/contracts:

```text
data/site-content.json
data/desktop-home-assets.json
data/products.json
data/series.json
data/i18n.json

DreamlandPricingPolicy
DreamlandLocalizationPolicy
```

Current Picks preserve the existing Home rule:

```text
3 Masterpiece
+ 2 Advanced
= 5 Current Picks
```

The four collection cards use canonical Catalog deep links:

```text
/products/?series=masterpiece
/products/?series=advanced
/products/?series=holiday
/products/?series=classic
```

### Asset ownership

R4.3A does not duplicate binary Home assets in the Astro source tree.

After the isolated Astro build:

```text
scripts/r4-copy-astro-home-assets.mjs
```

copies the existing Home marketing asset tree into:

```text
.r4-astro-dist/images/desktop/home/
```

This preserves the current image-path contract while keeping one binary source
of truth.

### Zero-client-JS baseline

R4.3A Home is deliberately static.

It uses standard document links and contains no Home client runtime.

The following are **not** loaded by the isolated Home:

```text
Legacy index.html application
DreamlandDesktopExperience
DreamlandDesktopHome runtime renderer
Catalog runtime
Detail runtime
Custom runtime
Risk / hCaptcha
Submission runtime
startup-loader
```

### Not Production yet

R4.3A does **not** switch `npm run build`, Cloudflare output, Service Worker
ownership, or the Production `/` route.

That cutover belongs to a later R4.3 stage after Home-only client behavior is
defined and validated.

## Next

R4.3B — Home Minimal Runtime

Only genuine Home client behavior should be added there:

```text
language preference / localized Home content
Inquiry badge
small navigation behavior if required
```

No Catalog/Detail/Custom/Risk/Submission application bootstrap should return to
the Home route.

## R4.3B — Home Minimal Runtime

Status: migration stage.

R4.3B adds only two client-side responsibilities to the isolated Astro Home:

```text
1. Shared EN / ZH / KO language preference
2. Inquiry badge count
```

### Shared language key

The Home uses the existing Legacy language preference key:

```text
productManualLang
```

The static Home fallback remains English. On first Home runtime mount, English is
persisted if no supported language preference already exists. This means the
remaining Legacy routes read the same selected language after normal document
navigation.

All three Home language views are generated at build time from:

```text
data/site-content.json
data/products.json
data/series.json
data/i18n.json
DreamlandPricingPolicy
DreamlandLocalizationPolicy
```

The browser runtime does not fetch Catalog/Product/i18n data and does not execute
Pricing or Localization Domain logic.

### Inquiry badge parity

The Home reads only the existing Inquiry persistence record:

```text
productManualV2State
```

Badge semantics intentionally match the Legacy application:

```text
product item → quantity
non-product item → 1
```

The runtime refreshes on:

```text
initial mount
pageshow
storage event
document visibility return
```

It does not load `DreamlandInquiry`.

### Runtime budget / boundary

Canonical owner:

```text
src/astro/runtime/home-runtime.js
→ DreamlandHomeRuntime
```

The isolated output receives exactly one executable Home script:

```text
/r4-home-runtime.js
```

The runtime is explicitly forbidden from loading or depending on:

```text
Catalog
Detail
Custom
Risk / hCaptcha
Submission
DreamlandDesktopExperience
Service Worker bootstrap
network fetches
```

Normal Home navigation remains standard document links and requires no client
router.

### Historical R4.3B boundary

R4.3B intentionally did not change Production ownership. That boundary is
superseded by R4.3C below.

## R4.3C — Production Home Cutover

Status: Production migration stage.

The Production build is now transitional and route-scoped:

```text
npm run build
→ data:build
→ Legacy build-pages.mjs
→ Astro isolated build
→ promote Astro Home only
→ validate final dist/
```

Final Production ownership after R4.3C:

```text
/                         → Astro Home
/products/                → Legacy MPA
/products/{productId}/    → Legacy MPA
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
/privacy/                 → Legacy static page
```

`scripts/r4-promote-astro-home.mjs` replaces only `dist/index.html` and the
assets directly required by that Home document. It snapshots non-Home route
sentinels and rejects the build if any are modified.

The Astro Home is now indexable and owns canonical/OpenGraph/Twitter metadata.
The source Legacy `index.html` remains in the repository as the staged migration
fallback and as the Presentation source for routes not yet moved.

The existing `sw.js` asset remains in `dist/` because non-Home routes are still
Legacy/PWA-owned. The Astro Home does not bootstrap that Service Worker.

R4.3D will harden Home detachment and measure the Production Home payload before
Catalog migration begins.


## R4.3D — Home Legacy Detachment / Production Payload Hardening

Status: Production hardening stage.

R4.3C moved Production `/` to Astro. R4.3D closes the remaining indirect
Legacy ownership paths.

### Service Worker split ownership

The existing Service Worker is still required by Legacy routes, but Home is
removed from its application shell:

```text
APP_SHELL
- ./
- ./index.html
```

The Service Worker now treats `/` and `/index.html` as explicit
network-owned Home navigations:

```text
Home navigation
→ network only / no-store
→ offline.html only when the network is unavailable
```

It also purges historical Home entries from both APP and RUNTIME caches during
install and activate. This prevents the former giant Legacy Home document from
being revived as an offline/cache fallback after the Astro cutover.

The Astro Home runtime still does not register, update or control the Service
Worker.

### Production payload budgets

The R4.3D final `dist/` validator enforces budgets for the Home critical path:

```text
HTML raw                 <= 128 KiB
Home runtime raw         <= 12 KiB
Astro stylesheet raw     <= 64 KiB
Hero image raw           <= 256 KiB
HTML+JS+CSS gzip proxy   <= 64 KiB
Critical raw + hero      <= 384 KiB
```

It also requires:

```text
exactly 1 executable script
script = /r4-home-runtime.js
1-2 Astro stylesheets
exactly 1 eager image
hero fetchpriority=high
no Legacy/PWA bootstrap references in Home HTML
```

These are architecture budgets, not synthetic Lighthouse scores. They are
designed to stop the Astro Home from gradually absorbing the old SPA payload.

### R4.3 exit

After R4.3D passes:

```text
R4.3A Static Home        CLOSED
R4.3B Minimal Runtime    CLOSED
R4.3C Production Cutover CLOSED
R4.3D Detachment         CLOSED
```

The next migration target is Catalog Presentation.


## R4.4A — Astro Catalog Static Presentation

Status: isolated presentation migration stage.

R4.4A replaces the R4.1 Catalog proof page inside `.r4-astro-dist/products/`
with a real Catalog presentation while keeping Production `/products/` on the
Legacy MPA.

Build-time ownership:

```text
data/products.json
data/series.json
data/site-content.json
data/i18n.json
        ↓
DreamlandDesktopCatalogView
DreamlandPricingPolicy
DreamlandLocalizationPolicy
        ↓
src/astro/lib/catalog-view-model.mjs
        ↓
Astro static Catalog HTML
```

The initial presentation preserves the existing Catalog behavior contract
without activating client interactions yet:

```text
89 active products
All + four series counts
24-card initial featured page
direct MPA PDP links
price + MOQ display
Search / Filter / Sort / Load More controls rendered but disabled
EN static build
zero client JavaScript
```

R4.4A intentionally does not create a second Catalog filtering/sorting
implementation. The existing DOM-free `DreamlandDesktopCatalogView` is used as
a build-time adapter.

Catalog product media is route-scoped. After Astro renders the 24 initial
cards, `scripts/r4-copy-astro-catalog-assets.mjs` parses those exact cover
references and copies only those 24 product covers into the isolated Astro
output.

Production ownership remains unchanged:

```text
/                         → Astro Home
/products/                → Legacy MPA
/products/{productId}/    → Legacy MPA
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```

R4.4B will add the dedicated Catalog minimal runtime and URL-owned browse state.


## R4.4B — Catalog Minimal Runtime

Status: isolated runtime migration stage.

R4.4B keeps Production `/products/` on the Legacy MPA. Only the isolated
Astro Catalog gains client interaction.

### Runtime ownership

The browser route contains one executable Catalog asset:

```text
/r4-catalog-runtime.js
```

That output is assembled by the route-scoped Catalog copy step from two source
owners:

```text
src/features/catalog/runtime-desktop-catalog-view.js
  → canonical DOM-free Catalog state/filter/sort policy

src/astro/runtime/catalog-runtime.js
  → URL / DOM / language / Inquiry-badge adapter
```

Filtering and sorting are therefore not reimplemented in Astro.

### URL-owned browse state

R4.4B makes the Catalog URL authoritative for shareable browse conditions:

```text
?series=masterpiece
?query=...
?sizes=S,M
?sort=price-low
?page=2
```

Discrete Series / Size / Sort / Load More actions use History state. Search
typing is debounced and uses replaceState to avoid one history entry per
keystroke. `popstate` rebuilds the Catalog from the URL.

### Language / Inquiry compatibility

The Catalog reuses the same cross-route storage keys as Home and the remaining
Legacy routes:

```text
productManualLang
productManualV2State
```

EN / ZH / KO display strings, product names, series labels and formatted prices
are generated at build time. The browser does not fetch product, pricing or i18n
data.

Inquiry badge semantics remain:

```text
product item → quantity
non-product item → 1
```

### Compact runtime data / assets

The static HTML still contains 24 server-rendered cards for the default Catalog
view. A compact non-executable JSON state contains all 89 active products so the
route runtime can search, sort, filter and load additional cards.

The isolated output copies all 89 Catalog cover images because any of them may
become visible after a client-side browse-state change. They remain route-scoped
assets and are not all requested on initial load.

### Boundaries

R4.4B Catalog does not load:

```text
DreamlandDesktopExperience
Detail
Custom
Risk / hCaptcha
Submission
PWA bootstrap
catalog-data.js
startup-loader.js
```

It performs no client fetch and introduces no SPA/client router.

Production ownership remains:

```text
/                         → Astro Home
/products/                → Legacy MPA
/products/{productId}/    → Legacy MPA
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```

R4.4C will perform the Production Catalog route cutover.


## R4.4C — Production Catalog Cutover

Status: Production migration stage.

R4.4C promotes the already-validated Astro Catalog into the final Production
`dist/products/index.html` while preserving the existing Astro Home and all
remaining Legacy routes.

The transitional Production build becomes:

```text
data:build
→ Legacy build-pages.mjs
→ isolated Astro build
→ promote Astro Home
→ promote Astro Catalog
→ validate Home
→ validate Catalog
```

Final route ownership after R4.4C:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Legacy MPA
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```

Catalog promotion is route-scoped. It copies only:

```text
/products/index.html
/r4-catalog-runtime.js
Catalog-referenced Astro CSS/assets
89 Catalog cover images referenced by catalogRuntimeState
```

Before promotion the script snapshots Home, one active PDP, Custom and Inquiry
documents and rejects the build if any sentinel changes.

The Catalog becomes indexable at this stage:

```text
robots=index,follow
canonical=https://dreamland-catalog.pages.dev/products/
```

The Production build manifest records:

```text
catalogOwner=astro
catalogCutover=B7-00B.4J-R4.4C
presentationOverrides.catalog=astro-r4.4c
```

R4.4C intentionally does not change Service Worker ownership. The existing
Service Worker asset remains because PDP/Custom/Inquiry are still Legacy-owned.
Catalog cache/PWA detachment and Production payload hardening are R4.4D.


## R4.4D — Catalog Legacy Detachment / Production Payload Hardening

Status: Production hardening stage.

R4.4C moved Production `/products/` to Astro. R4.4D closes the remaining
indirect Legacy ownership path through the existing Service Worker.

### Exact Catalog document ownership

The Service Worker remains installed because PDP, Custom and Inquiry routes are
still Legacy-owned. Only the Catalog index document is detached:

```text
/products/
/products/index.html
```

The matcher uses exact pathname Set membership. It intentionally does not match:

```text
/products/{productId}/
```

so PDP documents continue through the Legacy navigation path.

Existing APP/RUNTIME cache entries for the two Catalog index paths are purged on
both install and activate. Catalog navigation is intercepted before the generic
Legacy `networkFirst` branch and uses:

```text
network-only
cache=no-store
offline.html only when the network is unavailable
```

This prevents an older cached Legacy Catalog document from being revived after
the Astro cutover.

The historical `dreamland-pwa-v129` cache/release version remains unchanged.
R4.4D uses explicit document purge instead of widening the migration into a PWA
release-version change.

### Production Catalog payload budgets

R4.4D adds final `dist/` budgets:

```text
Catalog HTML raw                 <= 256 KiB
catalogRuntimeState raw          <= 128 KiB
Catalog executable runtime raw   <= 56 KiB
Astro styles raw                 <= 96 KiB
HTML + JS + CSS gzip proxy       <= 96 KiB
SSR cards                        = 24
Initial cover images             = 24
Eager/high-priority covers       = 4
Lazy initial covers              = 20
Eager covers combined            <= 4 MiB
Single eager cover               <= 1.5 MiB
Runtime products                 = 89
```

All 89 runtime cover files must exist in Production, but only the 24 SSR cards
are present in the initial document and only four are eager/high-priority.

The validator reports the measured HTML, state, runtime, CSS, gzip proxy and
initial/eager image payloads on every Production build.

### Runtime boundary

The Catalog route runtime remains detached from:

```text
Service Worker registration
DreamlandPwa
DesktopExperience
Detail
Custom
Risk / hCaptcha
Submission
client fetches
```

### R4.4 exit

After R4.4D passes:

```text
R4.4A Static Catalog Presentation  CLOSED
R4.4B Catalog Minimal Runtime      CLOSED
R4.4C Production Catalog Cutover   CLOSED
R4.4D Legacy Detachment            CLOSED
R4.4 Catalog Migration             CLOSED
```

The next migration target is R4.5 — PDP Presentation Migration.
