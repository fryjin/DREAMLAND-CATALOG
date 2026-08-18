# B5-06｜index.html 精确修改

基线：

```text
develop
5dff55fb69d375e8a844b11e3472d8c7dacd58ff
```

目标：

```text
Contact Feature
→ contact state / draft TTL / draft persistence / validation

Inquiry Submission Flow (App)
→ duplicate/cooldown/readiness/reachability
→ Risk attempt
→ Submission Service
→ archive
→ clear Inquiry + Contact + pending ID

index.html
→ DOM collect / invalid styles
→ privacy consent / Captcha UI
→ toast / button / navigation
```

---

## 1. 增加两个 runtime script

找到：

```html
<script src="./src/features/inquiry/runtime-inquiry.js"></script>
<script src="./src/ui/inquiry/runtime-inquiry-renderer.js"></script>
<script>
```

改成：

```html
<script src="./src/features/inquiry/runtime-inquiry.js"></script>
<script src="./src/features/contact/runtime-contact.js"></script>
<script src="./src/ui/inquiry/runtime-inquiry-renderer.js"></script>
<script src="./src/app/runtime-inquiry-submission-flow.js"></script>
<script>
```

---

## 2. 增加 runtime 引用

找到：

```js
const inquiryFeature=window.DreamlandInquiry;
const inquiryRenderer=
  window.DreamlandInquiryRenderer;
```

改成：

```js
const inquiryFeature=
  window.DreamlandInquiry;

const contactFeature=
  window.DreamlandContact;

const inquiryRenderer=
  window.DreamlandInquiryRenderer;

const submissionFlow=
  window.DreamlandInquirySubmissionFlow;
```

在 Inquiry / Renderer guard 后增加：

```js
if(!contactFeature){
  throw new Error(
    'DreamlandContact must load before Contact initialization.'
  );
}

if(!submissionFlow){
  throw new Error(
    'DreamlandInquirySubmissionFlow must load before Submission flow initialization.'
  );
}
```

---

## 3. 删除三个 legacy 状态变量

当前：

```js
let contactDraftTimer=null;
let pendingInquiryId=appStorage.local.getItem(PENDING_INQUIRY_KEY)||'';
let submittingInquiry=false;
let lastSubmitAttemptAt=0;
```

改成：

```js
let pendingInquiryId=
  appStorage.local.getItem(
    PENDING_INQUIRY_KEY
  )||
  '';
```

即删除：

```text
contactDraftTimer
submittingInquiry
lastSubmitAttemptAt
```

---

## 4. 配置 Contact Feature

在 `CONTACT_FIELD_IDS` 和 `pendingInquiryId` 定义之后加入：

```js
contactFeature.configure({
  storage:
    appStorage.local,

  storageKey:
    CONTACT_DRAFT_KEY,

  ttlMs:
    CONTACT_DRAFT_TTL_MS,

  fieldIds:
    CONTACT_FIELD_IDS
});
```

---

## 5. 在 loadCatalogData() 中配置 Submission Flow

在：

```js
riskService.configure({
  ...
});
```

结束之后、`riskService.bindInteractionTracking(document);` 之前插入：

```js
submissionFlow.configure({
  submission:
    submissionService,

  risk:
    riskService,

  pwa:
    pwaService,

  inquiry:
    inquiryFeature,

  contact:
    contactFeature,

  storage:
    appStorage.local,

  archiveKey:
    SUBMISSION_ARCHIVE_KEY,

  lastSubmissionKey:
    LAST_SUBMISSION_KEY,

  pendingInquiryKey:
    PENDING_INQUIRY_KEY,

  archiveLimit:
    Math.max(
      1,
      Number(
        appConfig.archiveLimit
      )||
      20
    ),

  cooldownMs:
    Math.max(
      0,
      Number(
        appConfig.submitCooldownMs
      )||
      10000
    )
});
```

---

# 6. Contact Draft 整块替换

保留当前：

```js
function collect(){...}
```

它现在只是 DOM Adapter，允许继续存在。

删除整个：

```text
function readContactDraft()
function saveContactDraftNow()
function scheduleContactDraftSave()
function restoreContactDraft()
function bindContactDraft()
function clearContactDraft()
```

并替换为：

```js
function saveContactDraftNow(){
  contactFeature
    .replace(
      collect()
    );

  contactFeature
    .flushDraft();
}

function scheduleContactDraftSave(){
  contactFeature
    .scheduleDraft(
      collect(),
      250
    );
}

function restoreContactDraft(){
  const contact=
    contactFeature
      .loadDraft();

  CONTACT_FIELD_IDS
    .forEach(id=>{
      const element=
        document.getElementById(
          id
        );

      if(!element){
        return;
      }

      const value=
        contact[id];

      element.value=
        value==null
          ? ''
          : String(value);
    });
}

function bindContactDraft(){
  CONTACT_FIELD_IDS
    .forEach(id=>{
      const element=
        document.getElementById(
          id
        );

      if(
        !element||
        element.dataset
          .contactDraftBound===
          '1'
      ){
        return;
      }

      element.dataset
        .contactDraftBound=
        '1';

      element.addEventListener(
        'input',
        scheduleContactDraftSave
      );

      element.addEventListener(
        'change',
        scheduleContactDraftSave
      );
    });

  window.addEventListener(
    'pagehide',
    ()=>{
      if(
        activeScreen===
        'contact'
      ){
        saveContactDraftNow();
      }
    }
  );

  document.addEventListener(
    'visibilitychange',
    ()=>{
      if(
        document.visibilityState===
          'hidden'&&
        activeScreen===
          'contact'
      ){
        saveContactDraftNow();
      }
    }
  );
}

function clearContactDraft(){
  contactFeature
    .clearDraft();
}
```

修改后整个 `index.html` 不得出现：

```text
appStorage.local.getItem(CONTACT_DRAFT_KEY
appStorage.local.setItem(CONTACT_DRAFT_KEY
contactDraftTimer
```

---

# 7. 增加 Contact Validation UI Adapter

在 `goPreview()` 前增加：

```js
function applyContactValidation(
  validation
){
  validation.errors
    .forEach(error=>{
      const element=
        document.getElementById(
          error.field
        );

      element
        ?.closest(
          '.field'
        )
        ?.classList
        .add(
          'invalid'
        );

      if(
        error.code===
        'invalidName'
      ){
        toast(
          ui(
            'invalidName'
          )
        );
      }

      if(
        error.code===
        'invalidEmail'
      ){
        toast(
          ui(
            'invalidEmail'
          )
        );
      }

      if(
        error.code===
        'invalidPhone'
      ){
        toast(
          ui(
            'invalidPhone'
          )
        );
      }
    });

  return validation.valid;
}
```

---

# 8. 整个替换 goPreview()

替换为：

```js
function goPreview(){
  document
    .querySelectorAll(
      '[data-screen="contact"] .field'
    )
    .forEach(
      field=>
        field.classList
          .remove(
            'invalid'
          )
    );

  const contact=
    collect();

  const emailElement=
    document.getElementById(
      'email'
    );

  contactFeature
    .replace(
      contact
    );

  let ok=
    applyContactValidation(
      contactFeature
        .validate(
          contact,
          {
            emailValid:
              Boolean(
                emailElement&&
                contact.email&&
                emailElement
                  .checkValidity()
              )
          }
        )
    );

  if(
    !validateProductMoqGroups()
  ){
    ok=false;
  }

  for(
    const item of state.items
  ){
    if(
      item.type==='product'&&
      Number(item.qty)>
        maximumQuantity()
    ){
      toast(
        ui(
          'quantityTooLarge'
        )
      );

      ok=false;
      break;
    }

    if(
      item.type==='custom'&&
      (
        Number(item.qty)<
          customMoq()||
        Number(item.qty)>
          maximumQuantity()
      )
    ){
      toast(
        ui(
          'customMinQtyError'
        )
      );

      ok=false;
      break;
    }
  }

  if(!ok){
    return;
  }

  ensureInquiryId();

  contactFeature
    .flushDraft();

  go(
    'preview'
  );
}
```

修改后整个 `index.html`：

```text
state.contact=
```

必须为 0。

---

# 9. Projection 三个 consumer 改用 Contact Feature

在以下三个函数中：

```text
renderPreview()
buildWeb3FormsPayload()
submissionSnapshot()
```

找到：

```js
contact:
  state.contact||
  {},
```

全部替换为：

```js
contact:
  contactFeature
    .snapshot(),
```

最终 `state.contact` 在 `index.html` 中应为 0。

---

# 10. 删除 archiveSubmission()

整个删除：

```text
function archiveSubmission(snapshot){
...
}
```

Archive persistence 从 B5-06 起由：

```text
DreamlandInquirySubmissionFlow
```

拥有。

---

# 11. 删除 clearSubmittedInquiry()，换成纯 UI Reset

整个删除：

```text
function clearSubmittedInquiry(){
...
}
```

替换为：

```js
function resetSubmittedFormUi(){
  pendingInquiryId='';

  [
    'name',
    'company',
    'country',
    'city',
    'email',
    'phone',
    'message',
    'customQty',
    'customDate',
    'customColor',
    'customNote'
  ].forEach(id=>{
    const element=
      document.getElementById(
        id
      );

    if(element){
      element.value='';
    }
  });

  [
    'buyerType',
    'customUse',
    'customBudget',
    'customSize',
    'customScent',
    'customPack',
    'customBranding'
  ].forEach(id=>{
    const element=
      document.getElementById(
        id
      );

    if(element){
      element.selectedIndex=0;
    }
  });
}
```

注意：

```text
Inquiry items
Contact Feature
Contact Draft
pendingInquiryId storage
Archive
LAST_SUBMISSION
```

都由 Submission Flow 清理/持久化。

这个函数只清 DOM 和当前页面变量。

---

# 12. 增加 Submit Gate UI 映射

在 `submitInquiry()` 前增加：

```js
function handleSubmissionGate(
  gate
){
  if(gate.ok){
    return true;
  }

  if(
    gate.code===
    'DUPLICATE'
  ){
    toast(
      ui(
        'submissionDuplicate'
      )
    );

    return false;
  }

  if(
    gate.code===
    'COOLDOWN'
  ){
    toast(
      ui(
        'submissionCooldown'
      )
    );

    return false;
  }

  if(
    gate.code===
    'NOT_CONFIGURED'
  ){
    toast(
      ui(
        'formNotConfigured'
      )
    );

    return false;
  }

  return false;
}
```

---

# 13. 整个替换 submitInquiry()

替换成：

```js
async function submitInquiry(){
  const btn=
    document.getElementById(
      'submitBtn'
    );

  const error=
    document.getElementById(
      'verificationError'
    );

  if(!btn){
    return;
  }

  if(
    !handleSubmissionGate(
      submissionFlow
        .preflight()
    )
  ){
    return;
  }

  const consent=
    document.getElementById(
      'privacyConsent'
    );

  if(
    !consent?.checked
  ){
    if(error){
      error.textContent=
        ui(
          'privacyRequired'
        );

      error.classList
        .add(
          'show'
        );
    }

    toast(
      ui(
        'privacyRequired'
      )
    );

    return;
  }

  if(
    submissionRiskRequiresCaptcha&&
    !hcaptchaToken()
  ){
    try{
      btn.disabled=true;

      btn.innerHTML=
        '<span class="loader"></span>';

      await ensureHCaptchaVerification();

      btn.disabled=false;

      btn.textContent=
        ui(
          'confirmSubmit'
        );
    }catch(captchaError){
      console.error(
        'hCaptcha challenge failed:',
        captchaError
      );

      if(error){
        error.textContent=
          riskText(
            'captchaRetry'
          );

        error.classList
          .add(
            'show'
          );
      }

      toast(
        riskText(
          'captchaRetry'
        )
      );

      btn.disabled=false;

      btn.textContent=
        ui(
          'confirmSubmit'
        );

      return;
    }
  }

  error
    ?.classList
    .remove(
      'show'
    );

  btn.disabled=true;

  btn.innerHTML=
    '<span class="loader"></span>';

  try{
    const inquiryId=
      ensureInquiryId();

    const snapshot=
      submissionSnapshot(
        inquiryId
      );

    const payload=
      buildWeb3FormsPayload(
        inquiryId
      );

    await submissionFlow
      .submit({
        inquiryId,
        payload,
        submissionSnapshot:
          snapshot,
        captchaToken:
          hcaptchaToken()
      });

    resetSubmittedFormUi();

    btn.textContent=
      ui(
        'confirmSubmit'
      );

    go(
      'success'
    );
  }catch(errorObject){
    console.error(
      errorObject
    );

    if(
      errorObject?.code===
      'DUPLICATE'
    ){
      toast(
        ui(
          'submissionDuplicate'
        )
      );
    }else if(
      errorObject?.code===
      'COOLDOWN'
    ){
      toast(
        ui(
          'submissionCooldown'
        )
      );
    }else if(
      errorObject?.code===
      'NOT_CONFIGURED'
    ){
      toast(
        ui(
          'formNotConfigured'
        )
      );
    }else if(
      errorObject?.code===
        'OFFLINE'||
      errorObject?.reachable===
        false
    ){
      toast(
        pwaService.text(
          'offlineSubmit'
        )
      );
    }else{
      toast(
        ui(
          'submitFailed'
        )
      );
    }

    btn.textContent=
      ui(
        'confirmSubmit'
      );

    riskService
      .resetCaptcha();
  }finally{
    btn.disabled=false;
  }
}
```

修改后 `submitInquiry()` 内必须全部为 0：

```text
submissionService.submit(
pwaService.probeReachability(
riskService.recordAttempt(
archiveSubmission(
clearSubmittedInquiry(
submittingInquiry
lastSubmitAttemptAt
```

---

# 14. 保留 Risk / Captcha UI

本轮不要迁以下函数：

```text
riskText
ensureRiskHoneypot
riskHoneypotValue
setRiskStatus
captchaSection
renderHCaptcha
ensureHCaptchaVerification
handlePrivacyConsentChange
assessSubmissionRisk
```

`assessSubmissionRisk()` 仍直接：

```text
riskService.assess(...)
```

B5-06 只迁最终提交事务编排，不迁 Preview 风险 UI。
