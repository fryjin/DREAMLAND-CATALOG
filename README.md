# DREAMLAND v1.2.3 客户文案优化最终版

## 本次更新

- 首页全部文案保持不变。
- 保留“发现 × 个好梦”的品牌表达。
- 保留“意向单”作为功能名称。
- 优化商品详情、定制、意向单、联系信息、提交确认、成功页、错误提示、离线与更新提示。
- 删除客户页面中的 Web3Forms、Access Key、同步状态、缓存策略等内部技术信息。
- 删除“顾问”“专人”以及“已归档”等不符合实际流程的表达。
- 新增真实成交流程说明：提交意向单不代表正式下单；确认需求和报价后，线下签约付款，再安排生产。
- 同步优化英文与韩文；韩文采用自然的 해요체。
- 修复定制香型摘要可能出现 `||ui('scentRecommend')` 字符串的问题。

## 文件

```text
copy-polish.js
catalog-data.js
custom-scent-multi.js
privacy.html
offline.html
manifest.webmanifest
data/app-config.json
sw.js
COPY_AUDIT.md
README.md
```

## 上传顺序

上传到 `develop`：

```text
1. copy-polish.js
2. custom-scent-multi.js
3. privacy.html
4. offline.html
5. manifest.webmanifest
6. data/app-config.json
7. catalog-data.js
8. sw.js
```

`sw.js` 最后上传。缓存版本：

```text
dreamland-pwa-v57
```

## 验收重点

1. 首页标题、副文案、按钮、滑动提示与当前版本一致。
2. 商品目录仍显示“发现 × 个好梦”。
3. 商品详情显示“选择规格”“参考单价”“查看数量价格”。
4. 定制页显示“定制需求”“使用场景”“希望何时交付”“同一系列可多选”。
5. 意向单不再出现“顾问确认”，显示“查看已选内容和参考金额”。
6. 联系页显示“联系信息”，说明为“方便我们联系您确认需求和报价”。
7. 提交确认页不出现 Web3Forms、Access Key 或同步状态。
8. 提交确认页显示正式下单流程说明。
9. 成功页显示“意向单已提交”“我们会联系您确认需求和报价”。
10. 中、英、韩切换后页面无内部术语、无中文混入韩文。
11. 定制多香型、价格、图片渐进加载和提交功能没有回归。

## 说明

本包基于已验收的 v1.2.2 图片渐进加载版本制作，不修改商品数据、价格、图片资源或提交规则。
