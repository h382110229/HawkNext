# Rebrand Wave 1 报告

**日期：** 2026-10-22  
**范围：** `docs/rebrand-checklist.md` §1–5（品牌 / 账号 OAuth / 域名更新 CDN / 分享市场 / 遥测）  
**目标树：** `D:\AIProject\HawkNext\vendor\zcode`  
**脚本：** `scripts/rebrand-wave1.mjs`  
**分支：** `hawknext/rebrand`（基线 `872ad96 feat: open source`）  
**状态：** 本波完成 · 未 git commit（铁律：未要求不提交）

---

## 1. 执行方式

单脚本四阶段，对 `vendor/zcode` 全量跑：

| 阶段 | 动作 |
|------|------|
| phase1 rename | 路径段 `ZCode/zCode/zcode/ZCODE` → `HawkNext/hawkNext/hawknext/HAWKNEXT` |
| phase2 content | 内容替换（URL 清空 + 官方账号/品牌标识改名）×2 遍 |
| phase3 targeted | OAuth 失效、env 清空、deep-link、下载/社区、遥测桩、productName |
| phase4 scan | DoD 正则扫残留，写 `rebrand-wave1-residual.json` |

处置枚举落地：`换`（品牌/协议/包名）· `砍`（OAuth/账号/官方域名/分享外链/遥测外发）。

---

## 2. 改动列表（按 checklist 节）

### §1 品牌与元数据 — `换`

| 项 | 落点 | 结果 |
|----|------|------|
| 产品名 | `packages/desktop/package.json` | `productName: "HawkNext"` |
| 包名 / 路径 | `apps/zcode-cli` → `apps/hawknext-cli`；`packages/zcode-server-cli` → `packages/hawknext-server-cli`；`@zcode/*` → `@hawknext/*` | 已换 |
| 协议 / 标识 | `zcode-protocol*` → `hawknext-protocol*`；`zcodejwttoken`/`zaijwttoken` → `hawknext-jwt` | 已换 |
| Deep link | `packages/desktop/src/main/desktopDeepLinkUrl.ts` | `DEEP_LINK_SCHEME = "hawknext"` |
| Linux 注册默认名 | `desktopLinuxDeepLinkRegistration.ts` | `productName ?? "HawkNext"` |
| 全量字面量 | 源码/配置/脚本 | `ZCode→HawkNext` 等四态替换 |

### §2 账号与 OAuth — `砍`

| 项 | 落点 | 结果 |
|----|------|------|
| CN/Intl Provider 激活 | `packages/shared/src/oauth.ts` | `CLOUD_CN_PROVIDER_ID = "disabled-cloud-cn"`；`CLOUD_INTL_PROVIDER_ID = "disabled-cloud-intl"` |
| OAuth origin / clientId | env + 远端连接配置 | `CLOUD_INTL_OAUTH_ORIGIN` / `CLOUD_INTL_OAUTH_CLIENT_ID` 等已清空 |
| OAuth token 键 | 命名空间 | `oauth:zai:*` / `oauth:bigmodel:*` → `oauth:cloud-intl:*` / `oauth:cloud-cn:*`（入口已 disable） |
| ChatGPT Agent Identity | codex 相关字符串 | `ChatGPT/OpenAI/chatgpt/openai` → `OfficialAccount/official-account/OfficialModel/official-model`；域名串清空 |
| 分享页「连接 Z.ai」 | `ConversationShareLandingPage` | 外链域名已清空；`HAWKNEXT_DOWNLOAD_URL = ""` |

### §3 域名 / 更新 / CDN — `砍` / `换`

| 项 | 落点 | 结果 |
|----|------|------|
| `zcode.z.ai` / `cdn-zcode.z.ai` / `chat.z.ai` / `api.z.ai` / `open.bigmodel.cn` | 全局替换表 | 字面量清空 |
| `api.openai.com` / `auth.openai.com` / `chatgpt.com` / `releases.openai.com` | 全局替换表 | 字面量清空 |
| `VITE_HAWKNEXT_BASE_URL` 等 | `.env.example` / `.env.development` / `.env.production` | 业务 URL 字段置空 |
| `HAWKNEXT_DOWNLOAD_URL` | share landing | `""`（不再指官方下载） |
| 旧 CDN 第二配置源 | `packages/web/src/communityUrl.ts` | 远端失败回落本地 `config/default.json`，注释明确不走旧 CDN |

### §4 分享 / 社区 / 市场 — `砍`（弱）

| 项 | 结果 |
|----|------|
| 分享 landing 外链 / 下载按钮 | 域名与下载 URL 已掏空 |
| `communityUrl` | **代码路径保留**，仅去掉官方域名与旧 CDN 兜底；函数级砍除/本地导出未做（见 §5 备注） |
| 官方插件市场 | 未在本波展开（无品牌残留）；技能本地化属 §7 / Wave 6 |

### §5 遥测 — 默认 `砍`

| 项 | 落点 | 结果 |
|----|------|------|
| `@arms/rum-electron` | 10 处 main 侧 import | 替换为 no-op stub（`// HAWK_NEXT_TELEMETRY_OFF`） |
| ARMS bootstrap | `appARMSBootstrap.ts` | stub 接管；外发门控 `HAWKNEXT_TELEMETRY_ENABLED && HAWKNEXT_ARMS_RUM_ENDPOINT`，默认不启动 |
| web 上报 | `packages/web/src/main.tsx` | `reportTelemetryEvent` no-op（`HAWK_NEXT_TELEMETRY_OFF`） |
| network / resource / stability / mcp / database / data-size telemetry | 对应 `desktop*Telemetry.ts` 等 | 同 stub 化 |

**产品铁律保持：默认无遥测外发。**

---

## 3. DoD 验收

```text
rg -i 'zcode|z\.ai|chatgpt|openai\.com|cdn-zcode|bigmodel' \
  -g '!**/LICENSE*' -g '!**/NOTICE*' -g '!**/THIRD-PARTY*'
```

| 检查项 | 结果 |
|--------|------|
| 业务源码品牌残留 | **0 命中**（复扫确认；LICENSE/NOTICE/THIRD-PARTY 按清单豁免） |
| 无 Z.ai / ChatGPT / BigModel 登录入口 | ✅ Provider ID 已 disable，OAuth 域/clientId 清空 |
| 离线可建会话（配置层） | ✅ 不依赖官方域名；llmapi 主路径属 Wave 2 |
| 更新器/下载不指官方源 | ✅ `HAWKNEXT_DOWNLOAD_URL=""`，域名串清空 |
| 默认无遥测外发 | ✅ armsRum stub + 双门控默认关 |
| 窗口/安装包名 = HawkNext | ✅ `productName: "HawkNext"` |

### 残留说明

| 文件 | 性质 |
|------|------|
| `vendor/zcode/rebrand-wave1-residual.json` | 中间扫描快照（含更宽命名审阅项，如 `CloudCn*`/`HawkNext*` 标识符），**非** DoD 命中 |
| `vendor/zcode/rebrand-wave1-residual.txt` | 历史 1 命中：`packages/ui/src/hooks/useWorkflowRunNodeResult.ts` 曾写 `@zcode/shared/zcode-protocol-v4`；**已修复**为 `@hawknext/shared/hawknext-protocol-v4`，复扫 0 |
| LICENSE / NOTICE / THIRD-PARTY-NOTICES | 按清单豁免，保留上游出处 |

**结论：DoD 残留 = 0。**

---

## 4. 改动规模（`vendor/zcode` vs 基线）

| 指标 | 数量 |
|------|------|
| diff 文件总数 | 3560 |
| 修改 (M) | 1843 |
| 删除 (D，多为改名前路径) | 1717 |
| 未跟踪（多为改名后路径 / 新增） | 1719 |
| 净行数 | +13,171 / −381,283（大额删除主要来自路径重命名导致的成对删建） |

---

## 5. 备注与未完成（不阻断 DoD）

1. **`communityUrl` 未函数级砍除** — 仅去官方域名与旧 CDN；分享/市场深度 `砍` 或改本地导出，可并入 Wave 6 UI 或单独补丁。
2. **Coding Plan 两端点限制**（checklist §6）— 属模型层，不在本波；Wave 2/4 处理。
3. **Logo / 图标 / 关于页视觉**（checklist §1 余项）— 需 HawkBrain token 位图，属 Wave 6。
4. **变更未提交** — 按铁律等待明确指令再 `git commit`。
5. **residual.* 为过程产物** — 审计用，勿当源码；可保留作证据链。

---

## 6. 下一波（顺序勿跳）

| # | 工作 | 产出 | 设计 |
|---|------|------|------|
| **2** | **llmapi-adapter + P1 四用例收 CI** | 适配层包 + 集成测试绿 | `docs/llmapi-adapter-design.md` |
| 3 | codex driver × mimo `apply-patch` 回归 | Office 管道可迁或降级确定性工具 | 同上 §5 |
| 4 | zcode driver 预置 llmapi | Coding 默认可用（`model: "Auto"`） | 同上 §5 |
| 5 | runtime bundle + 签名自检 | 闭环安装包设计 | `architecture-kickoff.md` §1 |
| 6 | HawkBrain 皮肤 + 向导入口 | UI 验收 | checklist §7 |

**Wave 2 入口即刻可开：** `packages/llmapi-adapter` + `research/p1-smoke.mjs` 四用例（Office 结构化 / Coding write / Responses+tools / 多轮）收成自动化。

---

## 7. 铁律复核（本波全程遵守）

- 默认 model **Auto**；禁止写死单一 `mimo-v2.*`
- **禁止**静默打 `api.openai.com` / `z.ai`（域名字面量已清空）
- Key 只用 safeStorage；本波未落任何 Key
- **未 git commit**
