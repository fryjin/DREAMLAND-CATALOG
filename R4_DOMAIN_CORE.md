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

## R4.2B — Canonical Submission Payload Mapping

Status: migration stage.

### New canonical owner

```text
src/domain/submission/runtime-submission-payload.js
→ DreamlandSubmissionPayload
```

It owns:

- provider delivery field mapping from the canonical Inquiry Projection;
- email/contact delivery aliases;
- payload JSON serialization for Contact/Product/Custom snapshots;
- provider subject/from-name fallbacks;
- final delivery-payload validation codes.

`DreamlandInquiry` remains the Projection owner.
`DreamlandSubmission` remains the browser-direct/Gateway transport owner.
`DreamlandInquirySubmissionFlow` remains the submission transaction owner.

`index.html` keeps only thin compatibility wrappers for
`submissionEmailValid()`, `validateSubmissionPayload()` and
`buildWeb3FormsPayload()` during Legacy Presentation migration.

## R4.2C — Localization / Content Formatting Boundary

Status: migration stage.

### New canonical owner

```text
src/domain/localization/runtime-localization-policy.js
→ DreamlandLocalizationPolicy
```

It owns shared deterministic UI/choice/series/product/scent fallback policy, language-specific from-price ordering, locale resolution and date formatting.

It deliberately does not own language persistence, DOM application, SEO/meta mutation, currency conversion/money formatting, PWA copy, Risk/CAPTCHA copy or page-specific sentence composition.

### R4.2 Exit

R4.2 Domain Core Extraction is ready to close when all gates pass:

```text
r4:domain:pricing
→ r4:domain:submission-payload
→ r4:domain:localization
→ r4:astro:foundation
```

The next architecture stage is R4.3 Home migration into Astro.
