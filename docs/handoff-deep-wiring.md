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

## 关键路径
- 适配：`vendor/zcode/apps/hawknext-cli/packages/adapters/src/model/llmapiFailover.ts`  
- 出网：`model-execution.ts` `createFactory`  
- patch 工具：`core/src/tool/handlers/apply-patch.ts`  
- 制品扫盘：`core/src/tool/executor/fsProbeArtifacts.ts`  
- 预览页：`D:\AIProject\HawkAIAgent\index.html`  
- 进度：`docs/progress-review-2026-10-22.md`
