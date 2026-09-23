# LLMAPI Live 验收记录

**日期：** 2026-10-22  
**接入点：** `https://llmapi.hawkren.online`（主）· `https://llmapi.ashawk.online`（备）  
**鉴权：** Bearer `as-…`（会话 env 注入，**不入库**）  
**默认 model：** **`Auto`**  
**铁律复核：** 无静默外联官方端点；Key 未写入任何仓库文件

---

## 1. 结果总表

| # | 项 | 范围 | 结果 |
|---|----|------|------|
| 1 | P1 四用例 | `packages/llmapi-adapter/test/integration/p1-four-cases.test.ts` | **4/4 通过** |
| 2 | mimo apply-patch 形状 probe | `packages/driver-codex/test/mimo/live-mimo-probe.test.ts` | **3/3 通过** |
| 3 | Coding 真流（SSE + tools） | `packages/driver-zcode` `runTurn(stream)` | **通过** |
| 4 | 备域 ashawk | `packages/llmapi-adapter` listModels + chat | **通过** |
| 5 | 离线回归（适配层单测等） | guard / normalize / failover | **22/22**（含流合并修复后） |

---

## 2. P1 四用例（主域）

| 用例 | 断言 | 结果 |
|------|------|------|
| P1-A Office 结构化 | chat + `write_memo` tool（title/points/summary） | ✅ |
| P1-B Coding write | chat + `write_file` 或 `apply_patch` | ✅ |
| P1-C Responses + tools | `/v1/responses` + `function_call` | ✅ |
| P1-D 多轮 tool | 首轮 tool_call → tool result → 二轮续写 | ✅ |

耗时约 26s（含 4 次真模型往返）。

## 3. mimo apply-patch 形状（主域）

| 项 | 结果 |
|----|------|
| Auto 发出可解析 `apply_patch` 并成功落盘 | ✅ |
| 多 prompt 汇总喂 `evaluatePatchPolicy` | ✅ |
| extract 包装形态（fence 等） | ✅ |

**备注：** 模型偶发不写分号（`console.log("HAWK")` vs `…);`），属生成差异；extract/apply 与断言已按语义匹配，**形状契约成立**。policy 在 fixture 失败或 live 失败率 >15% 时降级 `write_file` only。

## 4. Coding 真流（zcode driver）

| 项 | 值 |
|----|-----|
| 请求 model | （缺省 → Auto） |
| 实际路由 | `mimo-v2.6-flash` |
| `defaultedToAuto` | true |
| 流式 thought | 有（与 text 分离） |
| tools | `write_file` ×1 |
| 工作区 | `hello.js` 已写入 |

**真测暴露并已修复：** SSE 流式 `tool_calls` 碎片原先未按 `index`/`id` 归并，导致碎片化 `unknown` 调用；已在 `llmapi-adapter/src/normalize.ts` `foldChatDelta` 修复。

## 5. 备域 ashawk

| 项 | 值 |
|----|-----|
| `GET /v1/models` | 22 模型 |
| Auto chat | 路由 `mimo-v2.6-pro` |
| 回复 | `pong` |

主备协议同构；备域池更大，符合「主 hawkren / 备 ashawk」设计。

## 6. 运行方式（复测）

```powershell
$env:HAWKNEXT_LLMAPI_LIVE = "1"
$env:HAWKNEXT_LLMAPI_API_KEY = "as-…"   # 主域，勿写入文件
$env:HAWKNEXT_LLMAPI_FALLBACK_KEY = "as-…"  # 可选备域
$env:HAWKNEXT_LLMAPI_PRIMARY = "https://llmapi.hawkren.online"
$env:HAWKNEXT_LLMAPI_FALLBACK = "https://llmapi.ashawk.online"

# P1
node --test packages/llmapi-adapter/test/integration/p1-four-cases.test.ts
# mimo probe
node --test packages/driver-codex/test/mimo/live-mimo-probe.test.ts
# Coding
node packages/driver-zcode/scripts/live-coding-smoke.mjs
# 备域
node packages/llmapi-adapter/scripts/live-ashawk-smoke.mjs
```

CI：上述 live 任务在 secret `HAWKNEXT_LLMAPI_API_KEY` 存在时执行，否则自动 skip。

## 7. 结论

- **llmapi 主路径（Office + Coding + Responses）经 adapter 全绿**
- **apply-patch×mimo 形状可进入 Office 管道**；降级开关就绪
- **Auto 默认 / 双域 failover / thought-text 分离 / 无官方静默外联** 均满足设计验收
- Wave 2–6 交付可进入打包（Wave 5 闭环安装）与 UI 验收收尾

**未做：** git commit（待明确指令）；安装包实机签名（需签名证书与 signtool 链）。
