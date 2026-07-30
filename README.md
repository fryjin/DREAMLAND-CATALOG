# DREAMLAND v1.2.0 更新包

## 本轮内容

### 1. 定制香型重构

定制信息页从原来的单个“香型需求”下拉框，改为：

```text
香薰系列（单选）
↓
具体香型（多选）
```

可选香薰系列：

```text
经典系列
进阶系列
匠作系列
```

具体香型直接读取：

```text
data/scents.csv
```

规则：

- 定制页不再提供“无香”选项。
- 香薰系列单选。
- 同一香薰系列下的具体香型支持多选组合。
- 切换香薰系列会清空上一系列的已选香型。
- 至少选择一种具体香型后才能加入定制意向。
- 节日系列商品原有“香薰系列 → 具体香型”逻辑不受影响。
- 经典系列普通商品中原有“无香”选项不受影响。

新定制数据结构：

```js
{
  scentSeries: "advanced",
  scentIds: ["ADS001", "ADS002"],
  scents: ["东方花香调", "水生麝香调"],
  scent: "东方花香调 / 水生麝香调"
}
```

意向单、提交预览、风险检查摘要及 Web3Forms 邮件数据都会携带香薰系列和多香型信息。

### 2. 经典系列价格

```text
S：¥68
M：¥98
L：¥128
XL：¥158
```

只修改经典系列价格表；其他系列价格不变。

### 3. 图片优化第一阶段

当前项目已经具备：

- 商品列表 IntersectionObserver 懒加载
- 首屏前两张图片高优先级
- 商品详情仅加载当前图
- 空闲时预加载相邻两张图
- Service Worker 图片缓存

因此本轮不重复改运行时加载逻辑，也不直接覆盖全部生产图片。

新增免费工具：

```text
scripts/image-optimize.py
requirements-image-tools.txt
```

它会：

- 扫描图片尺寸和体积
- 输出 CSV 报告
- 标记 P0/P1 大图
- 选取最大的 20 张图片制作 360/720/960px WebP 对比样本
- 永不覆盖原始生产图片

## 上传文件

按目录覆盖或新增：

```text
custom-scent-multi.js                新增
catalog-data.js                      覆盖
data/series.json                     覆盖
sw.js                                覆盖
scripts/image-optimize.py            新增，可选开发工具
requirements-image-tools.txt         新增，可选开发工具
```

推荐上传顺序：

1. `custom-scent-multi.js`
2. `catalog-data.js`
3. `data/series.json`
4. `scripts/image-optimize.py`
5. `requirements-image-tools.txt`
6. `sw.js`（最后上传）

`index.html`、`data/scents.csv` 和提交接口不需要修改。

## 缓存版本

```text
dreamland-pwa-v53
```

上传后关闭微信内页面并重新进入，避免旧 Service Worker 继续控制页面。

## 功能验收

### 定制香型

1. 进入“定制”。
2. 页面不再出现“无香”。
3. 选择“进阶系列”。
4. 同时选择两种具体香型。
5. 加入意向单。
6. 检查意向单显示“进阶系列 · 香型A / 香型B”。
7. 进入提交预览，确认两种香型均存在。
8. 提交一笔测试询盘，检查邮件 JSON 中包含：

```text
scentSeries
scentIds
scents
```

### 价格

分别切换经典系列商品的四个尺寸：

```text
S  68
M  98
L  128
XL 158
```

并检查商品详情、意向单小计和提交预览金额一致。

### 旧功能回归

- 节日系列香薰系列选择正常。
- 花样大图滑动正常。
- 包装大图滑动正常。
- 包装仍只有默认包装与礼品包装。
- 中、英、韩切换正常。

## 图片审计与样本压缩

### Windows 安装依赖

```powershell
py -m pip install -r requirements-image-tools.txt
```

### 仅审计，不改图片

```powershell
py scripts/image-optimize.py
```

生成：

```text
reports/image-audit.csv
```

### 生成最大的 20 张图片的响应式对比样本

```powershell
py scripts/image-optimize.py --optimize --sample 20
```

生成目录：

```text
_image-optimization-preview/
```

默认参数：

```text
宽度：360 / 720 / 960
WebP 质量：76
```

对比画质确认后，再决定是否把这些版本接入生产页面。本包不会直接替换现有图片路径。

## 已完成的静态检查

- `custom-scent-multi.js`：Node 语法检查通过
- `catalog-data.js`：Node 语法检查通过
- `catalog-data.js`：CSV 与香型映射单元测试通过
- `sw.js`：Node 语法检查通过
- `data/series.json`：JSON 解析及经典系列价格断言通过
- `scripts/image-optimize.py`：Python 编译检查及样本生成测试通过

真实微信浏览器交互仍需部署后按验收步骤测试。
