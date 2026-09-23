# HawkNext × ZCode Fork — 深度 Rebrand 清单

**原则：** Apache-2.0 可 fork；商标 / Z.ai 账号 / 官方域名 / 遥测 / 市场不可带走。  
**验收 DoD：** 全局搜索无品牌残留（LICENSE/NOTICE 除外）；无账号可跑通 llmapi 主路径。

处置枚举：`砍` / `换` / `仅官方增强` / `无锁定`

---

## 1. 品牌与元数据 — `换`

| 项 | 现状线索 | 目标 |
|----|----------|------|
| 产品名 / 包名 / 窗口标题 | ZCode / zcode | **HawkNext** |
| Logo / 图标 / 关于页 | ZCode 视觉 | HawkNext + HawkBrain token |
| AppId / 协议 / 安装包名 | zcode.* | hawknext.* |

## 2. 账号与 OAuth — `砍`

| 项 | 位置线索 | 处置 |
|----|----------|------|
| Z.ai / BigModel 登录 | `ZAI_PROVIDER_ID`, `BIGMODEL_PROVIDER_ID` | 砍 |
| Z.ai OAuth | `chat.z.ai` authorize、硬编码 clientId | 砍 |
| OAuth token 键 | `oauth:zai:*` | 砍 |
| ChatGPT Agent Identity（codex） | `auth.openai.com`, `chatgpt.com/codex-backend/...` | 砍 |
| 分享页「连接 Z.ai」 | `ConversationShareLandingPage` | 砍 |

**替换：** llmapi Bearer + safeStorage（DPAPI）。

## 3. 域名 / 更新 / CDN — `砍` 或 `换` 自有

| 项 | 位置线索 | 处置 |
|----|----------|------|
| `https://zcode.z.ai` 下载 | share landing | 砍/换 |
| `VITE_ZCODE_BASE_URL` / `ZCODE_BASE_URL` | web/server env | 换自有或删 |
| `ZAI_OAUTH_*` / `ZAI_BUSINESS_BASE_URL` | remote connect | 砍 |
| `remoteCdnBaseUrl(s)` | deploy.ts | 砍或自有 CDN |
| `releases.openai.com/codex` | codex release | 换自有/本地包 |
| `api.openai.com` 防火墙默认 | init_firewall.sh | **换** llmapi 域名 |

## 4. 分享 / 社区 / 市场 — `砍`

- 会话分享 / preview / landing → 砍或本地导出
- `communityUrl` → 砍
- 官方插件市场 → 砍；技能走本地（HawkBrain 资产）

## 5. 遥测 — 默认 `砍`

| 项 | 线索 | 处置 |
|----|------|------|
| 上报 ZCode endpoint | `entry-stdio.ts` 注释 | 砍 |
| 网络/资源遥测 | `network-telemetry-*`, `schedulerResourceTelemetry` | 默认关；可留本地 sink |
| `reportTelemetryEvent` | web main | no-op |

**产品铁律：默认无遥测。**

## 6. 模型层 — `换` → llmapi Auto/mimo

| 项 | 处置 |
|----|------|
| Provider `baseUrl` | 预置/必填指向 llmapi |
| 默认 model | **`Auto`** |
| glm/deepseek rename 表 | 扩展 **Auto/mimo**；禁止写死单一 mimo ID |
| gpt-4.1 patch 形状（codex apply-patch） | **换 mimo 等价** + 专项回归 |
| Coding Plan 两端点强制 | 自有 provider 验证；否则砍登录/计划 |

## 7. UI 皮肤 — HawkBrain

- Token/配色：`HawkBrain/docs/hawk-ui-design-spec.md`
- 交付向导入口首屏可见
- 设置保留「旧布局」回退

## 8. DoD 检查

```text
rg -i 'zcode|z\.ai|chatgpt|openai\.com|cdn-zcode|bigmodel' -g '!**/LICENSE*' -g '!**/NOTICE*'
```

- [ ] 无 Z.ai / ChatGPT / BigModel 登录入口
- [ ] 离线可建会话 + 调 llmapi
- [ ] 更新器不指向 zcode.z.ai / releases.openai.com
- [ ] 默认无遥测外发
- [ ] 窗口/安装包名 = HawkNext
