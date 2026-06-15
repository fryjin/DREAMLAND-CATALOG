# DREAMLAND-CATALOG JSON 数据重构包

本包用于把当前 `index.html` 中的硬编码数据拆分为：

```text
/data/products.json
/data/series.json
/data/i18n.json
/images/products/ADV001/...
```

## 自动完成的内容

运行后会：

1. 从当前 `index.html` 提取四个系列配置。
2. 生成 115 个占位产品数据，并保留现有产品编号：
   - ADV001–ADV019
   - MPC001–MPC072
   - HOL001–HOL016
   - CLA001–CLA008
3. 把中、英、韩界面文案和选择项写入 `data/i18n.json`。
4. 把系列、价格、香型、尺寸、包装配置写入 `data/series.json`。
5. 把产品名称、描述、图片路径写入 `data/products.json`。
6. 修改 `index.html`，改为启动时异步读取三个 JSON。
7. 修改 `sw.js`：
   - 缓存版本升级为 `dreamland-pwa-v3`
   - 三个 JSON 加入 App Shell
8. 生成：
   - `images/products/README.md`
   - `scripts/validate_catalog_data.mjs`
9. 快速加入和配置加入意向单时，保存正式封面路径与多语言名称。

当前正式产品资料尚未提供，所以生成数据统一带：

```json
"status": "placeholder"
```

后续只修改 JSON 和对应图片，不需要继续改页面业务逻辑。

---

## 方案 A：Windows 本地运行

前提：电脑已安装 Node.js 20 或更高版本。

1. 将本压缩包内容复制到仓库根目录。
2. 双击：

```text
run-refactor-windows.bat
```

3. 检查生成的文件。
4. 提交并推送到 GitHub。

也可以在仓库根目录运行：

```bash
node scripts/apply-data-refactor.mjs
node scripts/validate_catalog_data.mjs
```

---

## 方案 B：GitHub Actions 自动运行

将以下两个文件上传到仓库，并保持目录结构：

```text
scripts/apply-data-refactor.mjs
.github/workflows/apply-data-refactor.yml
```

提交到 `main` 后，工作流会自动：

1. 执行重构；
2. 验证 JSON；
3. 提交生成结果；
4. 删除一次性工作流和转换脚本；
5. 保留最终验证脚本。

如果 GitHub 没有自动运行：

```text
GitHub 仓库 → Actions → Apply catalog JSON data refactor → Run workflow
```

---

## 最终目录示例

```text
data/
├── products.json
├── series.json
└── i18n.json

images/
└── products/
    └── README.md

scripts/
└── validate_catalog_data.mjs
```

产品图片按产品编号建立目录：

```text
images/products/ADV001/
├── cover.jpg
├── detail-1.jpg
├── detail-2.jpg
├── detail-3.jpg
├── detail-4.jpg
└── detail-5.jpg
```

正式图片不存在时，页面继续使用原来的 CSS 占位视觉，不会出现破图图标。

---

## 运行后检查

执行：

```bash
node scripts/validate_catalog_data.mjs
```

正常结果应为：

```text
Catalog data valid: 115 products across 4 series.
```

随后建议在浏览器中检查：

- 四个系列是否正常显示；
- 中文、英文、韩文是否可切换；
- 产品详情是否正常打开；
- 加入意向单后是否保留产品封面；
- DevTools → Network 中三个 JSON 是否返回 200；
- DevTools → Application → Cache Storage 是否出现 v3 缓存。
