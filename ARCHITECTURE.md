# DREAMLAND-CATALOG 系统架构说明

> 最后更新：2026-06-23
> 适用仓库：`fryjin/DREAMLAND-CATALOG`

本文档说明 DREAMLAND 产品电子手册当前的系统结构、数据流、询盘提交链路、风险控制、PWA机制和已知限制。

部署与环境配置请参阅：

```text
DEPLOYMENT.md
```

---

## 1. 系统定位

DREAMLAND-CATALOG 是一个面向采购商使用的产品电子手册与询盘工具。

系统主要提供：

* 产品目录浏览
* 产品详情查看
* 多语言展示
* 产品规格选择
* 意向商品管理
* 预计金额计算
* 联系资料填写
* 询盘预览
* 风险评估
* 自适应hCaptcha
* Web3Forms询盘提交
* PWA安装与基础离线能力
* 浏览器本地草稿与提交记录

当前系统采用静态前端为主、轻量Cloudflare Function辅助的架构。

---

## 2. 系统总览

```text
┌──────────────────────────────────────┐
│              用户浏览器              │
│                                      │
│  页面 / 商品数据 / 意向单 / PWA       │
│                                      │
│  1. 加载静态资源                      │
│  2. 管理本地意向单                    │
│  3. 收集联系资料                      │
│  4. 调用风险评估接口                  │
│  5. 必要时显示hCaptcha                │
│  6. 直接提交Web3Forms                 │
└───────────────┬──────────────────────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
┌────────────────┐  ┌────────────────────┐
│ Cloudflare     │  │ Web3Forms          │
│ Pages          │  │                    │
│                │  │ 最终接收询盘       │
│ 静态资源托管   │  │ hCaptcha校验       │
│ Pages Function │  │ Inbox记录          │
│ 风险评估       │  │ 邮件通知           │
│ KV风险计数     │  │                    │
└────────────────┘  └────────────────────┘
```

---

## 3. 主要技术组成

| 层级    | 当前技术                                  |
| ----- | ------------------------------------- |
| 页面层   | HTML、CSS、原生JavaScript                 |
| 配置与数据 | JSON                                  |
| 静态托管  | Cloudflare Pages                      |
| 服务端辅助 | Cloudflare Pages Functions            |
| 风险数据  | Cloudflare KV                         |
| 验证码   | hCaptcha                              |
| 询盘投递  | Web3Forms                             |
| 自动检查  | GitHub Actions                        |
| 版本管理  | GitHub                                |
| PWA   | Web App Manifest、Service Worker、浏览器缓存 |

当前项目不依赖传统应用服务器，也没有独立数据库。

---

## 4. 目录职责

核心目录及文件职责如下：

```text
/
├─ index.html
├─ privacy.html
├─ manifest.webmanifest
├─ service-worker相关文件
├─ data/
│  ├─ app-config.json
│  └─ 商品及页面数据
├─ images/
│  └─ 产品图片与页面资源
├─ functions/
│  └─ api/
│     └─ submit.js
├─ .github/
│  └─ workflows/
│     └─ quality-check.yml
├─ DEPLOYMENT.md
└─ ARCHITECTURE.md
```

### `index.html`

负责：

* 应用主要界面
* 商品目录和详情
* 意向单管理
* 联系资料表单
* 询盘预览
* 风险评估调用
* hCaptcha渲染
* Web3Forms直接提交
* 本地状态保存
* PWA安装交互

### `data/app-config.json`

负责保存运行时配置，例如：

```json
{
  "web3formsSubmitUrl": "https://api.web3forms.com/submit",
  "web3formsAccessKey": "<current-access-key>",
  "submissionEndpoint": "./api/submit"
}
```

主要字段职责：

| 字段                   | 职责               |
| -------------------- | ---------------- |
| `web3formsSubmitUrl` | 最终询盘提交地址         |
| `web3formsAccessKey` | Web3Forms表单标识    |
| `submissionEndpoint` | Cloudflare风险评估接口 |
| `hcaptcha`           | 验证码显示策略          |
| `riskControl`        | 前端风险参数           |
| `pwa`                | PWA及联网检测配置       |

### `functions/api/submit.js`

负责：

* GET健康检查
* POST风险评估
* 基本数据验证
* 蜜罐识别
* IP频率风险
* 内容重复风险
* 快速重复风险
* 风险评分
* 判断是否要求hCaptcha
* 返回hCaptcha Site Key

不负责：

* 最终询盘投递
* Web3Forms服务端转发
* 邮件发送
* 服务端询盘归档
* 服务端防重复幂等
* 服务端生成询盘编号

---

## 5. 页面数据流

```text
data/*.json
→ 前端加载
→ 转换为页面状态
→ 渲染产品目录
→ 用户选择产品
→ 写入意向单状态
→ 保存至localStorage
→ 生成询盘摘要
```

商品信息主要包含：

* 产品ID
* 产品名称
* 多语言名称
* 系列
* 图片
* MOQ
* 尺寸
* 香型
* 图案
* 包装
* 数量
* 价格估算信息

当前商品数据属于静态内容，修改后需要重新部署站点。

---

## 6. 意向单状态

意向单主要保存在浏览器内存和 `localStorage` 中。

当前可能包含：

```text
product items
custom items
contact information
pending inquiry id
submission archive
last submission
language
PWA preferences
```

本地保存的作用：

* 页面刷新后恢复意向单
* 避免填写过程中资料丢失
* 保存待提交询盘编号
* 保存最近提交记录
* 降低误重复提交概率

本地数据不是服务器数据库，用户清理浏览器数据后会丢失。

---

## 7. 询盘编号

当前询盘编号由浏览器生成，例如：

```text
DL-20260623-4W4S2B
```

编号用于：

* 页面显示
* Web3Forms邮件主题
* Web3Forms Inbox识别
* 浏览器本地归档
* 待提交状态恢复
* 普通重复点击控制

编号不是服务端数据库主键，因此不能实现严格的跨设备幂等。

---

## 8. 风险评估链路

前端向以下地址发送风险评估：

```text
POST ./api/submit
```

请求结构概念：

```json
{
  "action": "assess",
  "website": "",
  "payload": {},
  "risk": {}
}
```

Cloudflare Function只接受：

```text
action: assess
```

其他action返回：

```text
400 Unsupported action
```

---

## 9. 风险评分来源

当前风险评分包括：

### 请求来源

* Origin不匹配
* 缺少User-Agent

### 用户行为

* 会话时间过短
* 表单填写时间过短
* 交互次数过少
* 本地重复尝试次数过多

### 内容特征

* URL数量过多
* 请求体过大
* 重复内容
* 短时间重复内容

### IP频率

* 同一IP在时间窗口内重复评估

---

## 10. KV风险存储

Cloudflare KV绑定名称：

```text
RISK_STORE
```

当前存储三类计数：

```text
ip:<hash>
content:<hash>
rapid:<hash>
```

对应时间窗口：

| 类型     | 时间窗口  |
| ------ | ----- |
| IP计数   | 600秒  |
| 内容重复   | 3600秒 |
| 快速重复内容 | 60秒   |

IP和内容在写入KV前会进行SHA-256哈希。

KV只用于风险统计，不保存完整询盘正文。

---

## 11. 自适应hCaptcha

当前验证码模式：

```text
adaptive-risk
```

验证码不是每次提交都显示。

### 低风险

```text
风险分数 < RISK_THRESHOLD
→ captcha_required: false
→ 直接提交Web3Forms
```

### 高风险

```text
风险分数 >= RISK_THRESHOLD
→ captcha_required: true
→ 返回site_key
→ 前端渲染hCaptcha
→ 用户完成验证
→ token提交Web3Forms
```

当前使用Web3Forms免费方案兼容的hCaptcha Site Key：

```text
50b2fe65-b00b-4b9e-ad62-3ba471098be2
```

如果使用无法被Web3Forms验证的自定义Site Key，最终提交可能返回：

```text
Could not validate hCaptcha. Please try later
```

---

## 12. Web3Forms直接提交

完成风险评估和必要的验证码后，浏览器直接调用：

```text
POST https://api.web3forms.com/submit
```

提交数据包含：

* `access_key`
* `subject`
* `from_name`
* `email`
* `inquiry_id`
* 联系资料
* 产品摘要
* 产品JSON
* 自定义项目JSON
* 预计金额
* 隐私同意状态
* 必要时的 `h-captcha-response`

Web3Forms负责：

* 校验Access Key
* 校验字段
* 必要时验证hCaptcha
* 写入Inbox
* 发送通知邮件
* 返回成功或错误结果

---

## 13. 为什么使用浏览器直连

此前曾采用：

```text
浏览器
→ Cloudflare Function
→ Web3Forms
```

该方案出现过：

* Web3Forms 400
* 询盘进入Spam
* 服务端转发链路复杂
* 错误来源难以定位

当前改为：

```text
浏览器
→ Web3Forms
```

Cloudflare只负责风险评估。

这样减少了中间转发层，并恢复了Web3Forms对浏览器表单提交的正常识别。

---

## 14. 防重复机制

当前防重复主要位于浏览器端，包括：

* 提交按钮锁定
* 提交冷却时间
* 待提交询盘编号
* 本地提交记录
* 当前页面活动请求控制
* 成功后状态更新

当前防重复适用于：

* 用户双击按钮
* 网络稍慢时重复点击
* 同一浏览器中的普通误操作

不能完全防止：

* 多设备重复提交
* 清理浏览器数据后重复提交
* 脚本直接调用Web3Forms
* 并发伪造请求

严格幂等需要未来增加独立后端和数据库。

---

## 15. 蜜罐机制

表单包含隐藏的 `website` 字段。

正常用户不会填写该字段。

如果字段存在内容：

```text
website != ""
```

风险接口将其识别为自动化提交。

蜜罐属于辅助反垃圾机制，不能替代验证码和第三方反垃圾过滤。

---

## 16. PWA架构

系统具备PWA能力，包括：

* Web App Manifest
* Service Worker
* 安装提示
* 页面缓存
* 商品资源缓存
* 联网检测
* 版本更新检查
* 浏览器菜单安装引导

当前联网探测目标为：

```text
risk-assessment
```

实际探测地址应为：

```text
./api/submit?connectivity_check=<timestamp>
```

不能使用：

```text
https://api.web3forms.com/submit
```

作为GET联网探测地址，否则会收到405。

---

## 17. PWA缓存风险

PWA可能导致旧版HTML或JavaScript在新部署后短时间继续运行。

典型表现：

* 页面仍调用旧接口
* 新配置不生效
* 新版提交逻辑未加载
* 验证码使用旧Site Key

排查方式：

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
→ Ctrl + Shift + R
```

发布时必须考虑旧缓存客户端的兼容性。

---

## 18. 隐私边界

当前系统可能处理：

* 姓名
* 公司名称
* 国家或地区
* 城市
* 邮箱
* 电话或微信
* 采购需求
* 商品意向

隐私要求：

* 页面提交前必须明确同意隐私政策
* 不应将完整联系资料写入KV
* 不应把客户信息输出到Console
* 不应把真实询盘内容写入公开日志
* 文档中不得记录真实客户资料
* 文档中不得记录真实Web3Forms Access Key

---

## 19. 安全边界

当前安全能力包括：

* 基本字段校验
* 蜜罐字段
* 风险评分
* IP频率统计
* 内容重复统计
* 自适应hCaptcha
* Web3Forms反垃圾系统
* 浏览器端提交锁

当前架构限制：

* Web3Forms Access Key位于前端，可被浏览器查看
* 风险评估可以被恶意请求绕过
* 浏览器端防重复不是严格幂等
* 没有独立数据库
* 没有账号系统
* 没有后台权限系统
* 没有完整服务端审计记录

---

## 20. 第三方依赖

| 服务                   | 用途      | 故障影响      |
| -------------------- | ------- | --------- |
| Cloudflare Pages     | 页面与资源托管 | 站点不可访问    |
| Cloudflare Functions | 风险评估    | 提交流程受阻    |
| Cloudflare KV        | 持久风险计数  | 风控能力降低    |
| hCaptcha             | 高风险验证   | 高风险用户无法提交 |
| Web3Forms            | 询盘接收与邮件 | 最终询盘无法投递  |
| GitHub               | 版本和发布源  | 无法正常发布    |
| GitHub Actions       | 自动检查    | 发布质量门禁失效  |

---

## 21. 故障降级原则

### KV不可用

风险接口应尽量继续提供基础风险判断，但持久频率检测会失效。

### hCaptcha不可用

高风险请求无法完成验证，应提示稍后重试，不应绕过验证自动提交。

### Web3Forms不可用

必须保留：

* 当前意向单
* 联系资料
* 待提交询盘编号

不得清空用户资料或错误显示成功。

### Cloudflare Function不可用

前端不应跳过风险评估直接视为安全提交。

---

## 22. 当前没有的组件

当前系统没有：

* 独立询盘数据库
* CRM
* 管理后台
* 用户登录
* 服务端订单系统
* 正式服务器端幂等
* 自有域名邮件服务
* 客户自动确认邮件
* 服务端报价生成

这些能力属于后续版本范围。

---

## 23. 后续架构方向

计划中的长期演进：

```text
当前版本
静态PWA
+ Cloudflare风险评估
+ Web3Forms

下一阶段
静态PWA
+ 稳定错误处理
+ 草稿恢复
+ 自动测试和监控

长期版本
前端
+ API
+ 数据库
+ 管理后台
+ 正式邮件服务
+ CRM或任务系统
```

未来可能增加：

* Cloudflare D1或其他数据库
* 独立询盘API
* 服务端严格幂等
* 询盘管理后台
* 报价状态管理
* Resend、Postmark或其他邮件服务
* 客户确认邮件
* 业务统计
* 错误监控

---

## 24. 架构修改规则

涉及以下内容时，必须同步更新本文档：

* 提交接口地址
* Web3Forms调用方式
* hCaptcha验证方式
* 风险评分规则
* KV键结构
* PWA缓存策略
* 本地存储结构
* 商品数据结构
* 第三方服务
* 数据库
* 后台系统
* 邮件投递架构

每次重大架构调整应在Pull Request中说明：

* 调整前架构
* 调整后架构
* 数据迁移影响
* 缓存兼容性
* 配置变化
* 安全影响
* 回滚方式
