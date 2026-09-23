# HawkNext 需求对齐（Grill Me）+ P0 锁定审计初判

**日期：** 2026-10-22  
**产品名：** HawkNext（新产品 / 新仓库；HawkBrain v1 仅资产来源）  
**上游参考：** https://github.com/zai-org/ZCode · https://github.com/openai/codex  
**状态：** 对齐完成 · P0 静态审计初判 · llmapi 真联调冒烟通过 · harness 组合待评分拍板

---

## 1. 已锁定决策

| 项 | 决策 |
|----|------|
| 壳 | **Fork ZCode 整仓 → 深度 rebrand**（去 ZCode/Z.ai 品牌、更新源、账号、市场、遥测）+ **HawkBrain UI 设计/配色** |
| 产品身份 | 新产品 **HawkNext**、新仓库；HawkBrain v1 只作资产来源（记忆/技能/交付管道/UI token） |
| 能力目标 | 日常 **Office** + **Coding** |
| 模型 | 默认 **`model: "Auto"`** → `llmapi.hawkren.online` / `llmapi.ashawk.online`（MiMo 为主） |
| 官方增强 | **检测到专有能力需求时再提示引导开官方**（默认不绑死 Z.ai / OpenAI） |
| 运行时 | **最大闭环**：Node、Python、LibreOffice/Pandoc、FFmpeg、rg/fd、Git、Playwright+浏览器驱动、7z、**签名工具链自检** |
| Harness | **不预设组合**；以 P0 静态审计 + P1 stub + 真 llmapi 联调结果再拍板 |
| 评分权重 | llmapi 可替换 35% · Office 管道可移植 25% · Coding 工具形态 20% · 去锁定成本 15% · 可打包 5% |
| 集成门禁 | 任何 harness 集成前先交 **Z.ai / OpenAI 锁定审计清单**（砍 / 换 mimo 等价 / 仅官方增强 / 无锁定） |
| 线 | HawkAIAgent / DSH = 平行研究线，**不并入 HawkNext** |

---

## 2. LLMAPI 真联调冒烟（已通过）

**协议（两域名同构）**

- OpenAI 兼容：`POST /v1/chat/completions`、`POST /v1/responses`
- Base：`https://llmapi.hawkren.online` / `https://llmapi.ashawk.online`（也兼容 `/api/v1/*`）
- 鉴权：`Authorization: Bearer <key>`（`as-` 前缀，约 67 字符）
- 默认模型：**`"Auto"`** 智能路由
- 另有：`/v1/embeddings`、`/v1/images/generations`、`/v1/videos`、`/v1/audio/transcriptions`、`/v1/audio/speech`、`GET /v1/models`

**冒烟结果**

| 检查项 | hawkren | ashawk |
|--------|---------|--------|
| `GET /v1/models` | 11 模型 | **22 模型** |
| Auto + tools | ✅ `tool_calls` | ✅ `tool_calls` |
| Auto 路由落点 | `mimo-v2.6-flash` | `mimo-v2.6-pro` |
| `stream:true` SSE | ✅ 含 `delta.reasoning_content` + `[DONE]` | 同构 |
| `POST /v1/responses` | ✅ `output_text` + `reasoning` | 同构 |

**模型池差异（协议同、池不同）**

- hawkren：Auto + MiMo 全套 + Agnes 图/视频（更纯，**建议主域名**）
- ashawk：上表 + Gemini 3.x / Gemma-4 / Atria-Dawn-Preview / embedding / tts-voice*（**扩展/备用**）

**适配层必须处理的非标点**

1. 推理字段 Chat 侧为 **`reasoning_content`**（流式 `delta.reasoning_content`）；Responses 侧为 `reasoning` / `reasoning_text`
2. **`model: "Auto"`** 是路由别名，禁止写死单一 mimo ID 作唯一事实
3. 图/视频/ASR/TTS 为独立 REST，不走 chat
4. 错误类型：`auth_error` / `model_error` / `rate_limit_error` / `budget_error` / `routing_error` / `config_error` / `proxy_error`；Auto 全不可用 → **503**

---

## 3. P0 锁定审计 — ZCode 初判

### 3.1 好消息（可换 llmapi 的根基）

| 位置 | 证据 | 结论 |
|------|------|------|
| `packages/provider` | `baseUrl`、`provider-data-schema.ts`、`@ai-sdk/openai-compatible` | **多 Provider + 自定义 baseURL 一等公民** |
| `provider/src/config/provider-data-schema.ts` | `baseUrl: z.string().url()` | Provider 配置可指向 llmapi |
| `services/test/providerConfigMigration.test.ts` | `baseURL: "https://provider.example/v1"` | 迁移路径已测过自定义源 |

→ **执行/模型层可替换到 hawkren/ashawk（OpenAI-compatible）**，与已验证的 Auto + tools + stream 契合。

### 3.2 硬锁定（深度 rebrand 必砍/必换）

| 类别 | 位置 / 标识 | 处置建议 |
|------|-------------|----------|
| OAuth / 账号 | `ZAI_PROVIDER_ID`、`BIGMODEL_PROVIDER_ID`、`chat.z.ai` authorize、硬编码 `clientId=client_P8X5CMWmlaRO9gyO-KSqtg` | **砍**；改为 llmapi Bearer + 本地 safeStorage |
| 端点/品牌 | `VITE_ZCODE_BASE_URL`、`ZCODE_BASE_URL`、`https://zcode.z.ai` 下载链 | **砍/改** 为 HawkNext 自有 |
| 业务域 | `ZAI_OAUTH_ORIGIN`、`ZAI_OAUTH_CLIENT_ID`、`ZAI_BUSINESS_BASE_URL` | **砍** |
| 分享/社区 | `ConversationShareLandingPage`、share preview、Z.ai/BigModel 登录文案 | **砍** 或改为私有分享 |
| 远程 CDN | `remoteCdnBaseUrl(s)` | **改** 为自有 CDN/关闭 remote |
| UI 文案 | 「用 Z.AI 登录」「连接 Z.ai」等 | **换** HawkNext 文案 + HawkBrain token |

### 3.3 ZCode 补充（P0 续扫）

| 项 | 证据 | 处置 |
|----|------|------|
| 遥测 | `network-telemetry-middleware`、`schedulerResourceTelemetry`、`ConversationTelemetryFact`、entry-stdio 注释「发往 ZCode endpoint」 | **砍**（默认无遥测；本地 sink 可留） |
| 模型 ID 迁移规则 | `legacy-reasoning-level-renames.ts` 含 glm-*/deepseek-v4-* | **换 mimo 等价**：扩展 rename 表挂 Auto/mimo，而非绑 GLM |
| remote CDN 资产 | `remoteAssetCache` 含 `glm: "glm-content"` | **砍或改自有** |
| 分享/社区/下载 | `zcode.z.ai`、share landing | **砍** |

**处置枚举：** `砍` / `换 mimo 等价` / `仅官方增强` / `无锁定`

---

## 3B. P0 锁定审计 — codex（openai/codex）初判

克隆：`HawkNext/research/codex`（shallow）。

### 3B.1 模型调用层（关键）

| 项 | 证据 | 结论 |
|----|------|------|
| 自定义 `base_url` | `exec_server_compat_test.rs`：`base_url = "{model_url}/v1"` + `path("/v1/responses")`；`plugin_analytics_smoke` 写 `provider_base_url` | ✅ **模型源可指向 llmapi**（优先 `/v1/responses`，与已冒烟契约一致） |
| Chat vs Responses | 兼容测试明确打 **`/v1/responses`** | 适配层应 **主走 Responses**；Chat 作降级 |
| 模型名假设 | `apply-patch` 注释按 **gpt-4.1** 行为写解析 | ⚠️ **换 mimo 等价**：patch 工具需按 mimo/Auto 行为回归，不能假设 gpt-4.1 形状 |

### 3B.2 硬锁定（与 LLM 无关但挡闭环）

| 项 | 证据 | 处置 |
|----|------|------|
| Agent Identity / ChatGPT 账号 | `auth.openai.com`、`chatgpt.com/codex-backend/agent-identity`；**`ChatGptEnvironment` 拒绝自定义 URL**（有测试 `rejects_custom_urls`） | **砍**（Agent Identity 整模块）或 **仅官方增强** |
| 容器防火墙脚本 | `OPENAI_ALLOWED_DOMAINS` 默认 `api.openai.com` | **换**：默认放行 llmapi 域名 |
| 发布源 | `releases.openai.com/codex/...` | **改** 自有更新/安装源 |
| OPENAI_API_KEY 环境 | `run_in_container.sh` 注入 | **换** llmapi Bearer 注入（可映射同名兼容） |

### 3B.3 仍待精扫

- [ ] `codex-rs` 配置面（`model_provider` / wire API）完整字段
- [ ] 工具是否依赖 o-series / Responses 专有字段
- [ ] 计费/分析上报域名
- [ ] ZCode Coding Plan「仅两端点」与自建网关（在 provider 层已可绕开账号链）

---

## 3C. P0 初评分（非最终，P1 后复核）

权重：llmapi 35 · Office 25 · Coding 形态 20 · 去锁定 15 · 可打包 5

| 候选 | llmapi 35 | Office 25 | Coding 20 | 去锁定 15 | 打包 5 | 加权（粗） |
|------|-----------|-----------|-----------|-----------|--------|------------|
| **C. 主 zcode 执行**（Fork 壳一致） | 30（provider.baseUrl 一等） | 18（需迁管道） | 18（工作台/工具强） | 8（OAuth/分享/遥测多） | 4 | **~78** |
| **A. 可切换 + Office 钉 codex** | 28（双驱动都可打 llmapi） | 22（复用 HawkBrain 管道） | 16 | 7（双份剥离） | 3 | **~76** |
| D. 主 codex 执行 | 26（Responses 主路径） | 20 | 14 | 6（ChatGPT identity 硬） | 3 | **~69** |
| B. 双引擎并行 | 25 | 20 | 18 | 4 | 2 | **~69**（复杂度惩罚未计入） |

**初判倾向（待 P1 实锤）：**

1. **壳与 Coding：ZCode driver**（与 Fork 策略同构，baseUrl 已证明可换）  
2. **Office 确定性管道：先钉 codex driver**（HawkBrain 资产可迁，Responses 已通）  
3. 即形态 **A**；若 P1 显示 codex 工具链对 mimo 补丁行为不稳，则退回 **C 为主、Office 管道改写到 zcode driver**  
4. **必须砍**：Z.ai/ChatGPT 账号体系、Agent Identity、分享/社区、ZCode/OpenAI 发布与遥测

---

## 3D. P1 真联调（2026-10-22 · hawkren · model=`Auto`）

脚本：`HawkNext/research/p1-smoke.mjs`。全部 **PASS**。

| 用例 | 结果 | 路由落点 | 要点 |
|------|------|----------|------|
| P1-A Office 结构化 `write_memo` | ✅ `tool_calls` | `mimo-v2.6-flash` | JSON 参数完整：中文 title + 3 points + summary，可直接进交付管道 |
| P1-B Coding `apply_patch`/`write_file` | ✅ `tool_calls` | `mimo-v2.5-pro` | 选了 `write_file`（未用 patch）；`hello.js` 内容正确 |
| P1-C **Responses + tools**（codex 路径） | ✅ `status=completed` | `mimo-v2.6-flash` | `output` = `reasoning` + **`function_call`**（`call_id`/`arguments` 标准形） |
| P1-D 多轮 tool 循环 | ✅ 两轮均 `tool_calls` | flash → pro | tool result 回灌后能继续改测试文件 |

**结论：**
1. **Office 结构化产出** 在 Auto/mimo 上可稳定走 function-call 管道 → 可接 HawkBrain 交付资产  
2. **Coding 工具调用 + 多轮** 可用；**未验证** apply-patch 按 gpt-4.1 写的解析器（P1 里模型主动选了 `write_file`）→ codex driver 的 patch 路径要 **专项回归**  
3. **`/v1/responses` + tools** 形状与 OpenAI 一致 → **codex 模型源可接 llmapi**  
4. Auto 会在 `mimo-v2.6-flash` / `mimo-v2.5-pro` / `mimo-v2.6-pro` 间路由 → 适配层 **禁止写死单一 ID**

### Harness 终评建议（P0+P1 后）

**推荐形态 A：可切换后端**

| 用途 | Driver | 理由 |
|------|--------|------|
| **Office / 华讯交付** | **codex driver**（钉死） | 确定性管道资产可迁；Responses+tools 已验；不赌模型自觉 |
| **Coding 日常** | **ZCode driver**（默认） | 壳同构；工具状态/可中断/不锁输入；provider.baseUrl 已证可换 |
| 模型 | 统一 **llmapi `Auto`**（主 hawkren，ashawk 备用） | 全路径 Chat/Responses 均已冒烟 |

**门禁（进开发前）：** 锁定审计表每项标 `砍 / 换 mimo / 仅官方增强 / 无锁定`；砍清单（Z.ai OAuth、ChatGPT Agent Identity、分享/社区、官方发布/遥测）进 rebrand 验收。

**遗留风险（记分不挡立项）：** codex `apply-patch`×mimo、ZCode Coding Plan 端点在自有 provider 下是否仍被强制改写、内置运行时体积/签名。

---

## 4. Harness 组合（历史讨论，已被 3D 取代）

| 形态 | 说明 |
|------|------|
| A. 可切换后端 | 会话/项目级选 driver；Office 钉确定性驱动 |
| B. 双引擎并行/混合 | 能力上限最高，状态/审批复杂 |
| C. 主 zcode 执行 | 与 Fork ZCode 壳一致 |
| D. 主 codex 执行 | 业务连续但与「ZCode 壳」张力大 |

**验证门禁（你已要求）：** P0 静态审计 + P1 stub 冒烟 + 真 llmapi 联调 → 出评分表后再拍板 A/B/C/D。

---

## 5. 运行时打包清单（最大闭环）

Node · Python · LibreOffice/Pandoc · FFmpeg · rg/fd · Git · Playwright + 浏览器驱动 · 7z · **代码签名/SmartScreen 自检**

原则：不读用户全局 PATH/npm/pip 配置；工作区/数据落数据盘；离线除 LLM 外可工作。

---

## 6. 下一步

1. **P0 续扫**：ZCode 其余锁定 + **codex** 全量锁定 → 完整审计表  
2. **P1**：fake stub 对照 + 以 Auto 打真实 driver 冒烟（Office 一小例、Coding 一小例）  
3. **Harness 评分表**（35/25/20/15/5）→ 你拍板组合  
4. 新仓 `HawkNext` 骨架：rebrand 清单 + LLMAPI 适配层 + 运行时打包设计  

---

## 7. 安全备忘

- 临时 llmapi Key 仅用于沙箱冒烟，**默认不写入长期记忆明文**；请择机在后台轮换。  
- 产品内 Key 存储：safeStorage（DPAPI）优先，不写明文 YAML。
