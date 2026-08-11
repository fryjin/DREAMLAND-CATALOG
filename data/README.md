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
