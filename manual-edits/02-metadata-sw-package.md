# B5-06｜Manifest / Foundation / Legacy Map / SW / package 精确修改

## A. src/features/manifest.js

### Inquiry responsibilities

将 Inquiry 的：

```js
[
  'inquiry list',
  'pricing preview',
  'contact / submission flow'
]
```

改成：

```js
[
  'inquiry list',
  'pricing preview',
  'preview / submission projection'
]
```

### Contact Feature

找到：

```js
feature(
  'contact',
  [
    'contact information collection',
    'submission preparation'
  ],
  [
    'index.html'
  ]
)
```

改成：

```js
feature(
  'contact',
  [
    'contact information state',
    'contact draft persistence',
    'contact validation'
  ],
  [
    'index.html'
  ],
  {
    status:'partial',
    runtimeEnabled:true,
    runtimeOwner:
      'src/features/contact/runtime-contact.js'
  }
)
```

B5-06 后 runtime-enabled Features 必须只有：

```text
inquiry
contact
```

两者均为 `partial`。

---

## B. src/app/foundation.js

将说明改为：

```js
/*
 * Architecture metadata only.
 *
 * B5-06 adds the Contact Feature runtime and the Inquiry Submission Flow App runtime. DreamlandContact owns contact state, draft TTL/persistence and contact validation. DreamlandInquirySubmissionFlow owns final client submission orchestration, archive persistence and success-state cleanup across Inquiry/Contact/Pending ID while Risk/Captcha UI and Preview DOM remain in index.html.
 * The foundation manifest itself is still NOT loaded by index.html.
 */
```

将：

```js
phase:'B5-05'
```

改成：

```js
phase:'B5-06'
```

---

## C. src/app/legacy-map.js

### 1. app-shell

把 app-shell notes 改为：

```text
Application startup, screen navigation and DOM-facing orchestration remain in index.html. Final Inquiry submission transaction orchestration is routed through DreamlandInquirySubmissionFlow.
```

并给该 entry 增加：

```js
{
  status:'partial',
  runtimeMigrated:false,
  runtimeOwners:[
    'src/app/runtime-inquiry-submission-flow.js',
    'index.html',
    'startup-loader.js'
  ]
}
```

### 2. inquiry entry notes

改为：

```text
Inquiry item-state hydration/persistence/mutation, Inquiry-specific pricing derivation, the Inquiry screen View Model and Preview/Submission/Archive projection data are routed through DreamlandInquiry. Inquiry list/summary HTML templates, DOM rendering, incremental DOM updates and item-level event delegation remain routed through DreamlandInquiryRenderer. Final submission transaction orchestration, archive persistence and success-state cleanup are routed through DreamlandInquirySubmissionFlow. Preview DOM, Risk/Captcha UI, navigation/badge behavior and shared pricing policy remain in index.html.
```

runtimeOwners 增加：

```text
src/app/runtime-inquiry-submission-flow.js
```

### 3. 在 custom-request 前新增 Contact entry

```js
entry(
  'contact',
  [
    'index.html'
  ],
  'features',
  'contact',
  'Contact state, draft TTL/persistence and contact validation are routed through DreamlandContact. DOM field collection, invalid-field presentation and page lifecycle event binding remain in index.html.',
  {
    status:'partial',
    runtimeMigrated:false,
    runtimeOwners:[
      'src/features/contact/runtime-contact.js',
      'index.html'
    ]
  }
),
```

### 4. submission entry

notes 改为：

```text
Client Web3Forms transport, FormData assembly and response normalization are routed through DreamlandSubmission. Final submission transaction orchestration, reachability gating, attempt recording, archive persistence and success-state cleanup are routed through DreamlandInquirySubmissionFlow. Payload/snapshot composition and DOM feedback remain App/index concerns.
```

runtimeOwners 改为：

```js
runtimeOwners:[
  'src/services/submission/runtime-submission.js',
  'src/app/runtime-inquiry-submission-flow.js',
  'index.html'
]
```

---

## D. sw.js

将：

```js
const CACHE_VERSION = 'dreamland-pwa-v76';
```

改成：

```js
const CACHE_VERSION = 'dreamland-pwa-v77';
```

在 APP_SHELL 中保留：

```js
'./src/features/inquiry/runtime-inquiry.js',
'./src/ui/inquiry/runtime-inquiry-renderer.js',
```

并新增，各 exactly once：

```js
'./src/features/contact/runtime-contact.js',
'./src/app/runtime-inquiry-submission-flow.js',
```

推荐顺序：

```js
'./src/features/inquiry/runtime-inquiry.js',
'./src/features/contact/runtime-contact.js',
'./src/ui/inquiry/runtime-inquiry-renderer.js',
'./src/app/runtime-inquiry-submission-flow.js',
```

不修改 fetch/cache strategy。

---

## E. package.json

新增：

```json
"contact-submission:boundary": "node scripts/validate-contact-submission-orchestration-boundary.mjs"
```

`validate` 链最后从：

```text
... && npm run inquiry-ui:boundary && npm run inquiry-projection:boundary
```

改成：

```text
... && npm run inquiry-ui:boundary && npm run inquiry-projection:boundary && npm run contact-submission:boundary
```

---

## F. src/README.md

追加 B5-06 说明，至少覆盖：

```text
DreamlandContact
version B5-06

DreamlandInquirySubmissionFlow
version B5-06

Contact Feature owns:
- contact state
- draft TTL
- draft persistence
- validation

Submission Flow owns:
- duplicate/cooldown gate
- submission readiness
- reachability
- risk attempt recording
- DreamlandSubmission.submit()
- archive / last-submission persistence
- success cleanup:
  Inquiry.clearItems + persist
  Contact.clearAll
  pending inquiry storage clear

index remains:
- DOM collection
- invalid styles
- privacy consent
- captcha/risk UI
- toast/button/navigation
```

并明确记录 B5-06 修正：

```text
The previous clearSubmittedInquiry() reassigned the legacy global state object and could bypass DreamlandInquiry's internal state. B5-06 routes successful clearing through DreamlandInquiry.clearItems() + persist().
```
