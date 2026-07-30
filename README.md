# DREAMLAND v1.2.1

本次更新包含：

1. 节日系列前两款显示名称改为 `C01`、`C02`；
2. 保留 v1.2.0 已验收的定制多香型与经典系列价格；
3. 增加真正减少图片下载体积的响应式图片资源体系；
4. 使用 GitHub Actions + Sharp 自动生成 WebP 图片，不依赖付费图片服务。

## 一、上传文件

将压缩包内文件按原目录上传到当前测试分支：

- `catalog-data.js`
- `image-variants.js`
- `custom-scent-multi.js`
- `data/series.json`
- `scripts/apply-data-fixes.mjs`
- `scripts/generate-responsive-images.mjs`
- `.github/workflows/optimize-responsive-images.yml`
- `_headers`
- `sw.js`

`sw.js` 最后上传，缓存版本为 `dreamland-pwa-v54`。

## 二、图片优化的实际工作方式

### 商品列表

- 不再下载详情原图；
- 优先使用自动生成的 `480px WebP`；
- 前两张商品图高优先级加载；
- 其他图片进入视口附近才加载；
- 生成图缺失时自动回退到现有原图，不会出现永久空白。

### 商品详情

- 当前图片使用 `960px WebP`；
- 相邻图片在空闲时间预加载；
- 弱网或开启省流量模式时自动降为 `480px WebP`；
- 仍保留原图回退。

### 花样和包装图片

- 自动优先使用 `960px WebP`；
- 失败后回退现有图片；
- 首页主视觉不重复切换资源，避免首屏二次下载。

## 三、GitHub Actions

上传后进入 GitHub：

`Actions → Optimize responsive images`

工作流会自动：

1. 把 `HOL001`、`HOL002` 的中英韩名称同步为 `C01`、`C02`；
2. 扫描 `images/products`、`images/shared`、`images/patterns`、`images/packages`；
3. 使用 Sharp 生成响应式 WebP；
4. 写入 `images/generated/`；
5. 生成 `data/image-optimization-report.json`；
6. 自动提交生成结果到当前分支。

完成后 Cloudflare Pages 会收到一次新的提交并重新部署。

若工作流提示没有写入权限，在仓库设置中打开：

`Settings → Actions → General → Workflow permissions → Read and write permissions`

## 四、本地手动执行

```bash
npm install --no-save sharp@0.35.3
node scripts/apply-data-fixes.mjs
node scripts/generate-responsive-images.mjs
```

然后提交：

- `data/products.csv`
- `data/products.json`
- `data/image-optimization-report.json`
- `images/generated/`

## 五、验收

1. 节日系列前两款名称显示为 `C01`、`C02`；
2. 列表首屏图片明显更快出现；
3. 浏览器 Network 中商品列表图片路径优先为 `/images/generated/...-480.webp`；
4. 商品详情图片路径优先为 `/images/generated/...-960.webp`；
5. 删除某张生成图后仍能回退原图；
6. 花样、包装、定制多香型、经典价格没有回归。

## 六、效果判断

实际节省比例以工作流生成的：

`data/image-optimization-report.json`

为准。该报告记录每张原图、生成图、文件体积和节省比例，不预先假设压缩收益。
