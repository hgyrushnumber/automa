# 在当前基础上落地你的 Ozon 流程（可直接执行）

> 这份文档是基于当前仓库里已有内容（`ozon-sku-complaint-workflow.md` + `ozon-temp-plan.md` + popup 快速跳转）做的**实施版**。

你要实现的目标是：

1. 打开 Ozon SCRM 页面；
2. 依次点击：商品和价格 → 质量监督 → 卖家使用我的品牌；
3. 遍历 Excel 里的 SKU（建议先转数组导入 loop-data）；
4. 每个 SKU 都执行：输入 SKU → 上传图片 → 提交（可选）；
5. 全部 SKU 执行完毕。

---

## 0. 先准备 3 类参数（必填）

### A) 运行参数

- `targetUrl`：`https://seller.ozon.ru/app/messenger?channel=SCRM`
- `imagePath`：图片本地路径
- `skuArray`：SKU 数组（由 Excel 转出）

示例：

```json
{
  "targetUrl": "https://seller.ozon.ru/app/messenger?channel=SCRM",
  "imagePath": "C:/temp/complaint.jpg",
  "skuArray": ["SKU001", "SKU002", "SKU003"]
}
```

### B) 5 个 selector

- `SEL_BTN_PRODUCT_PRICE`
- `SEL_BTN_QUALITY`
- `SEL_BTN_BRAND`
- `SEL_INPUT_SKU`
- `SEL_UPLOAD_IMAGE`

### C) 重试参数（建议）

- `retryTimes = 2`
- `retryInterval = 1000`
- `waitSelectorTimeout = 10000`

---

## 1. 工作流搭建顺序（严格按这个连线）

## 阶段 A：页面初始化（只跑一次）

1. `new-tab`
   - `url = targetUrl`
   - `waitTabLoaded = true`

2. `event-click`（商品和价格）
   - `selector = SEL_BTN_PRODUCT_PRICE`
   - `waitForSelector = true`

3. `event-click`（质量监督）
   - `selector = SEL_BTN_QUALITY`
   - `waitForSelector = true`

4. `event-click`（卖家使用我的品牌）
   - `selector = SEL_BTN_BRAND`
   - `waitForSelector = true`

> 注意：这 3 个点击不要放在循环里，只做一次。

## 阶段 B：SKU 循环（跑 n 次）

5. `loop-data`
   - `loopId = ozonSkuLoop`
   - `loopThrough = custom-data`
   - `loopData = skuArray`（把数组粘进编辑器）

6. `forms`（输入 SKU）
   - `selector = SEL_INPUT_SKU`
   - `type = text-field`
   - `clearValue = true`
   - `value = {{loopData.ozonSkuLoop}}`
   - `waitForSelector = true`

7. `upload-file`（上传图片）
   - `selector = SEL_UPLOAD_IMAGE`
   - `file path = imagePath`

8. `delay`
   - `time = 700`（建议 500~1000）

9. `event-click`（提交/下一步，若页面有此步骤）

10. `loop-breakpoint`
   - `loopId = ozonSkuLoop`

---

## 2. 按你的场景：Excel + 每个 SKU 上传同一张图

你目前的业务“每个 SKU 都上传同一张图片”，对应实现是：

- Excel 不直接驱动页面动作；
- Excel 先转成数组给 `loop-data`；
- `upload-file` 放在循环体内（forms 后面），这样每个 SKU 都会触发一次上传。

也就是这条循环：

`loop-data -> forms(当前SKU) -> upload-file(同一图片) -> 提交 -> loop-breakpoint`

---

## 3. 调试顺序（避免一次性排错太难）

按下面顺序逐步验证，不要一上来全链路跑：

1. 先只测 `new-tab` 能否打开目标页面；
2. 单测 3 个 `event-click`，确认按钮能连续命中；
3. `loop-data` 先放 2 条测试 SKU；
4. 单测 `forms` 是否能正确覆盖输入；
5. 单测 `upload-file` 是否成功上传；
6. 最后串起来跑完整循环。

---

## 4. 失败时优先检查什么

- 找不到元素：优先改 selector（稳定属性优先）
- 找到但点不动：提高 `waitForSelector` + 增加 `delay`
- 上传失败：确认控件是否真的是 `input[type=file]`
- 循环不前进：检查 `loopId` 在 `loop-data` 与 `loop-breakpoint` 是否一致

---

## 5. 你现在可以直接开工的最小模板

- 先把 5 个 selector 填完；
- 把 `skuArray` 放 2 条做 smoke test；
- 跑通后再替换成完整 Excel SKU 列表。

如果你需要，我下一步可以直接给你一份“导入用 workflow JSON 草稿（带占位符）”。

---

## 6. 回答你的关键问题：到底需不需要改代码？

结论分两种：

### 情况 A：先跑通业务（通常不需要改代码）

如果你接受以下方式：

- 在 Automa 编辑器里手工配置 block；
- 手工补齐 selector；
- 手工把 Excel 的 SKU 转成数组粘到 `loop-data`；

那么**不需要修改项目源码**，直接按本文流程配置即可。

### 情况 B：要“更自动化/可复用/给多人用”（建议改代码）

如果你希望以下能力，建议改代码：

1. 在 popup/newtab 一键导入 Excel 并自动转 `loop-data`；
2. 固化 Ozon 场景为“模板按钮”（点击即生成整套流程）；
3. 对 selector 做预置与健康检查；
4. 执行完成后输出统一结果报表（成功/失败/失败原因）。

这些属于“产品能力”，用纯手工配置会重复劳动，且团队协作时不稳定。

### 推荐策略

- 第 1 阶段：先不改代码，按当前文档跑通（验证业务可行）。
- 第 2 阶段：确认流程稳定后，再做代码化封装（节省长期操作成本）。
