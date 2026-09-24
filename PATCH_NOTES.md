# DREAMLAND B7-00B.4A R1.1

## Stage
Typography + Foundation Migration + Public Copy Fix

## Base
This is an **incremental patch** for:

`b7-00b4a-r1@cf4e11b4391dda0633c0473a62f165bf7d5aa068`

Do not apply it to `develop` or to the old pre-R1 tree.

## Scope

### Typography
- Adds a reliable Desktop `data-lang` presentation hook.
- English display copy may use editorial `text-wrap: balance`.
- Chinese display copy uses natural strict line breaking, not generic balance.
- Korean uses `word-break: keep-all`.
- At >=1280px, short Chinese Custom / Inquiry-flow / Success page displays use available width before creating a second line.

### Visual Foundation migration
- Warmer canvas / paper / surface palette.
- Smaller, more consistent UI and panel radius system.
- Custom form sections become divider-led editorial sections instead of large outer white cards.
- Contact form outer card is removed.
- PDP lower “Product information / Current configuration” cards become editorial divider sections.
- Inquiry / Review / Success summaries use shared semantic surfaces.
- Desktop boot background follows the Foundation palette.

### Inquiry progress
Changes the progress treatment from:

`line -> labels`

to:

`labels -> progress line`

Active / complete steps receive the stronger lower rule.

### Public-facing copy
Refreshes EN / ZH / KO copy for:
- Custom Project
- Inquiry
- Contact
- Review
- Success

The patch removes several internal/product-spec phrases such as:
- “先说清楚这是什么项目。”
- “在一个页面完成最终确认。”
- “谢谢，项目已经交给我们了。”
- “Everything in one place.”
- “Thank you. Your project is now with us.”

The Chinese customer-facing concept is also normalized from mixed “意向单 / 询价单” language toward clearer quotation/inquiry language in the Desktop site.

## Boundaries
Not changed:
- DreamlandInquiry canonical owner
- DreamlandContact canonical owner
- DreamlandDetail canonical owner
- DreamlandCustom canonical owner
- DreamlandInquirySubmissionFlow
- DreamlandSubmission
- DreamlandRisk
- MOQ / price / quantity / storage / submission logic
- Mobile presentation
- PWA boot/convergence architecture

The existing R1 release stays `b7-00b4a-r1-v99 / dreamland-pwa-v99` because R1.1 is an acceptance refinement inside the same unmerged R1 release.

## Apply

From the existing `b7-00b4a-r1` branch:

```bash
git rev-parse HEAD
# must be cf4e11b4391dda0633c0473a62f165bf7d5aa068

node APPLY_B7_00B_4A_R1_1.mjs
npm run check
```

If `npm run check` fails, do **not** reset or replay R1. Send the first failure from the current dirty tree for a successor acceptance fix.
