# HawkNext 接管交接（new session）

> 生成：2026-10-22 · 上下文切换用

## 产品与铁律
- 仓：`D:\AIProject\HawkNext`（main）+ `vendor/zcode`（`hawknext/rebrand`）
- 默认 model **Auto**；禁静默 `api.openai.com` / `z.ai`；Key 用 safeStorage/env 不入库；未要求不 commit
- 双驱动：Office→codex（apply_patch）· Coding→zcode（llmapi 预置）

## 已完成（可复用）
1. Rebrand Wave1 DoD 0 · live P1 4/4 · mimo probe 3/3  
2. `packages/llmapi-adapter` · `driver-codex`（24 scenario）· `driver-zcode` · `runtime-bundle` · `hawk-ui`  
3. zcode deep wiring：`llmapiFailover` + Auto 归一进 `model-execution.createFactory`  
4. UI：Callout/流式容错 · 制品扫盘→芯片 · UTF-8 · 心跳超时 · 思考计时 · 轨迹一行 · 文件管理器 Reveal  
5. **apply_patch 已进 tool registry**（`handlers/apply-patch.ts`，失败可恢复→Write/Edit）

## 测试速查
```powershell
# adapters failover
cd vendor/zcode/apps/hawknext-cli/packages/adapters/src/model
node --test llmapiFailover.test.ts
# apply_patch
cd .../core/src/tool/handlers
node --test apply-patch.test.ts
# 产品包
cd D:\AIProject\HawkNext\packages\llmapi-adapter && node --test test/unit/*.test.ts
```

## 建议下一刀（按序）
1. **真机 UI 验收**（P0）：带 XLSX 交付 → 芯片/预览/Reveal/中文回显  
2. **安装包实签**（P0）：Authenticode + NSIS  
3. reasoning 流归一接到 Streamdown（llmapi `reasoning_content`）  
4. runtime 把 ffmpeg/git/playwright 打进 `runtime/` 做全离线  

## P0 接管进展（本会话 2026-10-22 后）

**离线基线（全绿可复跑）**
- llmapiFailover 6/6 · apply_patch 3/3 · llmapi-adapter 22/22 · runtime-bundle 23/23
- fsProbeArtifacts/Scan 5/5 · ui fsProbe+heartbeat 6/6

**已就绪**
- 真机验收清单：`docs/p0-ui-acceptance.md`（A 芯片 / B 预览 / C Reveal / D 中文 四项断言 + 记录模板）
- 安装包实签：`docs/p0-installer-signing.md` + `scripts/sign-win-installer.mjs`（signtool SHA256 + timestamp + Get-AuthenticodeSignature）
- signtool：`runtime/signing/signtool.exe`；NSIS：electron-builder `win.target=nsis` + `installer.nsh`

**阻塞（需用户提供/决策）**
1. **OV/EV 代码签名证书**未在本机（证书库仅 localhost TLS）→ 实签无法执行
2. **vendor/zcode 未 bootstrap**（无 node_modules）→ 真机 Desktop UI 无法启动验收

## 关键路径
- 适配：`vendor/zcode/apps/hawknext-cli/packages/adapters/src/model/llmapiFailover.ts`  
- 出网：`model-execution.ts` `createFactory`  
- patch 工具：`core/src/tool/handlers/apply-patch.ts`  
- 制品扫盘：`core/src/tool/executor/fsProbeArtifacts.ts`  
- XLSX 预览：`packages/ui/src/previewPaneOfficeXlsxContent.tsx`  
- Reveal：`packages/ui/src/app-shell/WorkflowArtifactSidePane.tsx` · `useFileContextActions.ts`  
- 预览页：`D:\AIProject\HawkAIAgent\index.html`  
- 进度：`docs/progress-review-2026-10-22.md`  
- **P0：** `docs/p0-ui-acceptance.md` · `docs/p0-installer-signing.md` · `scripts/sign-win-installer.mjs`

## 本会话推进（bootstrap 打通）

**已修复（rebrand 损伤）**
- npm alias：`@ai-sdk/official-model*` → 真实 `@ai-sdk/openai*`（锁文件哈希一致）
- 标识符：`cloud-cn`/`official-model` 连字符 → 合法 camelCase（`scripts/fix-hyphen-identifiers.mjs`）
- 文件名对齐 import（bigmodel* → cloud-cn*/cloudCn*，zai* → cloud*）
- builtin provider schema + URL；endpoint 默认值（llmapi，禁官方端点）
- apply_patch ToolEntry 类型（trace/cancellation/import）
- **`pnpm install` + `build:bootstrap` 成功**；**Desktop 已启动（窗口 HawkNext）**

**P0 下一步**
1. 真机 UI 验收按 `docs/p0-ui-acceptance.md` 四项点检（需人工/自动化点 GUI）
2. 安装包实签：`scripts/sign-win-installer.mjs` 就绪，**仍缺 OV/EV 证书**