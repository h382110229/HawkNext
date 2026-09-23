# HawkNext 接管提示词（new session 用）

> 生成：2026-10-22 · 前序：Grill Me 对齐 + P0 锁定审计 + P1 llmapi 联调 + 架构冻结  
> **下一刀：Rebrand Wave 1**

---

## 粘贴给新会话的 Prompt

你是 **HawkNext** 桌面 Agent 的开发助手，接管实现。

**路径**
- 产品仓：`D:\AIProject\HawkNext`
- 必读（按序）：
  1. `docs/architecture-kickoff.md`（决策冻结 + 实施顺序）
  2. `docs/2026-10-22-grill-alignment.md`（对齐 + P0/P1 证据）
  3. `docs/rebrand-checklist.md`（本波次 DoD）
  4. `docs/llmapi-adapter-design.md`（模型层契约）
- 参考资产（只读取用，不改产品归属）：
  - `D:\AIProject\HawkBrain`（UI token、交付管道、技能；v1 资产来源）
  - `D:\AIProject\HawkBrain\research\zcode\repo`（ZCode 调研克隆）
  - `D:\AIProject\HawkNext\research\codex`（openai/codex shallow）
  - `D:\AIProject\HawkNext\research\p1-smoke.mjs`（llmapi P1 脚本）

**产品一句话**  
Fork ZCode 深度 rebrand + HawkBrain UI；**Office→codex driver（钉死）· Coding→ZCode driver（默认）**；模型只走 **llmapi `Auto`**（主 `llmapi.hawkren.online`，备 `llmapi.ashawk.online`）；官方模型仅「专有能力缺失时引导开启」；**最大内置运行时**（Node/Python/LibreOffice·Pandoc/FFmpeg/rg·fd/Git/Playwright+浏览器/7z/签名自检）；**默认无遥测**。

**铁律**
- 处置枚举：`砍` / `换` / `仅官方增强` / `无锁定`
- 禁止写死单一 mimo ID；默认 `model: "Auto"`
- 禁止静默打 `api.openai.com` / `z.ai`
- Key 只用 safeStorage；日志脱敏；数据落数据盘
- 不读用户全局 PATH/npm/pip
- HawkAIAgent/DSH **不并入**
- 未明确要求不要 git commit

**本波次：Rebrand Wave 1**
1. 将 ZCode 接入 `HawkNext/vendor/zcode`（从调研克隆复制或 `git clone` zai-org/ZCode；打 `hawknext/rebrand` 分支）
2. 按 `docs/rebrand-checklist.md` 第 1–5 节执行：品牌元数据、OAuth/账号、官方域名/更新/CDN、分享/市场、遥测
3. DoD：业务源码 `rg -i 'zcode|z\.ai|chatgpt|openai\.com|cdn-zcode|bigmodel'` 接近 0（LICENSE/NOTICE 除外）
4. 产出：`docs/rebrand-wave1-report.md`（改动列表 + 残留命中 + 下一波）

**之后顺序（勿跳）**  
2) llmapi-adapter 实现 + P1 四用例收 CI → 3) codex×mimo `apply-patch` 回归 → 4) zcode driver 预置 llmapi → 5) runtime bundle/签名 → 6) HawkBrain 皮肤 + 向导入口

**llmapi 冒烟结论（勿重验）**  
Chat+tools+SSE、`/v1/responses`+`function_call`、Office 结构化、Coding 多轮 tool 均已通过；推理字段 `reasoning_content`；Auto 会在 mimo-v2.5-pro / v2.6-flash / v2.6-pro 间路由。

**临时 Key**  
仅沙箱用过，**不要写入仓库**；产品用 safeStorage。需要真测时向用户要新 Key。

---

## 本会话已完成（新会话勿重做）

- Grill Me 全量对齐（壳/双 harness/运行时/官方增强策略）
- P0：ZCode + codex 锁定审计初判
- P1：llmapi 真联调四用例全绿
- 终评：形态 A 冻结
- 文档四件套 + README 已落 `HawkNext/`
