# DREAMLAND B7-00B.4A R1 — Desktop Visual Refresh Foundation

Base: `develop@ef32575f48e81378d8907636119a937bc99b7c73`

Release after apply:
- Client: `b7-00b4a-r1-v99`
- PWA: `dreamland-pwa-v99`

## Scope

- Expanded semantic Desktop design tokens.
- New shared `primitives.css` for typography, actions, surfaces, forms, choices, media, focus and motion.
- Typography / line-breaking normalization across the existing Desktop DOM:
  - editorial heading `text-wrap: balance`
  - body `text-wrap: pretty`
  - Korean `word-break: keep-all`
  - short commercial/action labels use `white-space: nowrap`
  - known short summary headings remain one line at >=1280px
  - responsive fallback remains available at 1024–1199px
- All current Desktop screens receive an explicit Desktop-owned shell successor rule.
- New `desktop:visual-foundation` validator.
- Release / Service Worker / historical Desktop release gates advanced to v99.

## Intentionally unchanged

- Business owners and state.
- Pricing / MOQ / quantity logic.
- Inquiry / Contact storage.
- Submission / Risk / Captcha.
- Desktop runtime routing.
- Home / Catalog / PDP / Custom / Inquiry DOM composition.
- Startup Loader / Desktop boot architecture.

## Apply

```bash
git switch develop
git pull
git rev-parse HEAD
# Must be ef32575f48e81378d8907636119a937bc99b7c73

git switch -c b7-00b4a-r1
unzip DREAMLAND-CATALOG_B7-00B.4A_R1_Foundation_Patch.zip
node APPLY_B7_00B_4A_R1.mjs
npm run check
```

Do not run the patch twice.

If `npm run check` reports an Acceptance Gate mismatch, keep the dirty tree and report the **first failure only**; do not reset and do not reapply an older patch.

## Real Preview focus

Validate at 1024 / 1280 / 1440 / 1920 and EN / ZH / KO:

1. Header navigation and Inquiry CTA stay single-line.
2. Short summary headings do not wrap unnecessarily on normal Desktop widths.
3. Long editorial titles wrap deliberately and remain balanced rather than breaking awkwardly.
4. Korean headings do not split semantic words unexpectedly.
5. No horizontal overflow from `nowrap` controls at 1024px.
6. Home / Catalog / PDP / Custom / Inquiry / Contact / Review / Success remain Desktop-native.
7. Mobile below 1024px remains unchanged.
8. No Desktop -> Mobile startup flash.
