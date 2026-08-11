# Data ownership rules

## Product source of truth

`products.csv` is the **only manually maintained product source**.

`products.json` is a generated runtime fallback. Do not edit it by hand.

Generation contract:

```text
data/products.csv
        ↓
scripts/build-data.mjs
        ↓
data/products.json
```

The browser runtime is intentionally unchanged in B1-01:

1. `catalog-data.js` still loads `products.csv` first.
2. `products.json` remains the fallback if CSV loading fails.
3. The generated JSON uses the same mapping rules as the existing CSV runtime mapper.

## Browser-only editing workflow

When product information changes:

1. Edit only `data/products.csv`.
2. Commit to a non-`main` branch or `develop`.
3. `Sync generated product data` regenerates `data/products.json` and commits it to the same branch.
4. The `quality-check` gate verifies synchronization before merging to `main`.

If repository-level GitHub Actions permissions prevent bot writes, run the workflow manually after enabling **Read and write permissions** for Actions. Do not fall back to manually editing `products.json` as a normal workflow.

## Scope of B1-01

Only product data is unified in this phase. `series.json`, `i18n.json`, scents and shared assets remain under their current ownership rules until later B1 phases.
