# DREAMLAND v1.2.4 详情轮播预加载优化

## 本次目标

解决详情页后续轮播图仍然需要等待的问题。本轮不修改图片尺寸和压缩质量，只调整请求顺序、自动轮播和本地缓存。

## 修改文件

```text
detail-progressive.js
sw.js
```

## 新加载顺序

```text
当前图片 480px
→ 下一张 480px
→ 下下张 480px
→ 按浏览顺序加载本商品剩余 480px
→ 页面空闲或预览队列完成后，再升级当前图片 960px
```

不再优先加载“上一张/最后一张”，也不会在当前预览图出现后立即抢占带宽加载 960px。

## 自动轮播调整

- 间隔由 3.2 秒调整为 4.2 秒。
- 切换前先确认下一张 480px 已经加载。
- 下一张未准备好时不会切到骨架屏。
- 页面隐藏或用户正在滑动时暂停自动切换。

## 会话网络判断

页面会记录最近 6 张 480px 图片的实际加载耗时：

```text
平均 ≤ 300ms：fast
301–700ms：normal
> 700ms：slow
```

慢速会话不再自动请求 960px 高清图。可在开发者工具中查看：

```js
document.documentElement.dataset.imageNetworkProfile
DreamlandProgressiveDetail.metrics
```

## 缓存调整

生成图片改为 Cache First：

```text
有缓存 → 直接返回，不再后台刷新
无缓存 → 请求网络并写入缓存
```

缓存拆分为：

```text
480px 预览图：最多 900 项
960px 高清图：最多 360 项
其他图片：最多 300 项
```

Service Worker 版本：

```text
dreamland-pwa-v58
```

## 上传顺序

上传到 `develop`：

```text
1. detail-progressive.js
2. sw.js
```

`sw.js` 最后上传。

## 部署后验收

1. 等待 Cloudflare Pages 完成最新提交部署。
2. 打开浏览器开发者工具 → Network。
3. 勾选 Disable cache 只测试第一次冷加载；随后取消勾选测试缓存命中。
4. 打开含多张图片的商品详情。
5. 检查请求顺序应接近：

```text
cover-480.webp
angle-480.webp
detail-480.webp
size-s-480.webp
...
cover-960.webp
```

6. 连续向后滑动，后续图片应快速出现。
7. 自动轮播不应切换到仍显示骨架屏的页面。
8. 第二次打开同一商品时，480px 图片应主要来自 Service Worker 缓存。

## 注意

- 首次启用 v58 后，旧图片缓存会被清理，因此第一次访问仍需要重新下载。
- 第二次进入同一商品时，新的 Cache First 策略才会体现完整收益。
- 本轮没有改动产品数据、商品价格、图片生成脚本和文案。

## 回滚

出现异常时，恢复上一版本：

```text
detail-progressive.js
sw.js（dreamland-pwa-v57）
```
