# Data ownership rules

## Product source of truth

`products.csv` is the **only manually maintained product source**.

`products.json` is a generated **active-product runtime fallback**.
Do not edit it by hand.

Generation contract:

```text
data/products.csv
        ↓
src/data/product-data-contract.js
        ↓
scripts/build-data.mjs
        ↓
filter status === active
        ↓
data/products.json
```

## Unified Product Data Contract

B1-02 establishes:

```text
src/data/product-data-contract.js
```

as the single implementation for:

- CSV product parsing semantics
- product field normalization
- product object mapping
- compatibility name overrides
- active-product fallback generation

Both consumers use the same contract:

```text
Browser
catalog-data.js
      ↓
shared product contract

GitHub / Node
scripts/build-data.mjs
      ↓
shared product contract
```

Do not add product mapping rules directly back into either consumer.

## Data ownership distinction

- `products.csv` contains the complete authoring dataset, including
  `active`, `hidden`, and `placeholder` rows.
- `products.json` intentionally contains **active products only** because
  it is a browser fallback.

## Browser-only editing workflow

When product information changes:

1. Edit only `data/products.csv`.
2. Commit to a non-`main` branch or `develop`.
3. `Sync generated product data` regenerates the active-only
   `data/products.json`.
4. The workflow runs generated-data checks, the shared contract check,
   and full project validation before committing a generated fallback.
5. PR/main quality checks verify the same contract again.

## Scope

B1-02 only unifies the **product data transformation contract**.

Scents, shared assets, `series.json`, and `i18n.json` remain under their
current ownership rules until later architecture phases.

## PDP editorial content contract

PDP-COPY-1A establishes a separate editorial/configuration-copy source:

```text
data/pdp-content.json
        ↓
src/data/pdp-content-contract.mjs
        ↓
PDP-COPY-1B presentation wiring
```

This file does **not** replace the product source of truth.

- `products.csv` remains the canonical Product dataset.
- `scents.csv` remains the canonical per-scent supplier / note / ratio dataset.
- `series.json` remains the canonical commercial Series dataset.
- `pdp-content.json` owns PDP editorial copy workflow and presentation-helper contracts.

### Approved Color Story state

PDP-COPY-1A.3 contains exactly 89 active Product entries:

```text
73 finalized Color Stories
16 Holiday placeholder stories
```

All entries are approved presentation copy in ZH / EN / KO.

Holiday deliberately keeps temporary placeholder copy until its real palette
imagery is reviewed. Holiday placeholder copy must remain distinguishable via:

```text
kind = placeholder
```

The remaining 73 entries use:

```text
kind = story
```

Twelve Masterpiece SKUs reuse their matching Advanced color-theme copy through
`sourceProductId`; split them only when visual review proves that the actual
palette is materially different.

### Scent Standard contract

Canonical supplier / ratio facts still come from `data/scents.csv`.

Approved PDP helper copy is presentation wording only:

- Classic → 上海依克塞汀 品牌香精 · 底模添加约 5%
- Advanced → 法国 Robertet Group 进口香精 · 底模添加约 8%
- Masterpiece → 美国 CandleScience 专业香精 · 底模添加约 10%

Holiday owns no fourth Scent Standard. It resolves helper copy from the
currently selected Classic / Advanced / Masterpiece scent series.

### Quantity helper contract

MOQ aggregation remains:

```text
aggregation key = series + size
mixed products  = allowed
cross size      = forbidden
```

Approved ZH helper:

```text
同系列 · 同尺寸可混款计起订量
```

### PDP-COPY-1B presentation wiring

Approved copy now reaches the canonical PDP through the route/view-model/runtime
projection. Components do not hardcode Color Story, Scent helper, or Quantity helper
text.

```text
data/pdp-content.json
        ↓
src/data/pdp-content-contract.mjs
        ↓
pdp-view-model.mjs
        ↓
PdpPage.astro + pdp-runtime.js
```

Ownership after wiring:

- Product hero description → approved Color Story.
- Scent helper → selected scent-series standard; Holiday changes dynamically with the selected series.
- Quantity helper → same-series + same-size mixed-product MOQ rule.
- Legacy parameter tags → suppressed from PDP presentation because their information now has explicit owners.
- Holiday Color Story → approved placeholder only until visual review replaces it.
