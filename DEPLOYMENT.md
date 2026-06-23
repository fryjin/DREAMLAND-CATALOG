# DREAMLAND-CATALOG 部署与发布指南

> 最后更新：2026-06-23
> 适用仓库：`fryjin/DREAMLAND-CATALOG`

本文档记录 DREAMLAND 产品电子手册的部署环境、配置项、发布流程、验收标准、故障排查和回滚方法。

部署架构、环境变量或第三方服务发生变化时，必须同步更新本文档。

---

## 1. 项目基本信息

### GitHub

* 仓库：`fryjin/DREAMLAND-CATALOG`
* 开发分支：`develop`
* 正式分支：`main`

### Cloudflare Pages

* 项目名称：`dreamland-catalog`
* Preview：`https://develop.dreamland-catalog.pages.dev`
* Production：`https://dreamland-catalog.pages.dev`

### 分支职责

| 分支        | 用途              | Cloudflare环境 |
| --------- | --------------- | ------------ |
| `develop` | 开发、测试、Preview验收 | Preview      |
| `main`    | 已验收的正式版本        | Production   |

未经 Preview 验收的代码，不得直接进入 `main`。

---

## 2. 当前部署架构

```text
用户浏览器
├─ 加载静态页面、商品数据和PWA资源
├─ POST /api/submit
│  └─ Cloudflare Pages Function执行风险评估
├─ hCaptcha
│  └─ 风险评分达到阈值时才显示
└─ POST https://api.web3forms.com/submit
   └─ Web3Forms接收询盘并发送邮件通知
```

### 当前职责划分

#### Cloudflare Pages

负责：

* 静态页面托管
* 商品数据和图片资源托管
* PWA资源托管
* Pages Function运行
* Preview与Production部署

#### `functions/api/submit.js`

负责：

* GET健康检查
* POST风险评估
* IP频率评分
* 重复内容评分
* 短时间重复内容评分
* 蜜罐字段检测
* 根据风险分数决定是否要求hCaptcha

不再负责：

* 向Web3Forms转发询盘
* 发送邮件
* 生成服务端询盘编号
* 服务端询盘幂等

#### Web3Forms

负责：

* 接收浏览器直接提交的询盘
* 验证提交字段
* 必要时验证hCaptcha token
* 将询盘写入Web3Forms Inbox
* 发送邮件通知

---

## 3. 当前询盘提交流程

### 低风险提交

```text
用户填写询盘
→ 浏览器调用 /api/submit 风险评估
→ 风险分数低于阈值
→ 不显示hCaptcha
→ 浏览器直接提交Web3Forms
→ Web3Forms返回成功
→ 页面显示询盘提交成功
```

### 高风险提交

```text
用户填写询盘
→ 浏览器调用 /api/submit 风险评估
→ 风险分数达到阈值
→ 显示hCaptcha
→ 用户完成验证
→ 浏览器携带h-captcha-response提交Web3Forms
→ Web3Forms验证token
→ 页面显示询盘提交成功
```

---

## 4. Cloudflare Pages配置

进入：

```text
Cloudflare
→ Workers & Pages
→ dreamland-catalog
→ Settings
```

Preview和Production环境需要分别检查。

---

## 5. Cloudflare环境变量

### 必须保留

| 变量名                 | 类型        | 用途             |
| ------------------- | --------- | -------------- |
| `HCAPTCHA_SITE_KEY` | Plaintext | 高风险时渲染hCaptcha |
| `RISK_THRESHOLD`    | Plaintext | 风险评分阈值         |

当前Web3Forms免费方案兼容的hCaptcha Site Key：

```text
50b2fe65-b00b-4b9e-ad62-3ba471098be2
```

Preview和Production应使用相同的有效Site Key。

否则Web3Forms可能返回：

```text
Could not validate hCaptcha. Please try later
```

### 暂时保留

| 变量名               | 类型     | 当前状态                   |
| ----------------- | ------ | ---------------------- |
| `HCAPTCHA_SECRET` | Secret | 当前清理后的Function未使用，暂时保留 |

暂时保留不会影响现有功能，也通常不会产生额外费用。

后续确认不再恢复服务端hCaptcha验证后，可以统一删除。

### 不再需要

以下变量不应重新添加：

```text
WEB3FORMS_ACCESS_KEY
DEBUG_SUBMISSION_ERRORS
```

原因：

* Web3Forms Access Key当前由浏览器读取；
* Cloudflare Function不再转发Web3Forms；
* 调试错误变量已废弃。

---

## 6. Cloudflare KV绑定

必须保留以下KV绑定：

| 绑定名称         | 用途       |
| ------------ | -------- |
| `RISK_STORE` | 保存风险评估计数 |

用于记录：

* IP提交频率
* 重复内容次数
* 短时间重复内容次数

Preview和Production应分别确认绑定存在。

---

## 7. 前端应用配置

配置文件：

```text
data/app-config.json
```

关键字段：

```json
{
  "web3formsSubmitUrl": "https://api.web3forms.com/submit",
  "web3formsAccessKey": "<current-access-key>",
  "submissionEndpoint": "./api/submit"
}
```

### 字段说明

| 字段                   | 用途               |
| -------------------- | ---------------- |
| `web3formsSubmitUrl` | 浏览器直接提交询盘的目标地址   |
| `web3formsAccessKey` | Web3Forms表单识别凭证  |
| `submissionEndpoint` | Cloudflare风险评估接口 |

### 注意事项

* 文档中不要记录真实Access Key。
* 不要删除 `web3formsAccessKey`。
* 不要删除或重命名 `submissionEndpoint`，除非同步修改前端代码。
* 不要恢复旧字段 `web3formsEndpoint`。
* `pwa.connectivityProbeTarget` 应保持为：

```json
"connectivityProbeTarget": "risk-assessment"
```

---

## 8. Web3Forms后台配置

当前建议：

* Captcha Protection：`None`
* Advanced Spam Filter：启用
* 接收邮箱：已验证
* 邮件通知：启用

### 为什么Captcha Protection保持None

当前项目使用自适应验证码：

* 低风险用户免验证；
* 高风险用户才显示验证码。

如果在Web3Forms后台启用每次强制验证码，可能会破坏当前自适应逻辑。

### hCaptcha兼容要求

浏览器提交的：

```text
h-captcha-response
```

必须由Web3Forms能够识别的Site Key生成。

当前免费方案使用：

```text
50b2fe65-b00b-4b9e-ad62-3ba471098be2
```

---

## 9. GitHub Actions与分支保护

`main`为受保护分支。

正式发布必须满足：

* 修改先进入 `develop`
* GitHub Actions `quality-check` 通过
* Cloudflare Preview部署成功
* Preview完成验收
* 通过Pull Request合并到 `main`
* Production部署完成后再次验收

不得绕过required check直接修改 `main`。

---

## 10. 标准开发流程

### 第一步：在develop开发

确认当前分支：

```text
develop
```

完成修改后提交。

Commit message应说明实际修改内容，例如：

```text
Add deployment documentation
```

### 第二步：等待自动检查

确认：

* GitHub Actions通过
* Cloudflare Preview部署成功

### 第三步：Preview验收

Preview地址：

```text
https://develop.dreamland-catalog.pages.dev
```

---

## 11. Preview验收清单

至少完成以下检查：

* [ ] 首页正常加载
* [ ] 商品数据正常加载
* [ ] 商品图片正常显示
* [ ] 多语言切换正常
* [ ] 商品可加入意向单
* [ ] 商品规格可调整
* [ ] 联系信息可填写
* [ ] 隐私勾选校验正常
* [ ] 风险评估接口正常
* [ ] 低风险提交正常
* [ ] 高风险时hCaptcha正常显示
* [ ] hCaptcha可正常完成
* [ ] Web3Forms请求返回200
* [ ] Web3Forms Inbox收到记录
* [ ] 邮箱收到通知
* [ ] 页面进入提交成功状态
* [ ] 双击提交不会产生重复记录
* [ ] Console无阻塞性错误

---

## 12. 风险接口健康检查

Preview：

```text
https://develop.dreamland-catalog.pages.dev/api/submit
```

Production：

```text
https://dreamland-catalog.pages.dev/api/submit
```

预期响应：

```json
{
  "success": true,
  "service": "dreamland-risk-assessment",
  "status": "ready"
}
```

如果返回404或500，应先检查：

* `functions/api/submit.js`
* Cloudflare Pages Functions部署状态
* Cloudflare部署日志
* KV绑定状态

---

## 13. 创建Pull Request

Preview验收通过后，创建：

```text
base: main
compare: develop
```

PR描述建议包含：

```markdown
## Changes

- 修改内容1
- 修改内容2

## Configuration

- 是否修改Cloudflare变量
- 是否修改KV绑定
- 是否修改Web3Forms配置

## Preview Verification

- [x] Preview部署成功
- [x] 风险接口正常
- [x] 询盘提交成功
- [x] Web3Forms Inbox收到记录
- [x] 邮件通知成功

## Rollback

说明出现问题时应回退哪个提交或PR。
```

---

## 14. Production发布流程

Pull Request检查通过后：

1. 合并 `develop` 到 `main`
2. 等待Cloudflare Production部署
3. 打开正式站
4. 执行完整冒烟测试
5. 确认询盘提交成功
6. 确认Web3Forms Inbox收到记录
7. 确认邮箱收到通知
8. 检查Console和Network

Production地址：

```text
https://dreamland-catalog.pages.dev
```

---

## 15. Production冒烟测试

每次正式发布至少检查：

* [ ] 首页正常
* [ ] 商品目录正常
* [ ] 商品详情正常
* [ ] 商品图片正常
* [ ] 多语言正常
* [ ] 意向单正常
* [ ] 联系表单正常
* [ ] `/api/submit`返回ready
* [ ] 风险评估请求成功
* [ ] 高风险验证码正常
* [ ] Web3Forms返回200
* [ ] Web3Forms Inbox收到记录
* [ ] 邮箱收到通知
* [ ] 页面显示成功编号
* [ ] Console无阻塞性错误
* [ ] PWA更新正常

---

## 16. PWA缓存问题处理

发布新版本后，如果页面仍表现为旧版本，优先清理Service Worker。

Chrome：

```text
F12
→ Application
→ Service Workers
→ Unregister
```

然后：

```text
Application
→ Storage
→ Clear site data
```

重新打开页面，执行：

```text
Ctrl + Shift + R
```

注意：

* 已生成的hCaptcha token不可长期复用；
* 清理缓存或重新部署后，应重新完成验证码；
* 不要重复使用旧页面中的验证码结果。

---

## 17. 常见故障排查

### 17.1 Web3Forms返回400

在浏览器DevTools中打开：

```text
Network
→ submit
→ Response
```

检查：

* `access_key`是否存在
* `email`是否有效
* `h-captcha-response`是否存在
* Response中的 `message`

### 17.2 hCaptcha验证失败

错误示例：

```text
Could not validate hCaptcha. Please try later
```

检查：

* Preview的 `HCAPTCHA_SITE_KEY`
* Production的 `HCAPTCHA_SITE_KEY`
* 页面是否仍使用旧缓存
* 是否复用了旧token
* 是否使用Web3Forms兼容Site Key

### 17.3 风险接口返回Unsupported action

当前Cloudflare接口只接受：

```json
{
  "action": "assess"
}
```

前端不应再通过 `/api/submit` 提交最终询盘。

### 17.4 Web3Forms返回405

检查联网探测是否错误请求了：

```text
https://api.web3forms.com/submit
```

联网探测应该访问：

```text
./api/submit?connectivity_check=<timestamp>
```

### 17.5 询盘进入Spam

检查：

* 是否仍为浏览器直接提交Web3Forms
* 是否恢复了旧服务端转发逻辑
* Web3Forms Advanced Spam Filter是否正常
* 测试内容是否过度重复
* 测试姓名和内容是否明显为自动化占位文本

---

## 18. 回滚流程

### GitHub回滚

正式版本异常时优先：

1. 找到最近合并的Pull Request
2. 创建Revert
3. 等待quality-check
4. 合并回滚PR
5. 等待Production重新部署
6. 再次执行正式环境验收

### Cloudflare紧急回滚

仅在正式站严重不可用，无法等待GitHub流程时使用：

```text
Cloudflare
→ dreamland-catalog
→ Deployments
→ 选择上一个已验收部署
→ Rollback
```

Cloudflare紧急回滚后，仍必须在GitHub补充代码回退，避免仓库状态和生产状态不一致。

---

## 19. 稳定版本Tag

Sprint 1完成并正式验收后，计划创建：

```text
v1.1.0-web3forms-direct
```

创建Tag前确认：

* [ ] `develop`已合并到 `main`
* [ ] Production部署成功
* [ ] 正式询盘提交成功
* [ ] Web3Forms Inbox正常
* [ ] 邮件通知正常
* [ ] DEPLOYMENT.md已更新
* [ ] ARCHITECTURE.md已更新
* [ ] README旧说明已修正

---

## 20. 已知限制

* Web3Forms Access Key位于前端配置中，浏览器用户可以查看，这是当前前端直连模式的特性。
* Cloudflare风险评估属于正常前端流程，不能完全阻止恶意请求绕过页面直接调用Web3Forms。
* 最终反垃圾能力依赖Web3Forms、hCaptcha及第三方平台过滤。
* 当前没有独立询盘数据库。
* 询盘记录主要依赖Web3Forms Inbox、邮件通知和浏览器本地记录。
* `HCAPTCHA_SECRET`目前未被清理后的Function使用，但暂时保留。
* PWA用户可能短时间使用旧缓存，发布后必须检查Service Worker更新状态。
