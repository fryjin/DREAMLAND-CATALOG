# B6 Exit Regression

Baseline entering the Exit stage:

```text
develop@31a9b4fd44c3485c3ec7822f00f1033b68a9a500
```

## Purpose

B6 Exit does not introduce another product Feature.

The frontend architecture remains:

```text
FRONTEND_FOUNDATION.phase = B6-06
runtimeIntegration = partial
```

Exit adds a persistent regression gate over the complete B6 result.

## B6 stages covered

```text
B6-01  Catalog State / ViewModel
B6-02  Catalog Renderer
B6-03  Detail State / Configuration
B6-04  Detail Renderer
B6-04.1 Product Data Alignment
B6-05  Custom Request Feature
B6-06  Shared / Compatibility Cleanup
```

## End-to-end runtime path

The Exit validator executes an in-memory integration workflow using repository
data:

```text
products.json / series.json / scents.csv
→ DreamlandCatalog
→ DreamlandDetail
→ DreamlandInquiry
→ DreamlandCustom
→ DreamlandContact
→ Inquiry Projection
```

It verifies:

```text
89 active products
46 active Masterpiece products
per-series counts equal series.json
zh / en / ko critical UI contract
Catalog filtering/counts
Detail product open + pricing/MOQ
Detail → Inquiry merge
Inquiry → Detail edit round-trip
Custom actual scent selection
Custom → Inquiry insertion
Contact validation + draft restore
Projection product/custom counts
Projection estimated total
clean Custom scent output
newline-delimited items_summary
Inquiry persistence
frozen projection snapshots
```

## Exit fixes included

### 1. Remove leaked Custom fallback source text

Before:

```text
scent display ||ui('scentRecommend')
```

The `||ui(...)` fragment was historical compatibility text, not executable
fallback logic.

After:

```text
scent display
or localized scentRecommend fallback
```

### 2. Make items_summary human-readable

Before:

```text
product summarycustom summary
```

After:

```text
product summary
custom summary
```

The transport field now joins entries with `\n`.

### 3. Reset Custom multi-scent state after successful submission

`resetSubmittedFormUi()` now explicitly calls:

```text
customScentUi.reset()
```

so a new inquiry does not inherit the prior submitted Custom scent selection.

## PWA

Because `index.html` and `runtime-inquiry.js` change:

```text
dreamland-pwa-v84
→ dreamland-pwa-v85
```

B6-06 keeps ownership of architecture cleanup, but no longer owns a fixed v84
cache version. The B6 Exit validator owns the v85 release gate.

## Persistent command

```bash
npm run b6:exit
```

`npm run validate` ends with:

```text
npm run compatibility:cleanup
&& npm run b6:exit
```

so future changes cannot bypass the B6 total regression gate.

## Known non-blocking follow-up items

These are not introduced by B6 Exit and are not treated as Exit blockers:

```text
15 fallback shared assets still reported missing by validate-project
16 active scents still reported with incomplete Korean localization
the unresolved Masterpiece IDs intentionally remain non-active under B6-04.1
```

They should be handled as independent content/resource maintenance work, not by
re-opening the B6 architecture migration.
