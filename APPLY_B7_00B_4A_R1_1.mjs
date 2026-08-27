#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const EXPECTED_HEAD='cf4e11b4391dda0633c0473a62f165bf7d5aa068';
const changed=[];

function fail(message){
  console.error(`\n[B7-00B.4A R1.1] ${message}\n`);
  process.exit(1);
}

function read(relative){
  return fs.readFileSync(path.join(ROOT,relative),'utf8');
}

function write(relative,content){
  fs.writeFileSync(path.join(ROOT,relative),content,'utf8');
  if(!changed.includes(relative)){
    changed.push(relative);
  }
}

function replaceOnce(relative,oldText,newText,label){
  const source=read(relative);
  const count=source.split(oldText).length-1;

  if(count!==1){
    fail(`${label}: expected exactly one source marker in ${relative}, found ${count}.`);
  }

  write(relative,source.replace(oldText,newText));
}

function replaceAllLiteral(relative,replacements,label){
  let source=read(relative);

  for(const [oldText,newText] of replacements){
    const count=source.split(oldText).length-1;

    if(count!==1){
      fail(`${label}: expected one marker in ${relative}: ${oldText} (found ${count}).`);
    }

    source=source.replace(oldText,newText);
  }

  write(relative,source);
}

function appendOnce(relative,marker,addition){
  const source=read(relative);

  if(source.includes(marker)){
    fail(`${relative} already contains ${marker}; R1.1 appears to be applied.`);
  }

  write(relative,`${source.trimEnd()}\n\n${addition.trim()}\n`);
}

function assertHead(){
  let head='';

  try{
    head=execFileSync(
      'git',
      ['rev-parse','HEAD'],
      {
        cwd:ROOT,
        encoding:'utf8'
      }
    ).trim();
  }catch(error){
    fail(`Unable to read git HEAD: ${error.message}`);
  }

  if(head!==EXPECTED_HEAD){
    fail(
      `This incremental patch targets b7-00b4a-r1@${EXPECTED_HEAD}. `+
      `Current HEAD is ${head}. Do not reset; request a successor patch for the current tree.`
    );
  }
}

assertHead();

/* -------------------------------------------------------------------------- */
/* 1. Warm Editorial palette + tighter shared geometry                         */
/* -------------------------------------------------------------------------- */
replaceAllLiteral(
  'src/ui/desktop/styles/tokens.css',
  [
    ['--dw-canvas:#f5f3ef;','--dw-canvas:#f3efe9;'],
    ['--dw-surface:#faf8f4;','--dw-surface:#fbf8f3;'],
    ['--dw-card:#ffffff;','--dw-card:#fffdf9;'],
    ['--dw-sand:#e9e0d5;','--dw-sand:#e6dacd;'],
    ['--dw-sand-strong:#d8c9b8;','--dw-sand-strong:#d4c3b2;'],
    ['--dw-clay:#bfa38e;','--dw-clay:#b89b85;'],
    ['--dw-taupe:#988779;','--dw-taupe:#8c7a6d;'],
    ['--dw-ink:#171614;','--dw-ink:#181512;'],
    ['--dw-muted:#77736d;','--dw-muted:#756c64;'],
    ['--dw-soft:#a09b94;','--dw-soft:#9b928a;'],
    ['--dw-line:rgba(71,58,47,.12);','--dw-line:rgba(53,43,35,.14);'],
    ['--dw-color-surface-warm:#efe6dc;','--dw-color-surface-warm:#eee3d6;'],
    ['--dw-color-surface-warm-soft:#f3ece4;','--dw-color-surface-warm-soft:#f5eee6;'],
    ['--dw-color-line-strong:rgba(71,58,47,.22);','--dw-color-line-strong:rgba(53,43,35,.24);'],
    ['--dw-radius-xl:28px;','--dw-radius-xl:20px;'],
    ['--dw-radius-lg:22px;','--dw-radius-lg:14px;'],
    ['--dw-radius-md:14px;','--dw-radius-md:10px;'],
    ['--dw-radius-sm:8px;','--dw-radius-sm:6px;'],
    ['--dw-radius-control:12px;','--dw-radius-control:10px;'],
    ['--dw-radius-ui:14px;','--dw-radius-ui:12px;'],
    ['--dw-radius-panel:18px;','--dw-radius-panel:14px;'],
    ['--dw-radius-editorial:22px;','--dw-radius-editorial:18px;'],
    ['--dw-radius-campaign:28px;','--dw-radius-campaign:22px;']
  ],
  'Foundation palette / geometry migration'
);

appendOnce(
  'src/ui/desktop/styles/tokens.css',
  'B7-00B.4A R1.1 — Foundation migration',
  `/*
 * B7-00B.4A R1.1 — Foundation migration
 * Warm Editorial values now flow through the legacy aliases so B7-00B.1–3D
 * page composition adopts the same palette and geometry without moving
 * business or routing ownership.
 */`
);

/* -------------------------------------------------------------------------- */
/* 2. Reliable Desktop language hook for typography                           */
/* -------------------------------------------------------------------------- */
replaceOnce(
  'src/ui/desktop/runtime-desktop-experience.js',
  `  function languageNames(){
    return (
      config?.languageNames?.()||
      {}
    );
  }

  function inquiryCount(){`,
  `  function languageNames(){
    return (
      config?.languageNames?.()||
      {}
    );
  }

  /*
   * B7-00B.4A R1.1 — presentation-only language hook.
   * Typography needs a stable locale selector without reaching into Mobile DOM.
   */
  function syncPresentationLanguage(){
    if(
      !rootElement||
      !config
    ){
      return;
    }

    const requested=
      String(
        config.language?.()||
        'en'
      );

    const lang=
      ['en','zh','ko']
        .includes(
          requested
        )
        ? requested
        : 'en';

    rootElement.dataset
      .lang=
      lang;

    rootElement.setAttribute(
      'lang',
      lang==='zh'
        ? 'zh-CN'
        : lang
    );
  }

  function inquiryCount(){`,
  'Insert Desktop presentation language hook'
);

replaceOnce(
  'src/ui/desktop/runtime-desktop-experience.js',
  `    ensureStructure();
    configurePresentations();`,
  `    ensureStructure();
    syncPresentationLanguage();
    configurePresentations();`,
  'Sync language before first Desktop render'
);

replaceOnce(
  'src/ui/desktop/runtime-desktop-experience.js',
  `    document.body.dataset
      .desktopScreen=
      currentScreen;`,
  `    syncPresentationLanguage();

    document.body.dataset
      .desktopScreen=
      currentScreen;`,
  'Sync language during screen changes'
);

replaceOnce(
  'src/ui/desktop/runtime-desktop-experience.js',
  `    root.DreamlandDesktopShell
      ?.refresh?.();`,
  `    syncPresentationLanguage();

    root.DreamlandDesktopShell
      ?.refresh?.();`,
  'Sync language before refresh'
);

/* -------------------------------------------------------------------------- */
/* 3. Language-aware typography successor                                     */
/* -------------------------------------------------------------------------- */
appendOnce(
  'src/ui/desktop/styles/primitives.css',
  'B7-00B.4A R1.1 — language-aware typography successor',
  `@media (min-width:1024px){
  /*
   * B7-00B.4A R1.1 — language-aware typography successor.
   * English may balance editorial display copy. Chinese uses strict natural
   * line breaking instead of balance. Korean keeps semantic words together.
   */
  .desktop-experience[data-lang="en"] :is(
    .desktop-home-hero__title,
    .desktop-home-section__title,
    .desktop-editorial-title,
    .desktop-custom-title,
    .desktop-home-cta__title,
    .desktop-catalog-intro h1,
    .desktop-catalog-empty h2,
    .desktop-detail-heading h1,
    .desktop-custom-hero h1,
    .desktop-custom-section__heading h2,
    .desktop-flow-hero h1,
    .desktop-flow-empty h1,
    .desktop-contact-card__head h2,
    .desktop-contact-aside h2,
    .desktop-review-section h2,
    .desktop-review-notice h2,
    .desktop-success-page h1,
    .desktop-success-next h2
  ){
    text-wrap:balance;
    overflow-wrap:normal;
    hyphens:none;
  }

  .desktop-experience[data-lang="zh"] :is(
    h1,
    h2,
    h3,
    .desktop-display-xl,
    .desktop-page-display,
    .desktop-section-heading,
    .desktop-subsection-heading
  ){
    text-wrap:wrap;
    word-break:normal;
    overflow-wrap:normal;
    line-break:strict;
    hyphens:none;
  }

  .desktop-experience[data-lang="ko"] :is(
    h1,
    h2,
    h3,
    .desktop-display-xl,
    .desktop-page-display,
    .desktop-section-heading,
    .desktop-subsection-heading,
    .desktop-site-nav__item,
    button
  ){
    text-wrap:wrap;
    word-break:keep-all;
    overflow-wrap:normal;
    hyphens:none;
  }

  .desktop-experience[data-lang="zh"] .desktop-eyebrow,
  .desktop-experience[data-lang="ko"] .desktop-eyebrow{
    letter-spacing:.08em;
    text-transform:none;
  }

  /*
   * Short Chinese page displays should use the available Desktop width before
   * creating a second line. 1024–1279 keeps natural wrapping as a safe fallback.
   */
  @media (min-width:1280px){
    .desktop-experience[data-lang="zh"] :is(
      .desktop-custom-hero h1,
      .desktop-flow-hero h1,
      .desktop-success-page h1
    ){
      width:max-content;
      max-width:100%;
      white-space:nowrap;
      text-wrap:nowrap;
    }
  }
}`
);

/* -------------------------------------------------------------------------- */
/* 4. Custom: editorial form surface instead of large SaaS card                */
/* -------------------------------------------------------------------------- */
replaceAllLiteral(
  'src/ui/desktop/styles/custom.css',
  [
    ['max-width:880px;','max-width:1180px;'],
    [`  .desktop-custom-hero h1{
    max-width:860px;
    margin-top:12px;
    color:var(--dw-ink);
    font-size:clamp(48px,5.3vw,78px);
    line-height:.96;
    font-weight:950;
    letter-spacing:-.052em;
  }`,
     `  .desktop-custom-hero h1{
    max-width:1180px;
    margin-top:12px;
    color:var(--dw-color-ink);
    font-size:var(--dw-type-page-size);
    line-height:var(--dw-type-page-line);
    font-weight:900;
    letter-spacing:var(--dw-type-page-track);
  }`],
    [`  .desktop-custom-builder{
    min-width:0;
    display:flex;
    flex-direction:column;
    gap:18px;
  }`,
     `  .desktop-custom-builder{
    min-width:0;
    display:flex;
    flex-direction:column;
    gap:0;
  }`],
    [`  .desktop-custom-section{
    padding:clamp(28px,3vw,38px);
    border:1px solid var(--dw-line);
    border-radius:var(--dw-radius-lg);
    background:rgba(255,255,255,.6);
  }`,
     `  /*
   * R1.1 Foundation migration: the form reads as an editorial sequence rather
   * than a stack of dashboard cards. DOM and field ownership stay unchanged.
   */
  .desktop-custom-section{
    padding:clamp(32px,3.2vw,44px) 0;
    border:0;
    border-top:1px solid var(--dw-color-line);
    border-radius:0;
    background:transparent;
  }`],
    ['border-radius:13px;\n    background:#fff;\n    color:var(--dw-ink);',
     'border-radius:var(--dw-radius-control);\n    background:var(--dw-color-surface-raised);\n    color:var(--dw-color-ink);'],
    [`    border-radius:12px;
    background:#fff;
    color:var(--dw-ink);`,
     `    border-radius:var(--dw-radius-control);
    background:var(--dw-color-surface-raised);
    color:var(--dw-color-ink);`],
    [`  .desktop-custom-summary{
    padding:24px;
    border-radius:18px;
    background:#efe6dc;
    box-shadow:
      inset 0 0 0 1px rgba(89,69,52,.07),
      0 18px 44px rgba(61,49,39,.05);
  }`,
     `  .desktop-custom-summary{
    padding:24px;
    border:1px solid var(--dw-color-line);
    border-radius:var(--dw-radius-panel);
    background:var(--dw-color-surface-warm);
    box-shadow:var(--dw-shadow-subtle);
  }`],
    ['border-radius:12px;\n    background:rgba(255,255,255,.48);',
     'border-radius:var(--dw-radius-control);\n    background:var(--dw-color-paper);'],
    ['border-radius:12px;\n    background:var(--dw-ink);',
     'border-radius:var(--dw-radius-control);\n    background:var(--dw-color-ink);'],
    ['border-radius:12px;\n    background:rgba(255,255,255,.56);',
     'border-radius:var(--dw-radius-control);\n    background:var(--dw-color-paper);'],
    [`    .desktop-custom-section{
      padding:26px;
    }`,
     `    .desktop-custom-section{
      padding:26px 0;
    }`]
  ],
  'Custom Foundation migration'
);

/* -------------------------------------------------------------------------- */
/* 5. Inquiry Flow: progress line below labels + shared surfaces               */
/* -------------------------------------------------------------------------- */
replaceAllLiteral(
  'src/ui/desktop/styles/inquiry.css',
  [
    ['max-width:850px;','max-width:1100px;'],
    [`  .desktop-flow-hero h1,
  .desktop-flow-empty h1{
    margin-top:10px;
    color:var(--dw-ink);
    font-size:clamp(42px,4.6vw,68px);
    line-height:.98;
    font-weight:950;
    letter-spacing:-.048em;
  }`,
     `  .desktop-flow-hero h1,
  .desktop-flow-empty h1{
    margin-top:10px;
    color:var(--dw-color-ink);
    font-size:var(--dw-type-page-size);
    line-height:var(--dw-type-page-line);
    font-weight:900;
    letter-spacing:var(--dw-type-page-track);
  }`],
    [`  .desktop-flow-progress{
    margin-top:34px;
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    max-width:620px;
    border-top:1px solid var(--dw-line);
  }`,
     `  /*
   * R1.1: labels lead, progress rule follows. The line no longer reads as a
   * divider belonging to the previous content block.
   */
  .desktop-flow-progress{
    margin-top:34px;
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    max-width:620px;
  }`],
    [`  .desktop-flow-progress span{
    padding-top:12px;
    display:flex;
    align-items:center;
    gap:9px;
    color:var(--dw-soft);
    font-size:10px;
    font-weight:780;
  }`,
     `  .desktop-flow-progress span{
    padding:0 0 12px;
    display:flex;
    align-items:center;
    gap:9px;
    border-bottom:1px solid var(--dw-color-line);
    color:var(--dw-color-faint);
    font-size:10px;
    font-weight:780;
  }`],
    [`  .desktop-flow-progress span.is-active,
  .desktop-flow-progress span.is-complete{
    color:var(--dw-ink);
  }`,
     `  .desktop-flow-progress span.is-active,
  .desktop-flow-progress span.is-complete{
    border-color:var(--dw-color-ink);
    color:var(--dw-color-ink);
  }`],
    [`  .desktop-inquiry-summary{
    position:sticky;
    top:calc(var(--dw-header) + 24px);
    padding:24px;
    border-radius:18px;
    background:#efe6dc;
    box-shadow:inset 0 0 0 1px rgba(89,69,52,.07);
  }`,
     `  .desktop-inquiry-summary{
    position:sticky;
    top:calc(var(--dw-header) + 24px);
    padding:24px;
    border:1px solid var(--dw-color-line);
    border-radius:var(--dw-radius-panel);
    background:var(--dw-color-surface-warm);
    box-shadow:var(--dw-shadow-subtle);
  }`],
    ['border-radius:11px;\n    background:var(--dw-ink);',
     'border-radius:var(--dw-radius-control);\n    background:var(--dw-color-ink);'],
    [`    border-radius:18px;
    background:#fff;
    box-shadow:0 24px 80px rgba(20,18,16,.18);`,
     `    border-radius:var(--dw-radius-panel);
    background:var(--dw-color-surface-raised);
    box-shadow:var(--dw-shadow-float);`]
  ],
  'Inquiry visual migration'
);

/* -------------------------------------------------------------------------- */
/* 6. Contact: remove the giant form card and normalize controls               */
/* -------------------------------------------------------------------------- */
replaceAllLiteral(
  'src/ui/desktop/styles/contact.css',
  [
    [`  .desktop-contact-card{
    padding:clamp(28px,3vw,38px);
    border:1px solid var(--dw-line);
    border-radius:18px;
    background:rgba(255,255,255,.55);
  }`,
     `  /*
   * R1.1 Foundation migration: contact fields sit directly in the editorial
   * layout instead of inside a dashboard-style outer card.
   */
  .desktop-contact-card{
    padding:clamp(30px,3vw,40px) 0 0;
    border:0;
    border-top:1px solid var(--dw-color-line);
    border-radius:0;
    background:transparent;
  }`],
    [`    border:1px solid var(--dw-line);
    border-radius:11px;
    background:#fff;
    color:var(--dw-ink);`,
     `    border:1px solid var(--dw-color-line);
    border-radius:var(--dw-radius-control);
    background:var(--dw-color-surface-raised);
    color:var(--dw-color-ink);`],
    [`  .desktop-contact-summary,
  .desktop-contact-next{
    padding:23px;
    border-radius:18px;
    background:#efe6dc;
    box-shadow:inset 0 0 0 1px rgba(89,69,52,.07);
  }`,
     `  .desktop-contact-summary,
  .desktop-contact-next{
    padding:23px;
    border:1px solid var(--dw-color-line);
    border-radius:var(--dw-radius-panel);
    background:var(--dw-color-surface-warm);
    box-shadow:var(--dw-shadow-subtle);
  }`],
    [`  .desktop-contact-next{
    background:rgba(255,255,255,.56);
  }`,
     `  .desktop-contact-next{
    padding:20px 0 0;
    border:0;
    border-top:1px solid var(--dw-color-line);
    border-radius:0;
    background:transparent;
    box-shadow:none;
  }`]
  ],
  'Contact Foundation migration'
);

/* -------------------------------------------------------------------------- */
/* 7. Review / Success / PDP lower information                                 */
/* -------------------------------------------------------------------------- */
replaceAllLiteral(
  'src/ui/desktop/styles/review.css',
  [
    [`  .desktop-review-notice{
    margin-top:26px;
    padding:24px;
    border-radius:16px;
    background:#f0e7dc;
  }`,
     `  .desktop-review-notice{
    margin-top:26px;
    padding:24px;
    border:1px solid var(--dw-color-line);
    border-radius:var(--dw-radius-control);
    background:var(--dw-color-surface-warm-soft);
  }`],
    [`  .desktop-review-summary{
    position:sticky;
    top:calc(var(--dw-header) + 24px);
    padding:24px;
    border-radius:18px;
    background:#efe6dc;
    box-shadow:inset 0 0 0 1px rgba(89,69,52,.07);
  }`,
     `  .desktop-review-summary{
    position:sticky;
    top:calc(var(--dw-header) + 24px);
    padding:24px;
    border:1px solid var(--dw-color-line);
    border-radius:var(--dw-radius-panel);
    background:var(--dw-color-surface-warm);
    box-shadow:var(--dw-shadow-subtle);
  }`],
    ['border-radius:10px;\n    background:rgba(255,255,255,.5);',
     'border-radius:var(--dw-radius-control);\n    background:var(--dw-color-paper);']
  ],
  'Review Foundation migration'
);

replaceAllLiteral(
  'src/ui/desktop/styles/success.css',
  [
    ['max-width:900px;','max-width:1120px;'],
    [`  .desktop-success-page h1{
    max-width:760px;
    margin-top:10px;
    color:var(--dw-ink);
    font-size:clamp(48px,5vw,74px);
    line-height:.97;
    font-weight:950;
    letter-spacing:-.05em;
  }`,
     `  .desktop-success-page h1{
    max-width:1120px;
    margin-top:10px;
    color:var(--dw-color-ink);
    font-size:var(--dw-type-page-size);
    line-height:var(--dw-type-page-line);
    font-weight:900;
    letter-spacing:var(--dw-type-page-track);
  }`],
    [`  .desktop-success-next{
    margin-top:44px;
    padding:28px;
    border-radius:18px;
    background:#efe6dc;
  }`,
     `  .desktop-success-next{
    margin-top:44px;
    padding:28px;
    border:1px solid var(--dw-color-line);
    border-radius:var(--dw-radius-panel);
    background:var(--dw-color-surface-warm);
  }`]
  ],
  'Success typography / surface migration'
);

replaceAllLiteral(
  'src/ui/desktop/styles/detail.css',
  [
    [`  .desktop-detail-summary{
    margin-top:28px;
    padding:22px;
    border-radius:18px;
    background:#efe6dc;
    box-shadow:
      inset 0 0 0 1px rgba(89,69,52,.07);
  }`,
     `  .desktop-detail-summary{
    margin-top:28px;
    padding:22px;
    border:1px solid var(--dw-color-line);
    border-radius:var(--dw-radius-panel);
    background:var(--dw-color-surface-warm);
    box-shadow:var(--dw-shadow-subtle);
  }`],
    [`  .desktop-detail-lower{
    margin-top:var(--dw-section);
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:18px;
  }`,
     `  .desktop-detail-lower{
    margin-top:var(--dw-section);
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:clamp(32px,4vw,56px);
  }`],
    [`  .desktop-detail-info-card{
    padding:28px;
    border:1px solid var(--dw-line);
    border-radius:var(--dw-radius-lg);
    background:rgba(255,255,255,.48);
  }`,
     `  /*
   * R1.1 Foundation migration: lower PDP facts use editorial dividers rather
   * than two oversized white dashboard cards.
   */
  .desktop-detail-info-card{
    padding:28px 0;
    border:0;
    border-top:1px solid var(--dw-color-line);
    border-radius:0;
    background:transparent;
  }`]
  ],
  'PDP Foundation migration'
);

/* -------------------------------------------------------------------------- */
/* 8. Keep the Desktop boot canvas in sync with the new Foundation             */
/* -------------------------------------------------------------------------- */
replaceAllLiteral(
  'index.html',
  [
    ['background:#faf8f4!important;','background:#fbf8f3!important;'],
    ['color:#171513;','color:#181512;']
  ],
  'Desktop release boot visual alignment'
);

/* -------------------------------------------------------------------------- */
/* 9. Public-facing EN / ZH / KO copy                                          */
/* -------------------------------------------------------------------------- */
{
  const relative='data/site-content.json';
  const site=JSON.parse(read(relative));

  const en=site.languages.en;
  const zh=site.languages.zh;
  const ko=site.languages.ko;

  Object.assign(
    en.customProject,
    {
      title:'Custom-made for brands, events and collections.',
      body:'Share your project needs, expected quantity and preferred product direction. We’ll review feasibility, quotation, lead time and delivery with you.',
      sectionBasicsTitle:'Tell us about your project.',
      sectionBasicsBody:'Share the intended use, expected quantity, budget and target delivery date so we can recommend the right product and production direction.',
      sectionProductTitle:'Define the product direction.',
      sectionProductBody:'Choose a preferred size and fragrance collection, then add any color or brand references you would like us to consider.',
      sectionPackagingTitle:'Complete the presentation.',
      sectionPackagingBody:'Choose a packaging direction and tell us which branding elements you would like to include.',
      summaryNote:'Custom projects are quoted against the final requirements. We’ll confirm feasibility, pricing, lead time and delivery details with you.',
      addedTitle:'Added to this inquiry.',
      addedBody:'Continue browsing the collection or review the current inquiry.'
    }
  );

  Object.assign(
    en.inquiryFlow,
    {
      stepSelection:'Inquiry',
      title:'Your inquiry',
      body:'Review the products and custom requirements you would like us to quote, then continue with your contact details.',
      summaryKicker:'YOUR INQUIRY',
      summaryTitle:'Quotation overview',
      finalPricingNote:'Product pricing, customization, lead time and delivery will be confirmed in the formal quotation.',
      contactTitle:'How should we contact you?',
      contactBody:'Share the best contact details for quotation and project follow-up.',
      contactDetailsTitle:'Contact details',
      contactDetailsBody:'We’ll use these details only to respond to this inquiry and discuss your project.',
      whatNextKicker:'AFTER SUBMISSION',
      whatNextTitle:'What happens next',
      whatNextSteps:[
        'We review your product selections, quantities and custom requirements.',
        'We confirm feasibility and any project information still needed.',
        'We contact you with quotation, production lead time and delivery details.'
      ],
      reviewKicker:'FINAL CHECK',
      reviewTitle:'Review your inquiry before sending.',
      reviewBody:'Check the contact details, product configurations and custom requirements below before submitting.',
      reviewSummaryTitle:'Inquiry overview',
      beforeSubmitKicker:'BEFORE SUBMISSION',
      beforeSubmitTitle:'This request is for quotation, not a confirmed order.',
      beforeSubmitBody:'Pricing, production arrangements and delivery become final only after both sides confirm the quotation.',
      successKicker:'INQUIRY RECEIVED',
      successTitle:'Thank you. We’ve received your inquiry.',
      successBody:'Our team will review your selections and requirements, then contact you to confirm quotation, production lead time and delivery.',
      awaitingReview:'In review',
      startAnotherProject:'Start a New Inquiry'
    }
  );

  Object.assign(
    zh.navigation,
    {
      inquiry:'询价单'
    }
  );

  Object.assign(
    zh.cta,
    {
      review:'查看询价单'
    }
  );

  Object.assign(
    zh.footer,
    {
      inquiry:'询价单'
    }
  );

  Object.assign(
    zh.customProject,
    {
      title:'为品牌、活动与专属系列定制。',
      body:'告诉我们项目用途、预计数量、产品偏好与定制需求。我们会评估制作可行性，并与你确认报价、制作周期和交付安排。',
      sectionBasicsTitle:'从项目需求开始。',
      sectionBasicsBody:'填写用途、预计数量、预算与目标交付时间，我们会据此判断适合的产品与制作方向。',
      sectionProductTitle:'确定产品与香型方向。',
      sectionProductBody:'选择尺寸与香型系列，并补充希望参考的配色、品牌视觉或其他产品要求。',
      sectionPackagingTitle:'确认包装与品牌呈现。',
      sectionPackagingBody:'选择包装方向，并说明是否需要 Logo、贺卡、贴纸或礼盒等品牌物料。',
      summaryKicker:'项目概要',
      summaryTitle:'定制需求',
      quotedAfterReview:'根据最终需求单独报价',
      summaryNote:'定制项目将根据最终需求单独报价。我们会确认制作可行性、价格、周期与交付细节。',
      addInquiry:'加入本次询价',
      addedButton:'已加入询价',
      addedTitle:'已加入当前询价。',
      addedBody:'你可以继续浏览产品，或查看当前询价内容。',
      reviewInquiry:'查看询价内容'
    }
  );

  Object.assign(
    zh.inquiryFlow,
    {
      progressLabel:'询价进度',
      stepSelection:'询价内容',
      kicker:'采购询价',
      title:'询价内容',
      body:'确认需要询价的产品与定制项目，再继续填写联系信息。',
      summaryKicker:'询价概要',
      summaryTitle:'本次询价',
      finalPricingNote:'产品价格与定制费用将根据最终需求确认；制作周期与交付方式会在正式报价中说明。',
      continueContact:'填写联系信息',
      emptyTitle:'还没有需要询价的项目。',
      emptyBody:'可以先从产品系列选择产品，或直接提交定制需求。',
      clearAll:'清空询价单',
      clearTitle:'清空当前询价单？',
      clearBody:'已选产品和定制项目将全部移除。',
      clearConfirm:'确认清空当前询价单中的全部项目？',
      contactKicker:'联系信息',
      contactTitle:'请留下便于联系的信息。',
      contactBody:'我们会通过你填写的联系方式跟进报价与项目细节。',
      contactDetailsKicker:'询价联系人',
      contactDetailsTitle:'联系信息',
      contactDetailsBody:'联系信息仅用于本次询价回复及后续项目沟通。',
      backInquiry:'返回询价内容',
      reviewInquiry:'确认询价内容',
      messagePlaceholder:'如有采购计划、交付要求或其他项目背景，可在这里补充。',
      whatNextKicker:'提交后',
      whatNextTitle:'接下来，我们会这样跟进',
      whatNextSteps:[
        '核对产品选择、数量与定制需求。',
        '确认定制可行性及需要补充的项目资料。',
        '与你确认正式报价、制作周期和交付安排。'
      ],
      reviewKicker:'提交前确认',
      reviewTitle:'提交前，请确认以下信息。',
      reviewBody:'请核对联系信息、产品配置与定制需求，确认无误后提交询价。',
      reviewSummaryTitle:'询价概要',
      beforeSubmitKicker:'提交前',
      beforeSubmitTitle:'本次提交为询价，不会直接生成订单。',
      beforeSubmitBody:'最终报价、生产安排与交付方式将在双方确认后确定。',
      successKicker:'询价已收到',
      successTitle:'感谢提交，我们已收到你的询价。',
      successBody:'我们会核对产品选择与定制需求，并与你确认正式报价、制作周期及交付安排。',
      awaitingReview:'处理中',
      startAnotherProject:'提交新的询价'
    }
  );

  Object.assign(
    ko.navigation,
    {
      inquiry:'문의'
    }
  );

  Object.assign(
    ko.footer,
    {
      inquiry:'문의'
    }
  );

  Object.assign(
    ko.customProject,
    {
      title:'브랜드, 이벤트와 전용 컬렉션을 위한 맞춤 제작.',
      body:'프로젝트 용도, 예상 수량, 제품 선호와 커스텀 요구사항을 알려주세요. 제작 가능 여부를 검토한 뒤 견적, 제작 일정과 배송 계획을 안내해 드립니다.',
      sectionBasicsTitle:'프로젝트 요구사항부터 알려주세요.',
      sectionBasicsBody:'용도, 예상 수량, 예산과 목표 납기를 알려주시면 적합한 제품과 제작 방향을 검토할 수 있습니다.',
      sectionProductTitle:'제품 방향을 정합니다.',
      sectionProductBody:'사이즈와 향 컬렉션을 선택하고, 참고할 컬러나 브랜드 비주얼이 있다면 함께 알려주세요.',
      sectionPackagingTitle:'패키징과 브랜드 표현을 확인합니다.',
      sectionPackagingBody:'원하는 패키징 방향과 로고, 카드, 스티커 또는 기프트 박스 등 필요한 브랜드 요소를 알려주세요.',
      summaryNote:'커스텀 프로젝트는 최종 요구사항을 기준으로 별도 견적합니다. 제작 가능 여부, 가격, 일정과 배송 세부사항을 확인해 드립니다.',
      addedTitle:'현재 문의에 추가되었습니다.',
      addedBody:'계속 제품을 둘러보거나 현재 문의 내용을 확인할 수 있습니다.'
    }
  );

  Object.assign(
    ko.inquiryFlow,
    {
      stepSelection:'문의 내용',
      title:'견적 문의',
      body:'견적이 필요한 제품과 커스텀 요구사항을 확인한 뒤 연락처 정보를 입력해 주세요.',
      summaryKicker:'문의 요약',
      summaryTitle:'견적 개요',
      finalPricingNote:'제품 가격, 커스텀 비용, 제작 일정과 배송 방식은 최종 견적에서 확인합니다.',
      contactTitle:'연락 가능한 정보를 알려주세요.',
      contactBody:'견적과 프로젝트 후속 안내를 받을 연락처를 입력해 주세요.',
      contactDetailsTitle:'연락처 정보',
      contactDetailsBody:'입력한 정보는 이번 문의에 답변하고 프로젝트를 상담하는 용도로만 사용됩니다.',
      whatNextKicker:'제출 후',
      whatNextTitle:'다음 진행 안내',
      whatNextSteps:[
        '제품 선택, 수량과 커스텀 요구사항을 확인합니다.',
        '제작 가능 여부와 추가로 필요한 프로젝트 정보를 확인합니다.',
        '견적, 제작 일정과 배송 조건을 안내해 드립니다.'
      ],
      reviewKicker:'제출 전 확인',
      reviewTitle:'제출 전에 문의 내용을 확인해 주세요.',
      reviewBody:'연락처, 제품 구성과 커스텀 요구사항을 확인한 뒤 문의를 제출해 주세요.',
      reviewSummaryTitle:'문의 개요',
      beforeSubmitKicker:'제출 전',
      beforeSubmitTitle:'이번 제출은 견적 문의이며 주문 확정이 아닙니다.',
      beforeSubmitBody:'최종 가격, 제작 일정과 배송 방식은 견적 확인 후 확정됩니다.',
      successKicker:'문의 접수 완료',
      successTitle:'감사합니다. 문의가 접수되었습니다.',
      successBody:'제품 선택과 요청사항을 검토한 뒤 견적, 제작 일정과 배송을 확인할 수 있도록 연락드리겠습니다.',
      awaitingReview:'검토 중',
      startAnotherProject:'새 문의 시작'
    }
  );

  write(
    relative,
    `${JSON.stringify(site,null,2)}\n`
  );
}

/* -------------------------------------------------------------------------- */
/* 10. Successor acceptance: semantic visual gates + public-copy hygiene       */
/* -------------------------------------------------------------------------- */
replaceAllLiteral(
  'scripts/validate-b7-desktop-shell-home.mjs',
  [
    ["      '--dw-canvas:#f5f3ef;',\n      '--dw-sand:#e9e0d5;',\n      '--dw-clay:#bfa38e;',\n      '--dw-ink:#171614;',",
     "      '--dw-color-canvas:',\n      '--dw-color-sand:',\n      '--dw-color-clay:',\n      '--dw-color-ink:',\n      '--dw-font-sans:',\n      '--dw-radius-panel:',"]
  ],
  'Retire exact historical palette gate'
);

replaceOnce(
  'scripts/validate-b7-desktop-visual-foundation.mjs',
  `try{
  const pkg=JSON.parse(read('package.json'));

  if(
    pkg?.scripts?.['desktop:visual-foundation']!==`,
  `try{
  const experience=
    read('src/ui/desktop/runtime-desktop-experience.js');
  const primitives=
    read('src/ui/desktop/styles/primitives.css');
  const inquiry=
    read('src/ui/desktop/styles/inquiry.css');
  const custom=
    read('src/ui/desktop/styles/custom.css');
  const detail=
    read('src/ui/desktop/styles/detail.css');
  const site=
    JSON.parse(
      read('data/site-content.json')
    );

  includesAll(
    experience,
    [
      'function syncPresentationLanguage()',
      'rootElement.dataset',
      \".lang=\\n      lang;\",
      \"lang==='zh'\"
    ],
    'Desktop language-aware presentation hook'
  );

  includesAll(
    primitives,
    [
      'B7-00B.4A R1.1 — language-aware typography successor',
      '.desktop-experience[data-lang=\"en\"]',
      '.desktop-experience[data-lang=\"zh\"]',
      '.desktop-experience[data-lang=\"ko\"]',
      'line-break:strict;',
      'word-break:keep-all;',
      '@media (min-width:1280px)'
    ],
    'R1.1 typography successor'
  );

  if(
    inquiry.includes(
      '.desktop-flow-progress{\\n    margin-top:34px;\\n    display:grid;\\n    grid-template-columns:repeat(3,minmax(0,1fr));\\n    max-width:620px;\\n    border-top:'
    )
  ){
    fail('Inquiry progress rule must not sit above the step labels.');
  }

  includesAll(
    inquiry,
    [
      'border-bottom:1px solid var(--dw-color-line);',
      'border-color:var(--dw-color-ink);'
    ],
    'R1.1 progress treatment'
  );

  includesAll(
    custom,
    [
      'R1.1 Foundation migration',
      'border-top:1px solid var(--dw-color-line);',
      'border-radius:0;',
      'background:transparent;'
    ],
    'R1.1 Custom Foundation migration'
  );

  includesAll(
    detail,
    [
      'lower PDP facts use editorial dividers',
      '.desktop-detail-info-card{',
      'border-radius:0;',
      'background:transparent;'
    ],
    'R1.1 PDP Foundation migration'
  );

  const publicCopy={
    en:{
      customTitle:'Custom-made for brands, events and collections.',
      reviewTitle:'Review your inquiry before sending.',
      successTitle:'Thank you. We’ve received your inquiry.'
    },
    zh:{
      customTitle:'为品牌、活动与专属系列定制。',
      reviewTitle:'提交前，请确认以下信息。',
      successTitle:'感谢提交，我们已收到你的询价。'
    },
    ko:{
      customTitle:'브랜드, 이벤트와 전용 컬렉션을 위한 맞춤 제작.',
      reviewTitle:'제출 전에 문의 내용을 확인해 주세요.',
      successTitle:'감사합니다. 문의가 접수되었습니다.'
    }
  };

  for(const [lang,expected] of Object.entries(publicCopy)){
    const localized=site.languages?.[lang];

    if(
      localized?.customProject?.title!==
      expected.customTitle
    ){
      fail(\`Public copy regression: \${lang}.customProject.title\`);
    }

    if(
      localized?.inquiryFlow?.reviewTitle!==
      expected.reviewTitle
    ){
      fail(\`Public copy regression: \${lang}.inquiryFlow.reviewTitle\`);
    }

    if(
      localized?.inquiryFlow?.successTitle!==
      expected.successTitle
    ){
      fail(\`Public copy regression: \${lang}.inquiryFlow.successTitle\`);
    }
  }

  const serialized=
    JSON.stringify(
      site
    );

  for(const legacy of [
    '先说清楚这是什么项目。',
    '在一个页面完成最终确认。',
    '谢谢，项目已经交给我们了。',
    'Start with the project.',
    'Everything in one place.',
    'Thank you. Your project is now with us.'
  ]){
    if(serialized.includes(legacy)){
      fail(\`Legacy internal/product copy remains: \${legacy}\`);
    }
  }
}catch(error){
  fail(\`R1.1 Visual / copy successor validation failed: \${error.message}\`);
}

try{
  const pkg=JSON.parse(read('package.json'));

  if(
    pkg?.scripts?.['desktop:visual-foundation']!==`,
  'Insert R1.1 visual/copy acceptance gates'
);

replaceOnce(
  'scripts/validate-b7-desktop-visual-foundation.mjs',
  `console.log('B7-00B.4A Desktop Visual Refresh Foundation validation: PASS');
console.log('Semantic tokens / shared primitives / typography wrapping / Desktop ownership successor / PWA v99 PASS.');`,
  `console.log('B7-00B.4A R1.1 Desktop Visual Refresh Foundation validation: PASS');
console.log('Warm Editorial tokens / language-aware typography / bottom progress rules / Foundation migration / public EN-ZH-KO copy / Desktop ownership / PWA v99 PASS.');`,
  'Update R1.1 acceptance output'
);

/* -------------------------------------------------------------------------- */
/* 11. Final local static assertions                                           */
/* -------------------------------------------------------------------------- */
{
  const site=JSON.parse(
    read('data/site-content.json')
  );

  if(
    site.languages.zh.inquiryFlow.successTitle!==
    '感谢提交，我们已收到你的询价。'
  ){
    fail('Public copy mutation did not persist.');
  }

  const primitives=
    read('src/ui/desktop/styles/primitives.css');

  if(
    !primitives.includes(
      '.desktop-experience[data-lang="zh"]'
    )
  ){
    fail('ZH typography successor is missing after patch.');
  }

  const inquiry=
    read('src/ui/desktop/styles/inquiry.css');

  if(
    !inquiry.includes(
      'border-bottom:1px solid var(--dw-color-line);'
    )
  ){
    fail('Progress bottom rule is missing after patch.');
  }
}

console.log('\nB7-00B.4A R1.1 patch applied successfully.');
console.log(`Base: ${EXPECTED_HEAD}`);
console.log('Changed files:');
for(const relative of changed){
  console.log(`- ${relative}`);
}
console.log('\nNext: npm run check');
