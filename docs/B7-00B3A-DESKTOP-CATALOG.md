# B7-00B.3A — Desktop Catalog

## Goal

Replace the >=1024px Catalog phone-frame fallback with a dedicated PC
independent-site Catalog while preserving the existing Mobile Catalog renderer.

## Ownership

```text
Canonical product data / pricing helpers
        ↓
App bridge
        ↓
DreamlandDesktopCatalogView
(pure desktop browsing state)
        ↓
DreamlandDesktopCatalog
(desktop DOM only)
```

The new Desktop Catalog ViewState owns only:

- scope: `all / advanced / masterpiece / holiday / classic`
- search query
- size filters
- sort mode
- 24-item visible limit
- SPA-session scroll restoration

It does **not** own product data, pricing rules, inquiry data, localStorage,
Detail state, Contact state or Submission state.

## Desktop behavior

- `>=1440px`: 4-column grid.
- `1024–1199px`: 3-column grid.
- Product image ratio: 4:5.
- Hover/focus: stable image + subtle scale + `View details →`.
- No angle-image swap.
- No Desktop quick-add `+`.
- Search covers Product ID, zh/en/ko names and tags.
- Size filter supports S/M/L/XL multi-select.
- Sort supports Featured, Name, Price low/high and MOQ low.
- Initial render: 24 products.
- Explicit `Load more` adds 24.
- Catalog → PDP → Catalog preserves browsing state and scroll position.

## Mobile protection

`src/ui/catalog/runtime-catalog-renderer.js` remains the B6-02 Mobile Catalog
renderer. Its batch loading and Quick Add behavior are intentionally unchanged.

## Desktop fallback status after this stage

```text
Home       → Desktop
Catalog    → Desktop
Detail     → temporary Mobile fallback
Custom     → temporary Mobile fallback
Inquiry    → temporary Mobile fallback
Contact    → temporary Mobile fallback
Preview    → temporary Mobile fallback
Success    → temporary Mobile fallback
```

The next priority should be Desktop PDP so the primary path becomes:

```text
Desktop Home → Desktop Catalog → Desktop PDP
```
