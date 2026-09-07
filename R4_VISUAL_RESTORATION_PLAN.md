# DREAMLAND R4.11 — Visual Restoration / Develop Parity

Status: **QUEUED — execute only after architecture migration is frozen.**

## Why this stage exists

The R4 architecture migration intentionally prioritized route ownership,
canonical domain/runtime boundaries, payload control and PWA detachment. During
that work, parts of the previously approved DREAMLAND visual presentation were
overwritten by migration-safe Astro presentation layers.

After the architecture refactor is complete, DREAMLAND requires a dedicated
visual restoration pass for **PC + Mobile**.

This is not a return to the Legacy architecture.

## Locked visual reference

The visual reference is the rendered behavior of:

```text
branch: develop
commit: a6039e52900d966b0f3110da8458a393434127d8
```

This commit is the reference snapshot recorded when the restoration plan was
created.

The implementation baseline for R4.11 will be the then-current post-refactor
Astro architecture. `develop` is a **visual reference only**.

Do **not**:

- merge `develop` into the post-refactor branch to restore visuals;
- cherry-pick Legacy presentation/runtime commits as an architecture shortcut;
- restore `DreamlandDesktopExperience` ownership merely to recover styling;
- replace canonical R4 domain/runtime owners with Legacy UI logic.

## Start condition

R4.11 starts only after the architecture route migration and detachment work is
closed and the implementation has entered an architecture freeze.

Nominal sequence:

```text
R4.10C  Production Success Cutover
R4.10D  Success Legacy/PWA Detachment + final conversion hardening
        ↓
architecture freeze
        ↓
R4.11   Visual Restoration / Develop Parity
```

If additional architecture stages are discovered after R4.10D, R4.11 remains
queued until those stages close.

## Route coverage

Visual restoration covers the complete user-facing route family:

```text
/
products/
products/{productId}/
custom/
inquiry/
inquiry/contact/
inquiry/review/
inquiry/success/
```

Shared UI coverage includes:

- site Header / navigation / language selector;
- Footer;
- typography scale and weight;
- spacing rhythm and max-width behavior;
- hero composition;
- image crop / aspect ratio / focal treatment;
- cards, chips, pills, borders, shadows and radii;
- CTA hierarchy and interaction feedback;
- Product configuration layout;
- Custom project layout;
- Inquiry / Contact / Review forms and summaries;
- Success confirmation;
- responsive breakpoints and transitions;
- motion/hover/pressed states where they existed in the approved presentation.

## Device baselines

Primary PC references:

```text
1440 × 900
1920 × 1080
```

Primary mobile references:

```text
390 × 844
430 × 932
```

Regression-only intermediate checks:

```text
768 × 1024
1024 × 768
```

The intermediate sizes are not separate visual targets; they ensure responsive
convergence between the PC and mobile compositions.

## R4.11A — Visual Baseline Freeze & Diff Matrix

1. Run `develop@a6039e52900d966b0f3110da8458a393434127d8` and capture deterministic screenshots for
   every route/device baseline.
2. Seed deterministic Inquiry/Review/Success state only in the visual test
   harness so guarded routes can be compared.
3. Capture the post-architecture implementation at the same viewport sizes and
   content/state.
4. Produce a route-by-route visual diff matrix:
   - structure;
   - typography;
   - spacing;
   - images;
   - controls;
   - responsive behavior;
   - interaction/motion.
5. Classify differences:
   - **RESTORE** — approved visual behavior lost during refactor;
   - **KEEP-R4** — architectural/accessibility/performance improvement that must
     not be reverted;
   - **REVIEW** — intentional product/content change requiring a decision.

No production styling should be changed in R4.11A.

## R4.11B — PC Visual Restoration

Restore the approved desktop visual system against the locked develop reference,
route by route, while keeping the R4 architecture.

Primary acceptance sizes:

```text
1440 × 900
1920 × 1080
```

PC work includes layout widths, section rhythm, hero proportions, card density,
product gallery/configuration proportions, inquiry flow composition,
Header/Footer behavior and desktop interaction states.

## R4.11C — Mobile Visual Restoration

Restore the approved mobile presentation independently rather than assuming the
desktop CSS can simply collapse.

Primary acceptance sizes:

```text
390 × 844
430 × 932
```

Mobile work includes navigation, viewport-safe spacing, typography, card
stacking, image crop, sticky/fixed actions where appropriate, form ergonomics,
Review readability and Success confirmation.

## R4.11D — Responsive Convergence & Visual Regression Gate

Final visual closure requires:

1. PC and Mobile reference comparisons approved.
2. Intermediate widths do not produce broken layout transitions.
3. No horizontal overflow.
4. No route regains Legacy runtime ownership.
5. Existing R4 state/guard/submission/PWA contracts remain green.
6. `npm run check` and `npm run build` remain green.
7. Performance regressions caused only by decoration are rejected or explicitly
   approved.
8. Accessibility semantics and keyboard/focus behavior are not sacrificed for
   pixel parity.

## Restoration principle

The target is:

```text
develop visual language
+
post-refactor R4 architecture
```

not:

```text
develop architecture
+
develop runtime stack
```

Visual parity is evaluated on rendered structure, hierarchy and responsive
behavior. Business content or flows that were intentionally changed after the
develop reference are not silently rolled back.
