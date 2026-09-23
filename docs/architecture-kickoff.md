# HawkNext 架构与下一刀

**产品：** HawkNext（新仓）· **壳：** Fork ZCode 深度 rebrand · **皮：** HawkBrain UI  
**Harness：** 形态 A — codex driver 钉 Office；zcode driver 作 Coding 默认  
**模型：** llmapi `Auto`（主 hawkren / 备 ashawk）· 官方仅引导增强  

---

## 1. 决策冻结（勿再 Grill 重复问）

| 项 | 结论 |
|----|------|
| 壳策略 | Fork ZCode 整仓 → 深度 rebrand |
| 身份 | 新产品；HawkBrain v1 仅资产来源 |
| 运行时 | 最大闭环：Node·Python·LibreOffice/Pandoc·FFmpeg·rg/fd·Git·Playwright+浏览器·7z·签名自检 |
| 模型 | 默认 Auto/mimo；官方=检测到专有能力再引导 |
| Harness | A（可切换；Office 钉 codex） |
| 权重 | llmapi 35 · Office 25 · Coding 20 · 去锁定 15 · 打包 5 |
| 线 | HawkAIAgent/DSH 不并入 |

---

## 2. 仓库骨架（建议）

```text
HawkNext/
  apps/desktop/          # Fork ZCode shell（rebrand 后）
  packages/llmapi-adapter/
  packages/driver-codex/
  packages/driver-zcode/
  packages/runtime-bundle/
  assets/hawk-ui/        # HawkBrain tokens
  docs/
  research/
```

---

## 3. 实施顺序（下一刀）

| # | 工作 | 产出 |
|---|------|------|
| 1 | Rebrand Wave 1：品牌/OAuth/分享/遥测 | DoD 搜索 0 命中 |
| 2 | LLMAPI Adapter | P1 四用例收成集成测试 |
| 3 | codex driver 接入 + apply-patch×mimo 回归 | Office 管道可迁 |
| 4 | zcode driver 预置 llmapi | Coding 默认可用 |
| 5 | Runtime bundle + 签名自检 | 闭环安装包设计 |
| 6 | HawkBrain 皮肤 + 向导入口 | UI 验收 |

---

## 4. 证据与脚本

- 对齐全文：`docs/2026-10-22-grill-alignment.md`
- Rebrand：`docs/rebrand-checklist.md`
- 适配层：`docs/llmapi-adapter-design.md`
- P1 脚本：`research/p1-smoke.mjs`
- codex 克隆：`research/codex`

## 5. 风险备忘

- codex `apply-patch` 按 gpt-4.1 形状 → mimo 专项回归
- ZCode Coding Plan 两端点限制 vs 自有 provider
- 安装包体积 / 杀软 / 签名
- 临时 llmapi Key 仅沙箱；产品用 safeStorage
