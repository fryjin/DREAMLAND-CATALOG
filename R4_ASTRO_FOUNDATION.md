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

