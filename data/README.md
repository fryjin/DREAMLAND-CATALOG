# Data ownership rules

## Product source of truth

`products.csv` is the **only manually maintained product source**.

`products.json` is a generated **active-product runtime fallback**.
Do not edit it by hand.

Generation contract:

```text
data/products.csv
        ↓
scripts/build-data.mjs
        ↓
filter status === active
        ↓
data/products.json
```

Important distinction:

- `products.csv` contains the complete authoring dataset, including
  `active`, `hidden`, and `placeholder` rows.
- `products.json` intentionally contains **active products only** because
  it is a browser fallback, matching the existing project validation contract.

The browser runtime remains unchanged in B1-01:

1. `catalog-data.js` still loads `products.csv` first.
2. `products.json` remains the fallback if CSV loading fails.
3. The generated JSON uses the same field mapping as the existing CSV runtime mapper.
4. Hidden/placeholder products must never enter the fallback JSON.

## Browser-only editing workflow

When product information changes:

1. Edit only `data/products.csv`.
2. Commit to a non-`main` branch or `develop`.
3. `Sync generated product data` regenerates the active-only
   `data/products.json`.
4. The sync workflow runs `data:check` and full project validation before
   committing the generated fallback.
5. The `quality-check` gate verifies synchronization again on PR/main.

If repository-level GitHub Actions permissions prevent bot writes, enable
**Read and write permissions** for Actions. Do not return to manually editing
`products.json` as the normal workflow.

## Scope of B1-01

Only product data is unified in this phase. `series.json`, `i18n.json`,
scents and shared assets remain under their current ownership rules until
later B1 phases.
