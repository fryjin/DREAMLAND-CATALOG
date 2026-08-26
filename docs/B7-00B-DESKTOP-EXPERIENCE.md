# B7-00B Desktop Experience Architecture

## Status

B7-00B.0 architecture is locked and B7-00B.1 begins the formal Desktop
Presentation implementation.

The prior Desktop Foundation prototype is retired by B7-00B.1 R2 and is
removed from the repository. The formal implementation starts under
`src/ui/desktop/` and must not coexist with the prototype root files.

## Core rule

Desktop is a second Presentation Layer over the existing Feature/Data/Service
layers.

```text
Data
  ↓
Catalog / Detail / Inquiry / Custom / Contact Features
  ↓
┌─────────────────────┬──────────────────────────┐
│ Mobile Presentation │ Desktop Presentation     │
└─────────────────────┴──────────────────────────┘
  ↓
Storage / Media / PWA / Risk / Submission
```

Desktop may own presentation state such as hover, reveal, modal, gallery, or
render cursor.

Desktop must not own a second copy of:

- product configuration
- pricing or MOQ rules
- Inquiry items
- Custom intent
- Contact data

## Breakpoint

```text
< 1024px   existing Mobile / Tablet presentation
>=1024px   Desktop website presentation
```

B7-00B.1 formally owns only the Desktop Shell and Home page. Existing mobile
presentation remains as the temporary fallback for desktop pages that have not
yet received their dedicated renderer.

## B7-00B.1 ownership

```text
src/ui/desktop/runtime-desktop-experience.js
src/ui/desktop/shell/runtime-desktop-shell.js
src/ui/desktop/home/runtime-desktop-home.js
src/ui/desktop/styles/*
data/site-content.json
```

## Desktop Home

The formal home is an independent-site landing page:

1. Header
2. Hero
3. Collections
4. Featured pieces
5. Craft
6. Custom Made
7. Wholesale
8. Context-aware Inquiry CTA
9. Footer

Collection counts, product names, prices, MOQ and Inquiry count are derived
from existing runtime/data contracts. Editorial copy is stored separately in
`data/site-content.json`.

## Inquiry count

Desktop Header and Home CTA use:

```text
DreamlandInquiry.items().length
```

not the sum of product quantities.

Example:

```text
Misty Reeds × 100 pcs
→ INQUIRY 01
```

## Mobile freeze rule

Desktop work must not modify the existing Mobile renderer/UI unless a shared
business defect requires it. Every Desktop stage keeps the B7 real-device
baseline gate.
