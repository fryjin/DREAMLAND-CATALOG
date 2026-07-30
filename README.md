# DREAMLAND v1.2.2：详情轮播渐进加载优化

## 问题定位

现有生成脚本只为商品封面生成 480px 图片，角度图、细节图和尺寸图只有 960px。
详情轮播必须等待 960px 请求完成才显示，因此即使文件已经压缩，大陆跨境首请求仍会留下明显骨架屏等待。

## 本次方案

- 所有商品轮播图片同时生成 480px 与 960px WebP。
- 详情页先显示 480px 预览图。
- 960px 图片在后台加载和解码后无闪烁替换。
- 弱网或开启省流量模式时保留 480px，不强制升级高清。
- 相邻轮播图只预加载 480px：下一张约 650ms 后，上一张约 1350ms 后。
- 用户切换到某张图片时，再把该张升级为 960px。
- 原始图片继续作为最终兜底，不影响现有素材兼容性。

## 上传文件

上传到 develop 分支：

1. `detail-progressive.js`
2. `catalog-data.js`
3. `scripts/generate-responsive-images.mjs`
4. `sw.js`

`sw.js` 缓存版本为 `dreamland-pwa-v55`。

## Actions

现有 `Optimize responsive images` 会被 `scripts/generate-responsive-images.mjs` 的修改自动触发。
成功后将为非封面轮播图新增：

```text
images/generated/products/ADV001/angle-480.webp
images/generated/products/ADV001/detail-480.webp
images/generated/products/ADV001/size-s-480.webp
```

并更新 `data/image-optimization-report.json`。

## 验收

1. 等待 Optimize responsive images 完成自动提交。
2. 等待 Cloudflare Pages 完成该机器人提交的部署。
3. 微信内关闭旧页面并重新打开。
4. 首次打开商品详情时，应先快速看到清晰度稍低的图片，而不是长时间骨架屏。
5. 约数百毫秒后图片应在原位置自动变清晰，不闪白、不改变轮播位置。
6. 快速滑动到下一张时，应先立即显示 480px 预览，再后台升级。
7. Network 中应先看到 `-480.webp`，随后当前活动图出现 `-960.webp`。

## 说明

本次优化重点是“首个可见画面时间”，不是继续无上限降低图片质量。现有 960px 图片多数已经只有约 30–85KB，继续压缩的边际收益较小；渐进显示能更直接消除用户感知上的等待。
