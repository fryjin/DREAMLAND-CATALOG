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


## R4.5A — Astro PDP Static Presentation

Status: isolated presentation migration stage.

R4.5A replaces all 89 R4.1 Product foundation proof documents inside
`.r4-astro-dist/products/{productId}/` with real zero-client-JS PDP
presentations.

Build-time ownership:

```text
data/products.json
data/series.json
data/site-content.json
data/i18n.json
        ↓
DreamlandPricingPolicy
DreamlandLocalizationPolicy
        ↓
src/astro/lib/pdp-view-model.mjs
        ↓
Astro static PDP × 89
```

The static presentation includes:

```text
Product gallery
Series / Product ID
Localized product name + description
Canonical default-size MOQ
Canonical from-price
Available sizes + dimensions
Product tags
Custom-project link
Inquiry link
Add-to-Inquiry control rendered but disabled
```

Pricing is not reimplemented in Astro. Default-size MOQ and displayed starting
price delegate to the canonical R4.2A Pricing Domain. Product identity and
description delegate to the R4.2C Localization Domain.

PDP media remains route-scoped. After Astro renders the 89 pages,
`scripts/r4-copy-astro-pdp-assets.mjs` scans the actual Product image
references and copies only those referenced files into the isolated Astro
output.

R4.5A intentionally remains zero-client-JS. Product configuration, image
interaction, quantity/pricing mutations, language preference and Add-to-Inquiry
belong to R4.5B.

Production ownership is unchanged:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Legacy MPA
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```

All isolated PDP documents remain `noindex,nofollow` until the R4.5C
Production cutover.


## R4.5B — PDP Minimal Runtime

Status: isolated runtime migration stage.

R4.5B keeps Production `/products/{productId}/` on the Legacy MPA. The 89
isolated Astro PDP documents gain interactive configuration through one
route-scoped executable asset:

```text
/r4-pdp-runtime.js
```

That file is assembled by the PDP asset step from canonical runtime owners:

```text
src/features/detail/runtime-detail.js
src/domain/pricing/runtime-pricing-policy.js
src/features/inquiry/runtime-inquiry.js
src/astro/runtime/pdp-runtime.js
```

The Astro adapter owns DOM, language preference and presentation updates.
Configuration state and derived pricing remain owned by `DreamlandDetail` and
`DreamlandPricingPolicy`. Inquiry add/merge/persist semantics remain owned by
`DreamlandInquiry`.

### Interactive contract

R4.5B activates:

```text
Size
Holiday scent-series
Scent
Pattern
Packaging
Quantity +/- and direct input
Dynamic unit price
Current size MOQ
Primary-image size preview
Gallery image selection
EN / ZH / KO preference
Inquiry badge
Add to Inquiry
```

The runtime reuses cross-route storage:

```text
productManualLang
productManualV2State
```

Add-to-Inquiry creates the same product configuration identity fields consumed
by the canonical Inquiry service:

```text
productId
series
size
scentSeries
scentId / scent
pattern
pack
qty
```

Duplicate configurations therefore merge through
`DreamlandInquiry.addOrMergeProduct()` instead of a second Astro merge
implementation.

### Runtime data

Each PDP embeds one non-executable `pdpRuntimeState` JSON document containing
only the active product's configuration inputs, relevant scents, series pricing
metadata, size/pattern metadata, currency map and compact EN/ZH/KO display
strings.

The browser performs no data fetch.

### Boundaries

R4.5B does not load:

```text
DreamlandDesktopExperience
Risk / hCaptcha
Submission
PWA bootstrap
catalog-data.js
startup-loader.js
```

The isolated PDP remains `noindex,nofollow`. Production ownership is unchanged:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Legacy MPA
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```

R4.5C will perform the Production PDP cutover.


## R4.5C — Production PDP Cutover

Status: Production migration stage.

R4.5C promotes all 89 already-validated Astro PDP documents into the final
Production `dist/products/{productId}/index.html` while preserving Astro Home,
Astro Catalog and the remaining Legacy Custom/Inquiry routes.

The transitional Production build becomes:

```text
data:build
→ Legacy build-pages.mjs
→ isolated Astro build
→ promote Astro Home
→ promote Astro Catalog
→ promote Astro PDP × 89
→ validate Home
→ validate Catalog
→ validate PDP
```

Final route ownership after R4.5C:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```

PDP promotion is route-scoped. It copies only:

```text
/products/{activeProductId}/index.html × 89
/r4-pdp-runtime.js
PDP-referenced Astro CSS/assets
PDP-referenced /images/products/... media
```

Before promotion every target PDP must still be the Legacy MPA. Home, Catalog,
Custom and Inquiry documents are hash-snapshotted and must remain unchanged by
the PDP promotion step.

All 89 isolated PDP documents become indexable at this stage:

```text
robots=index,follow
canonical=https://dreamland-catalog.pages.dev/products/{productId}/
```

Each Production PDP must keep:

```text
exactly one executable /r4-pdp-runtime.js
one non-executable pdpRuntimeState
R4.5B runtime-state ownership parity with its route Product ID
no Legacy Desktop / Risk / Submission / PWA bootstrap
```

The Production build manifest records:

```text
pdpOwner=astro
pdpCutover=B7-00B.4J-R4.5C
presentationOverrides.pdp=astro-r4.5c
```

R4.5C intentionally does not modify Service Worker PDP ownership. The current
Service Worker remains because Custom/Inquiry are still Legacy-owned and its
PDP navigation/cache boundary will be migrated separately in R4.5D.


## R4.5D — PDP Legacy Detachment / Production Payload Hardening

Status: Production hardening stage.

R4.5C moved all 89 Production Product detail documents to Astro. R4.5D closes
the remaining indirect Legacy ownership path through the existing Service
Worker while retaining that Service Worker for Custom and Inquiry routes.

### Exact PDP document ownership

The Service Worker now treats Product detail navigation as an Astro-owned route
family:

```text
/products/ADV001
/products/ADV001/
/products/ADV001/index.html
```

The ownership pattern is intentionally constrained to the Product-ID shape:

```text
/products/{AAA000}
/products/{AAA000}/
/products/{AAA000}/index.html
```

It does not match the Catalog index and does not absorb Custom/Inquiry routes.

Existing APP/RUNTIME cache entries matching the PDP document pattern are purged
on both Service Worker install and activate. PDP navigations are intercepted
after Home and Catalog ownership checks but before the remaining Legacy
`networkFirst` branch:

```text
Home
→ Catalog
→ PDP
→ remaining Legacy routes
```

PDP navigation uses:

```text
network-only
cache=no-store
offline.html only when the network is unavailable
```

This prevents any previously cached Legacy PDP document from being revived after
the Astro cutover.

The historical `dreamland-pwa-v129` cache/release version remains unchanged.
R4.5D uses explicit route-family purge instead of widening this stage into a PWA
release-version migration.

### Production PDP payload budgets

R4.5D validates all 89 final Production PDP documents:

```text
Per-PDP HTML raw                 <= 256 KiB
pdpRuntimeState raw              <= 72 KiB
Shared PDP runtime raw           <= 104 KiB
Per-PDP Astro styles raw         <= 128 KiB
HTML + JS + CSS gzip proxy       <= 128 KiB
Primary eager image              <= 2.5 MiB
Critical raw + primary image     <= 3 MiB
Rendered Product images          = 1-10
Eager/high-priority images       = 1
Remaining rendered images        = lazy
PDP routes validated             = 89
```

The validator reports worst-case Production measurements, including the Product
ID responsible for maximum HTML, state, CSS, gzip, primary-image and critical
payload.

### Runtime boundary

The shared `/r4-pdp-runtime.js` remains detached from:

```text
Service Worker registration
DreamlandPwa
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandDesktopExperience
client data fetches
```

Configuration, pricing and Inquiry persistence remain delegated to the existing
canonical owners introduced in R4.5B.

### R4.5 exit

After R4.5D passes:

```text
R4.5A Static PDP Presentation    CLOSED
R4.5B PDP Minimal Runtime        CLOSED
R4.5C Production PDP Cutover     CLOSED
R4.5D Legacy Detachment          CLOSED
R4.5 PDP Migration               CLOSED
```

Production ownership is then:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```

The next migration target is R4.6 — Custom Presentation Migration.


## R4.6A — Astro Custom Static Presentation

Status: isolated presentation migration stage.

R4.6A adds a real Astro `/custom/` document to the isolated
`.r4-astro-dist/` build while Production Custom remains Legacy-owned.

Build-time ownership:

```text
data/site-content.json
data/i18n.json
data/scents.csv
data/series.json
data/app-config.json
        ↓
DreamlandProductDataContract
DreamlandLocalizationPolicy
DreamlandCustom
        ↓
src/astro/lib/custom-view-model.mjs
        ↓
Astro static Custom Project presentation
```

The static presentation preserves the current editorial three-part brief:

```text
01 / Project Basics
- Use Case
- Estimated Quantity
- FX-localized Budget Range
- Preferred Delivery

02 / Product Direction
- Size Preference
- Fragrance Collection
- Available scents
- Color preference

03 / Packaging & Branding
- Packaging
- Branding
- Project Notes

Sticky Project Brief
- Custom pricing quoted after review
- Explore Collection
- Review Inquiry
```

Custom MOQ and maximum quantity are sourced from `data/app-config.json`.
Fragrance availability is delegated to canonical `DreamlandCustom` at build
time after `scents.csv` is parsed through `DreamlandProductDataContract`.
Localized site copy is delegated to `DreamlandLocalizationPolicy`.

R4.6A intentionally remains zero-client-JS. Every editor control is rendered
but inert, language switching is disabled and Add Custom Project to Inquiry is
disabled. Draft state, validation, scent interaction, Live Brief updates,
EN/ZH/KO preference and canonical Inquiry persistence belong to R4.6B.

The isolated Custom route remains:

```text
robots=noindex,nofollow
canonical=https://dreamland-catalog.pages.dev/custom/
```

Production ownership is unchanged:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```


## R4.6B — Custom Minimal Runtime

Status: isolated runtime migration stage.

R4.6B activates the R4.6A Astro Custom Project presentation without changing Production /custom/ ownership.

Runtime ownership:

```text
DreamlandCustom
+ DreamlandInquiry
+ Astro Custom DOM/language adapter
        ↓
/r4-custom-runtime.js
```

DreamlandCustom remains the canonical owner for fragrance series, multi-scent selection, quantity bounds, validateDraft() and buildIntent(). DreamlandInquiry remains the canonical owner for addCustom(), shared Inquiry state and localStorage persistence. The Astro adapter owns only DOM interaction, the in-memory draft, Live Project Brief, EN/ZH/KO presentation and the Inquiry badge.

Shared storage remains:

```text
productManualLang
productManualV2State
```

The isolated Custom route now activates Use Case, Quantity, Budget, Preferred Delivery, Size, Fragrance Series, multi-scent selection, Color, Packaging, Branding, Notes, field validation, Live Brief and Add Custom Project to Inquiry.

The runtime bundle intentionally excludes browser data fetches, Service Worker bootstrap, DreamlandRisk/hCaptcha, DreamlandSubmission and DreamlandDesktopExperience.

Budgets:

```text
Astro Custom adapter source <= 36 KiB raw
/r4-custom-runtime.js       <= 104 KiB raw
customRuntimeState          <= 72 KiB raw
```

R4.6B keeps /custom/ noindex,nofollow and leaves Production ownership unchanged:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Legacy MPA
/inquiry/**               → Legacy MPA
```

Production Custom cutover belongs to R4.6C.


## R4.6C — Production Custom Cutover

Status: Production migration stage.

R4.6C promotes the already-validated Astro Custom Project document into the final Production `dist/custom/index.html` while preserving Astro Home, Catalog and all 89 PDPs plus the remaining Legacy Inquiry routes.

The Production build becomes:

```text
data:build
→ Legacy build-pages.mjs
→ isolated Astro build
→ promote Astro Home
→ promote Astro Catalog
→ promote Astro PDP × 89
→ promote Astro Custom
→ validate Home
→ validate Catalog
→ validate PDP
→ validate Custom
```

Final route ownership after R4.6C:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/**               → Legacy MPA
```

Custom promotion is route-scoped. It copies only `/custom/index.html`, `/r4-custom-runtime.js` and the hashed Astro assets referenced by the Custom document. Home, Catalog, a Production PDP sentinel and the Inquiry route family are hash-protected during the promotion step.

The Custom route becomes indexable at this stage:

```text
robots=index,follow
canonical=https://dreamland-catalog.pages.dev/custom/
```

The Production build manifest records:

```text
customOwner=astro
customCutover=B7-00B.4J-R4.6C
presentationOverrides.custom=astro-r4.6c
```

R4.6C intentionally does not modify Service Worker Custom ownership or APP/RUNTIME cache cleanup. The Service Worker remains because Inquiry is still Legacy-owned; Custom cache detachment and Production payload hardening belong to R4.6D.


## R4.6D — Custom Legacy Detachment / Production Payload Hardening

Status: Production hardening stage.

R4.6C moved Production `/custom/` to Astro. R4.6D closes the remaining
indirect Legacy Custom document ownership path through the existing Service
Worker while retaining that Service Worker for the still-Legacy Inquiry route
family.

### Exact Custom document ownership

The Service Worker now treats only the canonical Custom navigation variants as
Astro-owned documents:

```text
/custom
/custom/
/custom/index.html
```

The matcher uses exact pathname Set membership. It does not absorb
`/inquiry/**`, which continues through the remaining Legacy navigation path.

Existing APP/RUNTIME cache entries for the Custom document variants are purged
on both Service Worker install and activate. Navigation ownership becomes:

```text
Home
→ Catalog
→ PDP
→ Custom
→ remaining Legacy Inquiry routes
```

Custom navigation uses:

```text
network-only
cache=no-store
offline.html only when the network is unavailable
```

This prevents a previously cached Legacy Custom document from being revived
after the Astro cutover.

The historical `dreamland-pwa-v129` cache/release version remains unchanged.
R4.6D uses an explicit Custom-document purge rather than widening this stage
into a global PWA release migration.

The remaining Inquiry PWA shell is intentionally preserved. R4.6D does not
perform broad APP_SHELL dependency cleanup because Inquiry, Contact, Review,
Risk and Submission still depend on the Legacy application/PWA boundary.

### Production Custom payload budgets

R4.6D validates the final Production Custom document:

```text
Custom HTML raw                 <= 256 KiB
customRuntimeState raw          <= 72 KiB
Shared Custom runtime raw       <= 104 KiB
Astro styles raw                <= 128 KiB
HTML + JS + CSS gzip proxy      <= 128 KiB
Critical HTML + JS + CSS raw    <= 384 KiB
Executable route runtimes       = 1
```

The executable graph must contain only `/r4-custom-runtime.js`. The runtime
state remains R4.6B-owned and continues to use:

```text
productManualLang
productManualV2State
```

### Runtime boundary

The shared Custom runtime remains detached from:

```text
Service Worker registration
DreamlandPwa
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandDesktopExperience
catalog-data.js
startup-loader.js
browser data fetches
```

DreamlandCustom and DreamlandInquiry remain the canonical behavior/state owners
introduced in R4.6B.

### R4.6 exit

After R4.6D passes:

```text
R4.6A Astro Custom Static Presentation  CLOSED
R4.6B Custom Minimal Runtime            CLOSED
R4.6C Production Custom Cutover         CLOSED
R4.6D Custom Legacy Detachment          CLOSED
R4.6 Custom Migration                   CLOSED
```

Production ownership is then:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/**               → Legacy MPA
```

The next migration target is R4.7 — Inquiry Presentation Migration.


## R4.7A — Astro Inquiry Static Presentation

Status: isolated presentation migration stage.

R4.7A adds a real Astro `/inquiry/` document to the isolated
`.r4-astro-dist/` build while Production Inquiry, Contact, Review and Success
remain Legacy-owned.

Build-time ownership:

```text
data/site-content.json
        ↓
DreamlandLocalizationPolicy
DreamlandInquiry (storage=null, version=2)
        ↓
src/astro/lib/inquiry-view-model.mjs
        ↓
Astro static Inquiry presentation
```

Because the real Inquiry cart exists only in browser state, R4.7A does not
invent Product or Custom items at build time. The canonical DreamlandInquiry
owner is configured without storage and must produce its real empty ViewModel:

```text
empty=true
itemCount=0
productCount=0
customCount=0
productQuantity=0
```

The static presentation includes:

```text
01 Inquiry      active
02 Contact
03 Review

Inquiry items
- honest empty state
- Explore Collection
- Start a Custom Project

Inquiry overview
- Items: 0
- Total Quantity: 0
- Custom Project: 0
- Estimated product amount: —
- final pricing note
- Continue to Contact Details rendered but disabled
```

R4.7A is intentionally zero-client-JS. It does not read localStorage and does
not activate DreamlandInquiry in the browser. Item hydration, quantity editing,
removal, MOQ aggregation, localized runtime state and navigation to the
existing Legacy Contact route belong to R4.7B.

R4.7A does not migrate Contact, Review, Success, Risk/hCaptcha or Submission.
Those downstream conversion boundaries remain Legacy and are not bundled into
the Inquiry selection presentation migration.

The isolated Inquiry route remains:

```text
robots=noindex,nofollow
canonical=https://dreamland-catalog.pages.dev/inquiry/
```

Production and Service Worker ownership remain unchanged:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Legacy MPA
/inquiry/contact/         → Legacy MPA
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

R4.7B will activate the Inquiry selection runtime without moving the
Contact/Risk/Submission chain.


## R4.7B — Inquiry Minimal Runtime

Status: isolated runtime migration stage.

R4.7B activates the isolated Astro `/inquiry/` selection route while keeping
Production `/inquiry/**` on the Legacy MPA.

### Runtime ownership

The isolated Inquiry document contains exactly one executable route asset:

```text
/r4-inquiry-runtime.js
```

The bundle is assembled route-by-route from:

```text
DreamlandPricingPolicy
+
DreamlandInquiry
+
src/astro/runtime/inquiry-runtime.js
```

The browser adapter owns DOM, language preference and route navigation only.
Shared item state, mutations, product estimate and product MOQ grouping remain
canonical behavior.

### Shared state

R4.7B uses the existing cross-route storage contracts:

```text
language = productManualLang
inquiry  = productManualV2State
version  = 2
```

DreamlandInquiry hydrates the real browser state through `configure()`. Item
changes continue through canonical methods:

```text
setProductQuantity()
removeItem()
clearItems()
persist()
buildViewModel()
```

The header badge is derived from the canonical Inquiry summary:

```text
product quantity + custom project count
```

### Product MOQ ownership

The old Legacy Inquiry page already grouped Product MOQ by:

```text
series + size
```

R4.7B moves that state-derived grouping into DreamlandInquiry as:

```text
productMoqGroups(itemMoq)
firstUnmetProductMoqGroup(itemMoq)
```

The actual MOQ value remains owned by DreamlandPricingPolicy
`moqForSeriesSize()`. This avoids creating a second Astro-only business rule.

Continue-to-Contact is enabled only when the Inquiry is non-empty and no Product
series+size group is below its canonical MOQ. Custom-only inquiries remain
eligible because Custom validation occurred when the Custom intent was created.

### Pricing

DreamlandInquiry is configured with adapters backed by DreamlandPricingPolicy:

```text
normalizeQuantity
pricingSeriesFor
tierUnitCny
packSurchargeCny
cnyToBase
```

The Product estimate therefore re-derives from the same pricing tiers when
quantity changes. Custom projects remain quoted separately.

### EN / ZH / KO

The browser uses the shared `productManualLang` preference. Compact localized
Inquiry/Header/Footer views are generated at build time. Product names, series
labels, scent names and currency presentation update without browser data
fetches.

### Mutation behavior

R4.7B activates:

```text
real Inquiry hydration
product quantity +/- and direct numeric edit
remove item
clear all
live Product estimate
live item/quantity/custom summary
MOQ continuation guard
Inquiry badge synchronization
storage / pageshow / visibility refresh
Continue to /inquiry/contact/
```

The downstream Contact page is still Legacy-owned.

### Boundaries

R4.7B does not load or migrate:

```text
DreamlandContact
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandInquirySubmissionFlow
Service Worker registration
DesktopExperience
startup-loader
browser data fetches
```

The isolated Inquiry remains `noindex,nofollow`.

Production ownership remains:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/**               → Legacy MPA
```

R4.7C will perform the Production `/inquiry/` selection-route cutover without
prematurely migrating Contact/Review/Success.


## R4.7C — Production Inquiry Cutover

Status: Production migration stage.

R4.7C promotes the already-validated Astro Inquiry selection document into the
final Production `dist/inquiry/index.html` while preserving Astro Home,
Catalog, all 89 PDPs and Custom plus the Legacy Contact/Review/Success
conversion chain.

The Production build becomes:

```text
data:build
→ Legacy build-pages.mjs
→ isolated Astro build
→ promote Astro Home
→ promote Astro Catalog
→ promote Astro PDP × 89
→ promote Astro Custom
→ promote Astro Inquiry selection
→ validate Home
→ validate Catalog
→ validate PDP
→ validate Custom
→ validate Inquiry
```

Final route ownership after R4.7C:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Astro Inquiry
/inquiry/contact/         → Legacy MPA
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

Inquiry promotion is strictly selection-route scoped. It copies only:

```text
/inquiry/index.html
/r4-inquiry-runtime.js
Inquiry-referenced Astro CSS/assets
Product covers referenced by inquiryRuntimeState
```

Home, Catalog, all 89 PDP documents, Custom, Contact, Review, Success and the
Production Service Worker are hash-protected during the promotion step. The
whole `/inquiry/**` directory is never copied.

Unlike the public Catalog/PDP/Custom routes, Inquiry remains a non-public
conversion route after Production cutover:

```text
robots=noindex,nofollow
canonical=https://dreamland-catalog.pages.dev/inquiry/
```

The Production build manifest records:

```text
inquiryOwner=astro
inquiryCutover=B7-00B.4J-R4.7C
presentationOverrides.inquiry=astro-r4.7c
```

R4.7C intentionally does not modify `sw.js`, Service Worker navigation
ownership, APP/RUNTIME cache cleanup, Contact/Review/Success, Risk/hCaptcha or
Submission. Exact Inquiry-selection Service Worker detachment and final
Production payload hardening belong to R4.7D.


## R4.7D — Inquiry Legacy Detachment / Production Payload Hardening

Status: Production hardening stage.

R4.7C moved only the Production `/inquiry/` selection document to Astro.
R4.7D closes its remaining indirect Legacy document path through the existing
Service Worker while preserving that Service Worker for Contact, Review,
Success, Risk/hCaptcha and Submission.

### Exact Inquiry selection ownership

The Service Worker treats only these navigation variants as Astro-owned:

```text
/inquiry
/inquiry/
/inquiry/index.html
```

The matcher uses exact pathname Set membership. It explicitly does not absorb:

```text
/inquiry/contact/
/inquiry/review/
/inquiry/success/
```

Existing APP/RUNTIME cache entries matching the Inquiry selection document are
purged during both Service Worker install and activate. Navigation ownership is:

```text
Home
→ Catalog
→ PDP
→ Custom
→ Inquiry selection
→ remaining Legacy Contact / Review / Success routes
```

Inquiry selection navigation uses:

```text
network-only
cache=no-store
offline.html only when the network is unavailable
```

The historical `dreamland-pwa-v129` cache/release version remains unchanged.
R4.7D uses exact route cleanup rather than widening this hardening stage into a
global PWA release migration.

The remaining Legacy conversion PWA shell is intentionally preserved. R4.7D
does not remove shared Inquiry state, Contact, Risk, Submission or
InquirySubmissionFlow assets because the downstream conversion chain still
depends on that boundary.

### Production Inquiry payload budgets

R4.7D validates the final Production Inquiry selection document:

```text
Inquiry HTML raw                 <= 256 KiB
inquiryRuntimeState raw          <= 128 KiB
Shared Inquiry runtime raw       <= 112 KiB
Astro styles raw                 <= 128 KiB
HTML + JS + CSS gzip proxy       <= 128 KiB
Critical HTML + JS + CSS raw     <= 512 KiB
Executable route runtimes        = 1
Runtime Product lookup           = 89
```

The executable graph must contain only `/r4-inquiry-runtime.js`. The runtime
state remains R4.7B-owned and continues to use:

```text
productManualLang
productManualV2State
version=2
contact=/inquiry/contact/
```

Every Product cover referenced by `inquiryRuntimeState` must exist in the
final Production output.

### Runtime and conversion boundary

The Inquiry runtime remains detached from:

```text
Service Worker registration
DreamlandPwa
DreamlandContact
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandInquirySubmissionFlow
startup-loader
browser data fetches
```

Contact, Review and Success remain Legacy-owned. R4.7D does not migrate or
rewrite their Risk/hCaptcha/Submission closure.

### R4.7 exit

After R4.7D passes:

```text
R4.7A Astro Inquiry Static Presentation       CLOSED
R4.7B Inquiry Minimal Runtime                 CLOSED
R4.7C Production Inquiry Cutover              CLOSED
R4.7D Inquiry Legacy Detachment / Hardening   CLOSED
R4.7 Inquiry Migration                        CLOSED
```

Production ownership is then:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Astro Inquiry
/inquiry/contact/         → Legacy MPA
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

The next migration target is the downstream Contact conversion route.

## R4.8A — Astro Contact Static Presentation

Status: isolated presentation migration stage.

R4.8A adds a real Astro `/inquiry/contact/` document to the isolated
`.r4-astro-dist/` build while Production Contact, Review and Success remain
Legacy-owned.

Build-time ownership is:

```text
data/site-content.json
data/i18n.json
        ↓
DreamlandLocalizationPolicy
DreamlandContact (storage=null)
DreamlandInquiry (storage=null, version=2)
        ↓
src/astro/lib/contact-view-model.mjs
        ↓
Astro static Contact presentation
```

The real Contact draft and Inquiry selection exist only in browser state.
R4.8A therefore does not invent either. DreamlandContact is configured without
storage and must produce an empty eight-field draft:

```text
name
company
country
city
email
phone
buyerType
message
```

DreamlandInquiry is also configured without storage and must preserve its honest
empty build-time summary:

```text
itemCount=0
productCount=0
customCount=0
productQuantity=0
estimatedTotal=0
```

The static presentation preserves the current business-contact structure:

```text
01 Inquiry      complete
02 Contact      active
03 Review

Contact person
- Contact Name        required
- Company / Brand     optional
- Buyer Type          optional

Location
- Country / Region    required
- City                optional

Contact details
- Email               required
- WhatsApp / Phone / WeChat required

Additional information
- Other Notes         optional

Inquiry snapshot
- Items: 0
- Total Quantity: 0
- Estimated product amount: —

What happens after submission
- existing localized three-step copy
```

All eight form controls and Review Inquiry are rendered but disabled. Back to
Inquiry remains a normal document link to `/inquiry/`.

R4.8A is intentionally zero-client-JS. It does not read localStorage, restore
the Contact draft, execute `hasInquiry`, validate fields or navigate to Review.
Those behaviors belong to R4.8B.

The canonical route guard remains unchanged:

```text
/inquiry/contact/
public=false
guard=hasInquiry
```

The isolated Contact route remains:

```text
robots=noindex,nofollow
canonical=https://dreamland-catalog.pages.dev/inquiry/contact/
```

R4.8A does not migrate or load:

```text
Review
Success
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandInquirySubmissionFlow
Service Worker registration
DesktopExperience
startup-loader
browser data fetches
```

Production ownership remains unchanged:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Astro Inquiry
/inquiry/contact/         → Legacy MPA
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

R4.8B will activate only the Contact-route browser responsibilities: the shared
`dreamlandContactDraftV1` draft with its existing 24-hour TTL, the canonical
`hasInquiry` route guard, Contact field validation, EN/ZH/KO presentation,
Inquiry snapshot hydration and navigation to the still-Legacy Review route.
Risk/hCaptcha and final Submission remain downstream and are not part of the
Contact runtime migration.

## R4.8B — Contact Minimal Runtime

Status: isolated runtime migration stage.

R4.8B activates the isolated Astro `/inquiry/contact/` presentation without
changing Production Contact ownership.

### Runtime ownership

The isolated Contact document contains exactly one executable route asset:

```text
/r4-contact-runtime.js
```

The bundle is assembled from the existing canonical owners:

```text
DreamlandPricingPolicy
+
DreamlandInquiry
+
DreamlandContact
+
src/astro/runtime/contact-runtime.js
```

DreamlandContact remains the sole owner of Contact normalization, draft
persistence, the 24-hour draft TTL and field validation. DreamlandInquiry
remains the owner of the shared Inquiry state and derived summary.
DreamlandPricingPolicy remains the owner of Product estimate calculation.

### Shared state and route guard

R4.8B uses the existing cross-route storage contracts:

```text
language = productManualLang
inquiry  = productManualV2State
version  = 2
contact  = dreamlandContactDraftV1
TTL      = 24 hours
```

The canonical Contact route guard remains:

```text
guard=hasInquiry
```

On boot, the runtime hydrates DreamlandInquiry from the shared browser state.
If the Inquiry is empty, Contact stays inert and navigation is replaced with
`/inquiry/`. R4.8B does not create a second MOQ gate; the Inquiry selection
route remains responsible for its canonical continuation/MOQ check.

### Contact behavior

After `hasInquiry` passes, R4.8B activates the existing eight-field draft:

```text
name
company
country
city
email
phone
buyerType
message
```

DreamlandContact owns:

```text
loadDraft()
patch()
scheduleDraft(..., 250)
flushDraft()
validate()
```

The existing validation codes remain canonical:

```text
invalidName
countryRequired
invalidEmail
invalidPhone
```

A valid Continue action flushes the Contact draft and navigates to the
still-Legacy `/inquiry/review/` route. Back to Inquiry flushes the draft
before returning to `/inquiry/`.

### Real Inquiry snapshot

Contact hydrates the real shared Inquiry state. The Contact rail updates:

```text
Items
Total Quantity
Estimated product amount
Inquiry badge
```

Product amount is derived through DreamlandPricingPolicy using the same
`seriesMeta` and currency contracts as the Inquiry runtime. Custom projects
remain quoted separately through the existing Inquiry summary behavior.

### EN / ZH / KO

The Contact runtime uses `productManualLang` and activates the existing
language control. Contact copy, field labels/placeholders, Country / Region,
Buyer Type, header/footer and Inquiry summary currency presentation update from
build-time localized runtime state without browser data fetches.

### Lifecycle

R4.8B refreshes shared state on:

```text
storage
pageshow
visibilitychange
```

and flushes the Contact draft on `pagehide` / hidden visibility.

### Boundaries

R4.8B does not load or migrate:

```text
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandInquirySubmissionFlow
Service Worker registration
DesktopExperience
startup-loader
browser data fetches
```

The isolated Contact route remains:

```text
robots=noindex,nofollow
canonical=https://dreamland-catalog.pages.dev/inquiry/contact/
```

Production ownership remains unchanged:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Astro Inquiry
/inquiry/contact/         → Legacy MPA
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

R4.8C will perform the Production Contact route cutover while preserving
Review, Success, Risk/hCaptcha and Submission on the Legacy conversion boundary.

## R4.8C — Production Contact Cutover

Status: Production route ownership stage.

R4.8C promotes only the Contact document at:

```text
/inquiry/contact/
```

from the isolated Astro build into the final Production `dist/` output.

### Production promotion boundary

The route-scoped promoter copies:

```text
.r4-astro-dist/inquiry/contact/index.html
.r4-astro-dist/r4-contact-runtime.js
Contact-referenced /_astro/* assets
```

It does not copy the entire isolated Astro output and does not replace Review or
Success.

Immediately before promotion, `dist/inquiry/contact/index.html` must still be
the Legacy MPA generated by `build:pages`. Immediately after promotion the
Contact document must expose:

```text
data-r4-astro-contact=true
data-contact-runtime-presentation
contactRuntimeState
/r4-contact-runtime.js
robots=noindex,nofollow
canonical=https://dreamland-catalog.pages.dev/inquiry/contact/
```

The R4.8B runtime-state contract remains authoritative:

```text
version=R4.8B
language=productManualLang
inquiry=productManualV2State
inquiryVersion=2
contact=dreamlandContactDraftV1
contactTTL=24 hours
guard=hasInquiry
review=/inquiry/review/
```

### Production ownership after R4.8C

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Astro Inquiry
/inquiry/contact/         → Astro Contact
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

The Production manifest records:

```text
contactOwner=astro
contactCutover=B7-00B.4J-R4.8C
presentationOverrides.contact=astro-r4.8c
```

Home, Catalog, all 89 PDPs, Custom, Inquiry, Review, Success and `sw.js` are
sentinel-protected during Contact promotion.

### Service Worker boundary

R4.8C intentionally does not modify `sw.js`.

The existing `dreamland-pwa-v129` Service Worker still has no dedicated
Contact navigation matcher, so Contact cache ownership is not considered
closed in R4.8C. Exact Contact document cache purge, network-only navigation and
remaining Review/Success PWA boundary hardening belong to R4.8D.

R4.8C therefore must not introduce:

```text
CONTACT_NAVIGATION_PATHS
isContactNavigation()
purgeLegacyContactEntries()
contactNetworkOnly()
```

### Downstream conversion boundary

R4.8C does not migrate:

```text
/inquiry/review/
/inquiry/success/
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandInquirySubmissionFlow
```

The Contact runtime may navigate to the existing Review route only after
canonical DreamlandContact validation succeeds.

### R4.8C exit

R4.8C is complete when:

```text
npm run check
npm run build
```

both pass with Production Contact Astro-owned and Review/Success still
Legacy-owned.

R4.8D will perform Contact Legacy Detachment / Production Payload Hardening.

## R4.8D — Contact Legacy Detachment / Production Payload Hardening

Status: Production hardening stage.

R4.8C moved the Production `/inquiry/contact/` document to Astro. R4.8D closes
its remaining indirect Legacy document path through the existing Service Worker
while preserving that Service Worker for Review, Success, Risk/hCaptcha and
Submission.

### Exact Contact document ownership

The Service Worker treats only these Contact document navigation variants as
Astro-owned:

```text
/inquiry/contact
/inquiry/contact/
/inquiry/contact/index.html
```

The matcher uses exact pathname Set membership and explicitly does not absorb:

```text
/inquiry/review/
/inquiry/success/
```

Existing APP/RUNTIME cache entries matching the Contact document are purged on
both Service Worker install and activate.

Navigation ownership becomes:

```text
Home
→ Catalog
→ PDP
→ Custom
→ Inquiry selection
→ Contact
→ remaining Legacy Review / Success
```

Contact navigation uses:

```text
network-only
cache=no-store
offline.html only when the network is unavailable
```

The historical `dreamland-pwa-v129` cache/release version remains unchanged.
R4.8D performs exact route cleanup rather than widening this stage into a global
PWA release migration.

### Remaining Legacy conversion shell

R4.8D does not remove the shared Contact domain/desktop assets from the existing
Legacy APP_SHELL. Review and Success still run through the Legacy
DesktopExperience conversion family, whose configuration requires the Contact
presentation module as a dependency.

The remaining Review/Success shell therefore continues to retain:

```text
runtime-pwa
runtime-page-guards
DreamlandContact
DesktopExperience
DesktopContact
DesktopReview
DesktopSuccess
Risk
Submission
InquirySubmissionFlow
```

This is a downstream compatibility requirement, not Contact document ownership.

### Production Contact payload budgets

R4.8D validates the final Production Contact route against:

```text
Contact HTML raw                 <= 256 KiB
contactRuntimeState raw          <= 192 KiB
Shared Contact runtime raw       <= 160 KiB
Astro styles raw                 <= 160 KiB
HTML + JS + CSS gzip proxy       <= 144 KiB
Critical HTML + JS + CSS raw     <= 640 KiB
Executable route runtimes        = 1
```

The executable graph must contain only `/r4-contact-runtime.js`.

The R4.8B runtime-state contract remains authoritative:

```text
version=R4.8B
languages=en,zh,ko
language=productManualLang
inquiry=productManualV2State
inquiryVersion=2
contact=dreamlandContactDraftV1
contactTTL=24 hours
guard=hasInquiry
review=/inquiry/review/
```

### Runtime boundary

The Contact runtime remains detached from:

```text
Service Worker registration
DreamlandPwa
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandInquirySubmissionFlow
startup-loader
browser data fetches
```

Review and Success remain Legacy-owned. Risk/hCaptcha and final Submission are
not migrated or rewritten by R4.8D.

### R4.8 exit

After R4.8D passes:

```text
R4.8A Astro Contact Static Presentation       CLOSED
R4.8B Contact Minimal Runtime                 CLOSED
R4.8C Production Contact Cutover              CLOSED
R4.8D Contact Legacy Detachment / Hardening   CLOSED
R4.8 Contact Migration                        CLOSED
```

Production ownership is then:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Astro Inquiry
/inquiry/contact/         → Astro Contact
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

The next migration target is the downstream Review conversion route.

## R4.9A — Astro Review Static Presentation

Status: isolated presentation migration stage.

R4.9A adds a real Astro `/inquiry/review/` document to the isolated
`.r4-astro-dist/` build while Production Review and Success remain Legacy-owned.

### Canonical build-time ownership

The static Review view is derived from:

```text
data/site-content.json
        ↓
DreamlandLocalizationPolicy
DreamlandInquiry (storage=null, version=2)
DreamlandContact (storage=null, 24h contract)
DreamlandPageGuards
        ↓
src/astro/lib/review-view-model.mjs
        ↓
Astro static Review presentation
```

Browser Inquiry and Contact state are intentionally unavailable during the
static build. R4.9A therefore preserves an honest empty projection:

```text
Inquiry items          = 0
Product quantity       = 0
Custom projects        = 0
Estimated total        = 0
Inquiry ID             = empty
Contact fields         = empty × 8
```

No fake buyer, Product or submission data is introduced.

### Guard metadata

The canonical route remains:

```text
/inquiry/review/
public=false
guard=hasValidContact
```

DreamlandPageGuards evaluates the empty build-time state as:

```text
allowed=false
code=INQUIRY_REQUIRED
target=/inquiry/
```

R4.9A records this result as presentation metadata only. It does not execute a
browser redirect; Review route guard activation belongs to R4.9B.

### Static presentation

The page preserves the existing Review information architecture:

```text
01 Inquiry      complete
02 Contact      complete
03 Review       active

01 Contact details
- canonical eight-field Contact snapshot
- Edit → /inquiry/contact/

02 Inquiry items
- honest empty state
- Edit → /inquiry/

03 Before submission
- existing localized quotation/order notice

Inquiry overview rail
- Inquiry ID: —
- Estimated product amount: —
- Privacy consent: disabled
- Submit Inquiry: disabled
```

The language control is rendered but disabled.

The route remains:

```text
robots=noindex,nofollow
canonical=https://dreamland-catalog.pages.dev/inquiry/review/
```

### Explicit boundaries

R4.9A is zero-client-JS and does not load or execute:

```text
DreamlandRisk / hCaptcha
DreamlandSubmission
DreamlandInquirySubmissionFlow
Service Worker registration
DesktopExperience / DesktopReview
startup-loader
browser data fetches
Success navigation
```

Production ownership remains:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Astro Inquiry
/inquiry/contact/         → Astro Contact
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

R4.9B will activate only the Review-route browser responsibilities: shared
Inquiry + Contact hydration, canonical `hasValidContact` guard execution,
EN/ZH/KO presentation and Review projection refresh.

Risk/hCaptcha, privacy-consent submission orchestration, final Submission and
Success navigation remain downstream and are not activated by R4.9B.

## R4.9B — Review Minimal Runtime

Status: isolated runtime migration stage.

R4.9B activates the isolated Astro `/inquiry/review/` presentation without
changing Production Review ownership.

### Canonical owners

The isolated Review document contains one executable route asset:

```text
/r4-review-runtime.js
```

The runtime bundle is assembled from:

```text
DreamlandPricingPolicy
DreamlandInquiry
DreamlandContact
DreamlandPageGuards
src/astro/runtime/review-runtime.js
```

DreamlandInquiry remains the sole Inquiry state, pricing-view and projection
owner. DreamlandContact remains the Contact draft/validation owner.
DreamlandPageGuards remains the Review route-guard owner.

### Shared browser state

R4.9B uses the existing contracts:

```text
language = productManualLang
inquiry  = productManualV2State
version  = 2
contact  = dreamlandContactDraftV1
TTL      = 24 hours
pending inquiry ID = dreamlandPendingInquiryIdV1
```

No second Review state store is created.

### Canonical hasValidContact guard

On boot and lifecycle refresh, Review hydrates Inquiry + Contact first and calls:

```text
DreamlandPageGuards.evaluate('review', { inquiry, contact })
```

Canonical outcomes remain:

```text
no Inquiry
→ INQUIRY_REQUIRED
→ /inquiry/

Inquiry present + invalid Contact
→ CONTACT_REQUIRED
→ /inquiry/contact/

Inquiry present + valid Contact
→ allowed
```

The adapter does not duplicate Contact validation rules.

### Review projection

After the guard passes, Review calls the canonical:

```text
DreamlandInquiry.buildProjection(...)
```

with the current Contact snapshot, language and existing pending Inquiry ID.
Projection adapters are configured from the same Product, scent, series,
currency and localization data already used by the Astro Inquiry runtime.

The presentation refreshes:

```text
eight-field Contact snapshot
Product projection rows
Custom project projection rows
Inquiry ID
Estimated product amount
Inquiry header badge
EN / ZH / KO copy
```

The pending Inquiry ID uses the existing `dreamlandPendingInquiryIdV1`
browser key and preserves the existing `DL-YYYYMMDD-XXXXXX` format.

### Lifecycle

Review refreshes shared state on:

```text
storage
pageshow
visible visibilitychange
```

Changing `productManualLang` rebuilds the canonical Inquiry projection with
the selected locale; there are no browser data fetches.

### Submission boundary remains closed

R4.9B intentionally keeps both controls inert:

```text
Privacy consent = disabled
Submit Inquiry   = disabled
```

R4.9B does not load, initialize or call:

```text
DreamlandRisk
hCaptcha
DreamlandSubmission
DreamlandInquirySubmissionFlow
Service Worker registration
DesktopExperience / DesktopReview
startup-loader
Success navigation
browser fetch / XMLHttpRequest
```

Production ownership remains:

```text
/                         → Astro Home
/products/                → Astro Catalog
/products/{productId}/    → Astro PDP × 89
/custom/                  → Astro Custom
/inquiry/                 → Astro Inquiry
/inquiry/contact/         → Astro Contact
/inquiry/review/          → Legacy MPA
/inquiry/success/         → Legacy MPA
```

The next Review stage must close the Risk/privacy/submission boundary before any
Production Review cutover. Production Review must not move to Astro while
Submit Inquiry is intentionally inert.
