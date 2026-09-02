# DREAMLAND B7-00B.4J R4.2 — Domain Core Extraction

## R4.2A — Pricing / MOQ / Currency Policy

Status: migration stage.

R4.2A extracts deterministic commerce policy from the Legacy application shell.

### New canonical owner

```text
src/domain/pricing/runtime-pricing-policy.js
→ DreamlandPricingPolicy
```

It owns:

- Holiday pricing-series resolution;
- tier selection and next-tier selection;
- tier unit prices;
- packaging options/default/surcharges;
- per-series/per-size MOQ;
- product MOQ fallback;
- quantity normalization;
- CNY-to-base conversion;
- localized currency formatting/unit;
- Catalog reference-unit pricing.

### Legacy compatibility

`index.html` keeps the historical function names as thin adapters:

```text
money()
currencyUnit()
cnyToBase()
pricingSeriesFor()
tierFor()
currentTierIndex()
nextTierFor()
tierUnitCny()
packOptions()
defaultPack()
packSurchargeCny()
catalogUnit()
moqForSeriesSize()
defaultProductSize()
productMoq()
normalizeQty()
```

Those functions no longer own the underlying policy.

### Not changed in R4.2A

- Product/series/currency source data;
- displayed price values;
- Inquiry persistence;
- Detail state;
- Risk/hCaptcha;
- Web3Forms Browser Direct;
- Production page builder;
- Astro Production ownership;
- PWA strategy.

### Remaining R4.2 work

R4.2B:
- canonical submission payload mapping.

R4.2C:
- localization/content-formatting boundary cleanup.

R4.2A must pass the historical pricing validators plus the new Domain pricing gate.
