# HawkNext LLMAPI 适配层设计

**目标：** 所有模型流量默认只打 **llmapi**（`Auto`/mimo）；官方模型仅「专有能力缺失时引导开启」。

---

## 1. 已验证契约（P0/P1 冒烟）

| 项 | 值 |
|----|-----|
| 主 Base | `https://llmapi.hawkren.online`（建议主域，池更纯） |
| 备 Base | `https://llmapi.ashawk.online`（扩展池/故障转移） |
| Chat | `POST /v1/chat/completions`（含 tools、SSE） |
| Responses | `POST /v1/responses`（codex 主路径；含 function_call） |
| Auth | `Authorization: Bearer <as-…>` |
| 默认模型 | **`"Auto"`** |
| 非标字段 | Chat：`reasoning_content` / `delta.reasoning_content`；Responses：`reasoning`→`reasoning_text` |
| 错误 | `auth_error` / `rate_limit_error` / `routing_error`…；Auto 全灭 → **503** |

**禁止：** 写死单一 `mimo-v2.*` 为唯一模型 ID；静默改打 `api.openai.com` / `z.ai`。

---

## 2. 架构位置

```text
UI (HawkBrain tokens) / Office Pipeline / Coding Workbench
        │
        ▼
┌───────────────────┐
│  LlmApiAdapter    │  ← 唯一出口
│  - baseUrl 可配   │
│  - Bearer/safeStorage
│  - model: Auto    │
│  - reasoning 归一 │
│  - 429/503 failover
│  - capability probe
└─────────┬─────────┘
          │
   ┌──────┴──────┐
   ▼             ▼
codex driver  zcode driver
(Office 钉)   (Coding 默认)
```

---

## 3. 接口草图（TypeScript）

```ts
export type ModelRef = { kind: "auto" } | { kind: "id"; id: string };

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface AdapterRequest {
  model: ModelRef;
  messages: ChatMessage[];
  tools?: ToolDef[];
  stream?: boolean;
}

export interface NormalizedChunk {
  type: "thought" | "text" | "tool_call" | "done" | "error";
  text?: string;
  toolCall?: ToolCall;
  raw?: unknown;
}

export interface LlmApiAdapter {
  chat(req: AdapterRequest, signal?: AbortSignal): Promise<NormalizedResult>;
  chatStream(req: AdapterRequest, signal?: AbortSignal): AsyncIterable<NormalizedChunk>;
  responses(req: ResponsesRequest, signal?: AbortSignal): Promise<NormalizedResult>;
  listModels(): Promise<string[]>;
}
```

**归一化规则**

| 上游 | 归一 |
|------|------|
| `delta.reasoning_content` / `message.reasoning_content` | `type:"thought"` |
| Responses `reasoning_text` | `type:"thought"` |
| `tool_calls` / `function_call` | `type:"tool_call"` |
| 正文 `content` / `output_text` | `type:"text"` |

---

## 4. 端点策略

1. **primary = hawkren**，**fallback = ashawk**（429/5xx/网络错误自动切换并记日志）
2. 两域均配置 Key（safeStorage 分条存储）
3. 能力探测：图/视频/ASR/TTS 走独立 REST；若某 driver 只要 chat/tools，不依赖扩展池
4. `GET /v1/models` 缓存于会话启动，UI 显示 **实际路由模型**（Auto 解析后 id）

---

## 5. 与双 Driver 的契约

### codex driver（Office）
- 走 **`/v1/responses`** 优先，降级 chat
- **必须** 剥离 Agent Identity / ChatGPT OAuth
- `apply-patch` 对 mimo **专项回归**；失败则 Office 管道禁用 patch，只用确定性工具（write_file/结构化 JSON）

### zcode driver（Coding）
- 走 Provider `baseUrl` + OpenAI-compatible → chat + tools + SSE
- rename 表挂 Auto/mimo
- 工具状态/中断 UI 保留

### 公共
- 审批卡 / 工具卡数据结构两 driver 共用
- 流式 thought 通道统一（HawkBrain 折叠样式）

---

## 6. 官方增强（默认关）

```text
on capability_miss(feature):
  show one-time prompt:
    「此功能需要官方模型能力，是否启用官方增强？」
  yes → 临时 OfficialProvider（独立 baseUrl + 用户自填 Key）
  no  → 功能降级文案；不写死官方端点为默认
```

---

## 7. 密钥与配置

| 项 | 策略 |
|----|------|
| Key 存储 | Electron safeStorage（DPAPI） |
| 配置文件 | 数据盘；**无明文 Key** |
| env 注入 | 仅启动 driver 子进程时短暂注入；退出清理 |
| 日志 | 永不打印完整 Bearer |

---

## 8. 验收（适配层）

- [ ] P1 四用例经 adapter 全绿（Office 结构化 / Coding write / Responses+tools / 多轮）
- [ ] 切断主域可走备域（或明确报错）
- [ ] `thought` 与 `text` 分离，UI 不混排
- [ ] 无官方 Key 时专有能力仅「提示引导」，无静默外联
- [ ] 双 driver 共用同一 adapter 集成测试
