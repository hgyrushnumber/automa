# Ozon 投诉跟卖自动化流程（推荐：Automa 自维护 SKU 列表）

> 本文只保留一条主方案：**Automa 自己维护 SKU 列表（更稳）**。  
> 即：Excel 仅作为 SKU 来源，运行时以 Automa 的 `loop-data` 数组为准逐条执行。

目标流程：

1. 用户准备一个只包含 SKU 的 Excel（n 个 SKU）和一张投诉图片；
2. 进入 `https://seller.ozon.ru/app/messenger?channel=SCRM`；
3. 依次点击：`商品和价格` → `质量监督` → `卖家使用我的品牌`；
4. 进入循环：输入第 1 个 SKU 并上传图片，输入第 2 个 SKU 并上传图片……直到完成。

---

## 一、为什么用「Automa 自维护 SKU 列表」

- 页面 DOM 经常变化，而数组循环更稳定；
- 可重跑、可断点续跑、可记录每个 SKU 成功/失败；
- 调试时可以先用 2~3 个 SKU 小样本验证，再放量执行。

---

## 二、执行结构（只需照着连线）

## 阶段 A：一次性页面准备（只执行一次）

1. **new-tab**
   - `url = https://seller.ozon.ru/app/messenger?channel=SCRM`
   - `waitTabLoaded = true`

2. **event-click**（商品和价格）
3. **event-click**（质量监督）
4. **event-click**（卖家使用我的品牌）

> 这三个按钮只做一次，不要放进循环里。

## 阶段 B：SKU 循环（执行 n 次）

1. **loop-data**
   - `loopId = ozonSkuLoop`
   - `loopThrough = custom-data`（推荐）
   - `loopData = ["SKU001", "SKU002", "SKU003"]`

2. **forms**（输入当前 SKU）
   - `selector = <SKU 输入框选择器>`
   - `type = text-field`
   - `clearValue = true`
   - `value = {{loopData.ozonSkuLoop}}`

3. **upload-file**（上传投诉图片）
   - `selector = <图片上传控件选择器>`
   - `file path = <本地图片路径>`

4. **event-click**（提交/下一步，如页面需要）

5. **loop-breakpoint**
   - `loopId = ozonSkuLoop`

---

## 三、Excel 如何接入这条主方案

这套方案里，Excel 的作用是“提供 SKU 源数据”，不是运行时主循环对象。

推荐做法：

1. 先把 Excel 中 SKU 列导出成 JSON 数组（或复制成纯文本后转换）；
2. 粘贴到 `loop-data.loopData`；
3. 正式跑流程时，以 `loopData` 数组为唯一真值。

示例：

```json
[
  "SKU-1001",
  "SKU-1002",
  "SKU-1003"
]
```

---

## 四、最小可用参数模板（直接抄）

## 1) 三个按钮 event-click（每个都建议）

- `findBy = cssSelector`（优先）
- `waitForSelector = true`
- `waitSelectorTimeout = 10000`
- `multiple = false`

## 2) SKU 输入 forms

- `findBy = cssSelector`
- `waitForSelector = true`
- `waitSelectorTimeout = 10000`
- `clearValue = true`
- `value = {{loopData.ozonSkuLoop}}`

## 3) 上传图片 upload-file

- 上传后追加一个 `delay = 500~1000ms`（可选）
- 如果页面有“上传完成”标识，优先改为 `element-exists` 等待标识出现

---

## 五、错误处理建议（避免整批失败）

对以下 block 配置 `onError`：

- forms（输入 SKU）
- upload-file（上传图片）
- event-click（提交）

建议策略：

- `retry = true`
- `retryTimes = 2~3`
- `retryInterval = 1000`
- 多次失败后：记录错误并继续下一 SKU

---

## 六、你只需要补齐这 5 个选择器

1. 商品和价格按钮 selector
2. 质量监督按钮 selector
3. 卖家使用我的品牌按钮 selector
4. SKU 输入框 selector
5. 图片上传控件 selector

补齐后，这个流程就可以按「第 1 个 SKU 上传图片 → 第 2 个 SKU 上传图片 → …」自动执行。

---

## 七、如何补齐选择器（实操步骤）

推荐按下面顺序补齐：

1. 在目标页面先手工走一遍流程，定位 5 个关键元素；
2. 优先使用稳定属性（如 `data-testid`、`name`、`aria-label`）；
3. 文案可能变化时，不要只依赖“纯文本 XPath”；
4. 每补一个 selector，就在 Automa 里单独执行该 block 验证；
5. 最后再跑整条循环流程。

可直接参考的 selector 形态：

- 按钮：`button[data-testid="xxx"]`
- 输入框：`input[name="sku"]`
- 上传控件：`input[type="file"]`

如果页面结构复杂，可以用 Automa 的元素选择器辅助生成初始 selector，再手工精简成更稳定的属性选择器。

## 八、补齐选择器的“可执行模板”（建议直接照填）

先建一个表格，跑流程前把 5 个 selector 全部填好：

| 业务节点 | 建议优先 selector（CSS） | 兜底 selector（XPath） |
|---|---|---|
| 商品和价格按钮 | `button[data-testid="complaint-category-product-price"]` | `//button[contains(.,"商品") and contains(.,"价格")]` |
| 质量监督按钮 | `button[data-testid="complaint-category-quality"]` | `//button[contains(.,"质量") and contains(.,"监督")]` |
| 卖家使用我的品牌按钮 | `button[data-testid="complaint-reason-brand"]` | `//button[contains(.,"卖家") and contains(.,"品牌")]` |
| SKU 输入框 | `input[name="sku"]` 或 `input[placeholder*="SKU"]` | `//input[contains(@placeholder,"SKU")]` |
| 图片上传控件 | `input[type="file"][accept*="image"]` | `//input[@type="file"]` |

> 上表中的 `data-testid` 名称只是示例，请以页面真实属性为准。

---

## 九、逐个补齐的操作步骤（从 0 到可跑）

1. 打开 Ozon 页面，按 F12 打开开发者工具；
2. 用元素检查器点中目标元素（先从“商品和价格”按钮开始）；
3. 右键节点 → Copy → Copy selector（先拿到初版）；
4. 把 selector 手工简化到“最短且稳定”：
   - 删除层级很深的 `div > div > ...`；
   - 保留 `data-testid` / `name` / `aria-label` / `type` 等稳定属性；
   - 避免 `:nth-child(...)`；
5. 在 Automa 对应 block 中粘贴 selector，单独执行该 block 验证；
6. 5 个 selector 全测通后，再执行整条循环流程。

快速验收标准（每个 selector 都要满足）：

- 可以连续执行 3 次都命中同一类元素；
- 刷新页面后仍可命中；
- 登录态变化后（但页面结构未大变）仍可命中。

---

## 十、常见失败与修复

- **现象：点击不到按钮**  
  处理：把 selector 从文本 XPath 改为稳定属性 CSS，并把 `waitForSelector` 打开。

- **现象：输入框有时找不到**  
  处理：增加 `waitSelectorTimeout` 到 `10000~15000`，并先点击激活当前表单区域。

- **现象：上传图片后下一步太快**  
  处理：上传后增加 `delay(500~1000ms)`，或等待“上传完成”标识元素出现。
