# DREAMLAND 业务闭环配置

本阶段已完成：

- Web3Forms 正式提交结构
- 真实意向编号并同步到邮件主题与内容
- 成功提交后的本地摘要归档和当前意向单清理
- 商品封面与 MOQ 进入意向单
- 邮箱、联系人、数量、MOQ 与最大数量校验
- 中英韩隐私说明与强制同意
- hCaptcha 人机验证与重复提交冷却

## 上线前必须配置

打开 `data/app-config.json`，把：

```json
"web3formsAccessKey": "REPLACE_WITH_WEB3FORMS_ACCESS_KEY"
```

替换为你在 Web3Forms 获得的真实 Access Key。

然后在 Web3Forms 对应表单设置中启用 hCaptcha。当前代码使用 Web3Forms 免费方案提供的通用 hCaptcha Site Key。

## 当前占位 MOQ

- 进阶系列：50
- 匠作系列：50
- 节日系列：100
- 经典系列：100
- 定制意向：50

正式产品资料确认后，可直接修改：

- `data/products.json` 中每个产品的 `moq`
- `data/series.json` 中每个系列的 `defaultMoq`
- `data/app-config.json` 中的 `customMoq`

## 隐私说明

`privacy.html` 已提供中、英、韩三语版本。正式上线前请确认公司名称、联系邮箱和记录保存政策符合实际执行方式。

Deployment refresh: 2026-06-16
