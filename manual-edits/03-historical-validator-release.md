# B5-06｜历史 Validator Ownership 释放

这一轮必须一次性处理，避免 CI 按执行顺序逐层暴露旧 ownership。

---

# 1. scripts/validate-inquiry-feature-state-boundary.mjs（B5-01）

## A. preserved 删除 Contact ownership

在：

```js
for(
  const preserved of [
```

删除：

```js
'state.contact=contact'
```

保留：

```text
renderInquiry
updateInquiryDynamicUi
buildWeb3FormsPayload
assessSubmissionRisk
submitInquiry
collect
```

## B. Feature Manifest 不再要求“只有 Inquiry”

当前：

```js
if(
  enabled.length!==1||
  enabled[0]?.id!=='inquiry'||
  inquiry?.status!=='partial'||
  inquiry?.runtimeOwner!==
    'src/features/inquiry/runtime-inquiry.js'
)
```

改成只保护 Inquiry 自身：

```js
if(
  inquiry?.runtimeEnabled!==true||
  inquiry?.status!=='partial'||
  inquiry?.runtimeOwner!==
    'src/features/inquiry/runtime-inquiry.js'
)
```

错误文案改成：

```text
Feature manifest must preserve partial Inquiry runtime ownership.
```

不要让 B5-01 决定未来还能不能增加其他 Feature。

---

# 2. scripts/validate-inquiry-pricing-boundary.mjs（B5-02）

找到 Manifest 检查：

```js
enabled.length!==1||
enabled[0]?.id!=='inquiry'||
...
```

改为只保护：

```js
if(
  inquiry?.runtimeEnabled!==true||
  inquiry?.status!=='partial'||
  inquiry?.runtimeOwner!==
    'src/features/inquiry/runtime-inquiry.js'
){
  fail(
    'B5-02 must preserve partial Inquiry runtime ownership.'
  );
}
```

不要再检查 `enabled.length!==1`。

---

# 3. scripts/validate-inquiry-view-model-boundary.mjs（B5-03）

同理，将：

```js
enabled.length!==1||
enabled[0]?.id!=='inquiry'||
...
```

改为：

```js
if(
  inquiry?.runtimeEnabled!==true||
  inquiry?.status!=='partial'||
  inquiry?.runtimeOwner!==
    'src/features/inquiry/runtime-inquiry.js'
){
  fail(
    'Inquiry View Model contract must preserve partial Inquiry runtime ownership.'
  );
}
```

不要再检查 `enabled.length!==1`。

---

# 4. scripts/validate-submission-service-boundary.mjs（B4-01）

## A. preserved 释放 App orchestration

当前：

```js
for(const preserved of [
  'function buildWeb3FormsPayload(',
  'function submissionSnapshot(',
  'function archiveSubmission(',
  'function clearSubmittedInquiry('
]){
```

改成：

```js
for(const preserved of [
  'function buildWeb3FormsPayload(',
  'function submissionSnapshot('
]){
```

即删除：

```text
archiveSubmission
clearSubmittedInquiry
```

## B. 删除 index-only submit regex

删除整个：

```js
if(
  !/submissionService\.submit .../.test(indexSource)
){
  fail(
    'submitInquiry must pass the Risk-owned captcha token explicitly into DreamlandSubmission.'
  );
}
```

B5-06 新 Validator 会在 App Flow 中检查：

```text
DreamlandSubmission.submit
captchaToken
```

B4-01 只继续保护 Submission Service 自己的 transport contract。

---

# 5. scripts/validate-risk-service-boundary.mjs（B4-02）

在 index marker 列表中只删除：

```js
'riskService.recordAttempt('
```

其他全部保留：

```text
configure
bindInteractionTracking
markFormStart
preloadCaptcha
renderCaptcha
ensureCaptcha
assess
resetCaptcha
```

`recordAttempt()` 从 B5-06 起由：

```text
DreamlandInquirySubmissionFlow
```

在最终实际提交前调用。

`assessSubmissionRisk()` 和 Risk/Captcha UI 仍留在 index，因此其历史检查不动。

---

# 6. scripts/validate-inquiry-projection-boundary.mjs（B5-05）

## A. preserved 删除 archive placement

当前：

```js
for(const preserved of [
  'function itemSubtotal(',
  'function total(',
  'function kv(',
  'function collect(',
  'async function assessSubmissionRisk(',
  'async function submitInquiry(',
  'function archiveSubmission('
]){
```

删除：

```js
'function archiveSubmission('
```

其他保留。

## B. 释放 SW v76 ownership

删除：

```js
if(
  !swSource.includes(
    "const CACHE_VERSION = 'dreamland-pwa-v76';"
  )
){
  fail(
    'sw.js cache version must be dreamland-pwa-v76 for B5-05.'
  );
}
```

保留同一 try 中对：

```text
runtime-inquiry.js exactly once
runtime-inquiry-renderer.js exactly once
```

的检查。

B5-06 新 Validator 接管：

```text
dreamland-pwa-v77
Contact runtime path
Submission Flow runtime path
```

---

# 7. scripts/validate-frontend-foundation.mjs

## requiredFiles 增加

```js
'src/features/contact/runtime-contact.js',
'src/app/runtime-inquiry-submission-flow.js'
```

## Phase

```text
B5-05 → B5-06
```

## enabledFeatures

将“只有 Inquiry”改为严格要求当前两个：

```js
const enabledFeatures=
  foundation.features
    .filter(
      item=>
        item.runtimeEnabled===true
    );

const enabledIds=
  enabledFeatures
    .map(
      item=>item.id
    )
    .sort()
    .join(',');

const inquiryFeature=
  enabledFeatures.find(
    item=>
      item.id==='inquiry'
  );

const contactFeature=
  enabledFeatures.find(
    item=>
      item.id==='contact'
  );

if(
  enabledIds!=='contact,inquiry'||
  inquiryFeature?.status!=='partial'||
  inquiryFeature?.runtimeOwner!==
    'src/features/inquiry/runtime-inquiry.js'||
  contactFeature?.status!=='partial'||
  contactFeature?.runtimeOwner!==
    'src/features/contact/runtime-contact.js'
){
  fail(
    'B5-06 must runtime-enable only partial Inquiry and Contact Features.'
  )
}
```

## Legacy Map 增加 Contact / Flow 检查

新增：

```js
const contactMigration=
  foundation.legacyMap.find(
    item=>
      item.id==='contact'
  );

if(
  contactMigration?.status!=='partial'||
  !contactMigration?.runtimeOwners?.includes(
    'src/features/contact/runtime-contact.js'
  )
){
  fail(
    'Legacy map does not mark Contact as a partial runtime Feature.'
  )
}
```

Submission migration 增加：

```js
!submissionMigration?.runtimeOwners?.includes(
  'src/app/runtime-inquiry-submission-flow.js'
)
```

Inquiry migration 同样应包含 Flow runtime owner。

UI / Services 数量不变。

---

# B5-06 新 Validator 的防倒退要求

最终：

```text
B5-01 不得再出现：
'state.contact=contact'
enabled.length!==1

B5-02 不得再出现：
enabled.length!==1

B5-03 不得再出现：
enabled.length!==1

B4-01 不得再要求：
function archiveSubmission(
function clearSubmittedInquiry(

B4-02 index marker 不得再要求：
'riskService.recordAttempt('

B5-05 不得再要求：
function archiveSubmission(
dreamland-pwa-v76
```

这些不是削弱测试，而是把 ownership 交给 B5-06 的正确 runtime 和 Validator。
