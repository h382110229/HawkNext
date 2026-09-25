# HawkNext 进度复盘 · 2026-10-22

**目标一句话：** Fork ZCode 深度 rebrand + HawkBrain UI；Office→codex / Coding→zcode 双驱动；模型只走 llmapi `Auto`；最大闭环运行时；默认无遥测。

---

## 1. 总进度

| 阶段 | 状态 | 产出 |
|------|------|------|
| **Rebrand Wave 1** | ✅ | 品牌/OAuth/CDN/分享/遥测清洗，DoD 残留 **0** |
| **2 llmapi-adapter** | ✅ | Auto/failover/推理归一；P1 四用例 live **4/4** |
| **3 apply-patch×mimo** | ✅ | codex 格式移植 24 scenario + mimo 形状回归；失败降级 write_file |
| **4 zcode driver 预置 llmapi** | ✅ | Provider 预置 default Auto；Coding chat/tools/SSE |
| **5 runtime bundle/签名** | ✅ | 闭环清单 + 签名自检 + 安装包设计；pandoc/fd/7z/signtool 就位 |
| **6 HawkBrain 皮肤+向导** | ✅ | Token/交付向导首屏/旧布局回退 |
| **Live 验收** | ✅ | P1 4/4 · mimo probe 3/3 · Coding 真流 · ashawk 备域 |
| **UI/制品链路增强** | ✅ | Markdown 管线 · 一等公民制品 · UTF-8 · 心跳 · 思考/轨迹 · Reveal |

**整体：架构六波 + live 联调 + UI 痛点修复 = 产品主路径可用，待真机 UI 验收与安装包实签。**

---

## 2. 已完成目标（DoD）

### 2.1 品牌与合规
- 业务源码品牌残留 **0**（`zcode|z.ai|chatgpt|openai.com|cdn-zcode|bigmodel`）
- 默认 model **`Auto`**，不写死单一 mimo ID
- **禁止**静默打官方端点（guard 拒止）；Key 只走 safeStorage/env
- 默认无遥测（armsRum stub + 双门控）

### 2.2 模型层
- `packages/llmapi-adapter`：chat / stream / responses / listModels
- 主 `llmapi.hawkren.online` → 备 `llmapi.ashawk.online` failover
- P1 四用例经 adapter **全绿**（Office 结构化 / Coding write / Responses+tools / 多轮）

### 2.3 双驱动
- **codex driver**：apply-patch 解析/执行（保 EOL）+ mimo 形状 extract + **24/24** 官方 scenario
- **zcode driver**：llmapi 预置、rename→Auto、Coding 会话 + SSE + 中断
- 降级：patch 回归失败率 >15% → `deterministic_only`（write_file/memo）

### 2.4 运行时闭环
- 清单：Node/Python/LibreOffice·Pandoc/FFmpeg/rg·fd/Git/Playwright/7z/签名自检
- `fetch-runtime-tools.mjs` + doctor `missingRequired=0`
- 签名：hash lockfile + signtool + SmartScreen 姿态

### 2.5 UI / 制品链路（对标 Claude Artifacts / Cursor / GFM）
| 痛点 | 方案 | 提交 |
|------|------|------|
| 回显乱码 | PowerShell `chcp 65001` / UTF-8 preamble | `9d86337` |
| Markdown 落后 | Callout `> [!NOTE]`、流式围栏/粗体容错 | `5816b25` |
| 制品断层 | `ArtifactItem` + 扫盘 → 通知/完成卡芯片 | `8daa258` `7a1921e` `3f90dc7` |
| 60s 误杀 | idle 心跳超时（有输出续命） | `5155cc6` |
| 思考粗糙 | 「正在思考 · 已耗时 Ns」 | `150b2af` |
| 轨迹冗长 | ⚡ N 步 · 耗时 Xs 一行摘要 | `d112089` |
| 路径不可点 | 文件管理器 Reveal + 文件树显示 | `4493ca4` |
| 表格预览 | XLSX/CSV Sheet 预览（既有链路确认） | — |

**制品自动链路（零配置）**
```
会话 cwd 自动同步 → 终态扫盘 → 与 artifact.* 合并 → GUI 芯片/完成卡
```

---

## 3. 测试与提交

| 包 | 离线测试 |
|----|----------|
| llmapi-adapter | 22 |
| driver-codex（含 24 scenario + mimo 形状） | 58 |
| driver-zcode | 16 |
| runtime-bundle | 23+ |
| hawk-ui | 8 |
| zcode UI/CLI 增强 | 11+ |

**HawkNext/main**  
`4f2e7be` waves 2–6 · `eb1c16f` fetch 脚本 · `a9ca2bc` runtime resolve · `e063edb` UTF-8+Artifacts

**vendor/zcode hawknext/rebrand**  
`5e232dc` rebrand+llmapi 预置 → `5816b25` … → `4493ca4` Reveal（共 10 笔）

**文档**  
`docs/rebrand-wave1-report.md` · `llmapi-live-acceptance.md` · `runtime-bundle-design.md` · `architecture-kickoff.md` 等

**预览**  
`D:\AIProject\HawkAIAgent\index.html`（浏览器打开，点「运行演示」）

---

## 4. 未完成 / 下一步

| 优先级 | 项 | 说明 |
|--------|----|------|
| P0 | **真机 UI 验收** | 带 XLSX 交付跑一单：芯片→预览→Reveal→中文回显 |
| P0 | **安装包实签** | Authenticode 证书 + NSIS；SmartScreen |
| P1 | 壳内 deep wiring | driver-* 与 vendor 会话/Provider 真切换（现为平行包+预置） |
| P1 | runtime 全离线 | ffmpeg/git/playwright 打进 `runtime/` |
| P2 | communityUrl 函数级砍 | Wave1 仅 URL 掏空 |
| P2 | Thought/轨迹视觉微调 | 呼吸动效、工具调度分区 |

---

## 5. 铁律遵守记录

- [x] 默认 model Auto
- [x] 无静默官方外联
- [x] Key 不入库（live 仅会话 env；`p1-smoke` 已 scrub）
- [x] 未要求不 git commit（本轮用户已授权落盘）
- [x] 默认无遥测
- [x] HawkAIAgent/DSH 不并入
