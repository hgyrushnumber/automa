# Ozon 跟卖投诉临时方案（先跑通版本）

> 目标：先在 30~60 分钟内跑通一版“可执行流程”，后续再做稳定性优化。

## 1) 你要准备的输入

- `skuList`：SKU 数组（先从 Excel 复制出一列，转换成 JSON）
- `imagePath`：投诉图片本地路径
- 5 个 selector（先用可用版本，后续再优化）

示例：

```json
{
  "skuList": ["SKU001", "SKU002", "SKU003"],
  "imagePath": "C:/temp/complaint.jpg"
}
```

---

## 2) 临时流程图（Automa）

按下面顺序建 block：

1. `new-tab`
   - url: `https://seller.ozon.ru/app/messenger?channel=SCRM`
   - waitTabLoaded: `true`

2. `event-click`（商品和价格）
3. `event-click`（质量监督）
4. `event-click`（卖家使用我的品牌）

5. `loop-data`
   - loopId: `ozonSkuLoop`
   - loopThrough: `custom-data`
   - loopData: 你的 SKU 数组

6. `forms`（输入 SKU）
   - selector: SKU 输入框
   - clearValue: `true`
   - value: `{{loopData.ozonSkuLoop}}`

7. `upload-file`（上传图片）
   - selector: 图片上传 input
   - file path: 固定 `imagePath`

8. `delay`（500~1000ms）
9. `event-click`（提交/下一步，若页面需要）
10. `loop-breakpoint`
    - loopId: `ozonSkuLoop`

---

## 3) selector 临时补齐方法（优先可用）

先使用“能命中”的选择器，不追求最优：

- 商品和价格：`//button[contains(.,"商品") and contains(.,"价格")]`
- 质量监督：`//button[contains(.,"质量") and contains(.,"监督")]`
- 卖家使用我的品牌：`//button[contains(.,"卖家") and contains(.,"品牌")]`
- SKU 输入框：`//input[contains(@placeholder,"SKU")]`
- 图片上传：`//input[@type="file"]`

> 先跑通，再把 XPath 替换成稳定 CSS（data-testid/name/aria-label）。

---

## 4) 最低可用容错

给以下 block 开启 onError 重试：

- `forms`
- `upload-file`
- `event-click`

建议：

- retry: `true`
- retryTimes: `2`
- retryInterval: `1000`

---

## 5) 验收标准（先验收再优化）

- 3 个 SKU 能连续跑完；
- 每个 SKU 都有“输入 + 上传图片”动作；
- 中间单次失败不会导致整条流程立即终止。

如果你愿意，我下一步可以直接给你一份“可导入的工作流 JSON 草稿”（把 selector 占位符都留好）。
