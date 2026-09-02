# DREAMLAND R4.1 — Astro Build Foundation

## Status

This is an isolated build proof of concept.

It does **not** replace the current Production build.

Production remains:

```text
npm run build
→ data:build
→ scripts/build-pages.mjs
→ dist/
```

R4 Astro proof:

```text
npm run r4:astro:foundation
→ Astro static build
→ .r4-astro-dist/
→ foundation validator
```

## Proven in R4.1

- Astro can coexist with the current repository.
- Astro builds static HTML with no client JavaScript for static pages.
- Existing data/page-routes.json remains the URL contract.
- Existing generated data/products.json can drive build-time product routes.
- Every active product gets a static /products/{ID}/ proof page.
- Existing Production build and Cloudflare deployment output remain untouched.
- GitHub validation workflows install project dependencies through npm ci.

## Explicitly not migrated

- Production Home UI
- Catalog UI
- Product Detail UI
- Custom
- Inquiry / Contact / Review / Success
- Pricing / MOQ / Currency
- Risk / hCaptcha
- Web3Forms Browser Direct
- Service Worker / PWA
- scripts/build-pages.mjs
- index.html

The next architecture phase is Domain Core Extraction.
