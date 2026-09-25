# P0 真机 UI 验收清单

> 目标：带 **XLSX 交付** 跑一单，验收 **芯片 → 预览 → Reveal → 中文回显**  
> 环境：Windows 11 x64 · Desktop `pnpm dev:desktop` 或已安装包  
> 状态：待真机执行（代码链路单测已绿）

---

## 0. 前置

| 项 | 要求 | 检查 |
|----|------|------|
| 依赖 | `vendor/zcode` 已 `pnpm bootstrap` | `node_modules` 存在 |
| 模型 | 默认 **Auto**；Key 走 env/safeStorage | 设置页未写死官方端点 |
| 工作区 | 新建空目录 `D:\tmp\p0-xlsx-accept` | 可写 |
| 语言 | 界面语言 **简体中文** | 设置 → 语言 |

启动：

```powershell
cd D:\AIProject\HawkNext\vendor\zcode
pnpm bootstrap          # 首次
pnpm dev:desktop        # 或已安装的 HawkNext.exe
```

---

## 1. 用例脚本（一单交付）

向 Agent 发送：

```text
在当前工作区生成一份 Excel 交付：
文件名 deliverable.xlsx
工作表「验收」：表头 编号/名称/状态，写入 3 行中文样例数据（含「已完成」「进行中」）。
生成后总结你写了什么。
```

期望 Agent 行为：
- 产出 `deliverable.xlsx` 于会话 cwd
- 回复中含中文摘要
- 可能带 `write_file` / 工具卡

---

## 2. 四项断言

### 2.1 芯片（Artifact Chip）

| 步骤 | 操作 | 期望 |
|------|------|------|
| A1 | 观察会话完成区 / 通知 / 完成卡 | 出现 `deliverable.xlsx` **制品芯片**（非纯路径文本） |
| A2 | 芯片元数据 | 类型/图标对应 XLSX；体积或名称可读 |
| A3 | 零配置扫盘 | 未手动 `artifact.*` 注册也出现芯片（fs-probe 合并） |

**代码锚点：** `fsProbeArtifacts.ts` · `WorkflowNotificationArtifactChips.tsx` · `WorkflowCompletionArtifacts.tsx`

### 2.2 预览（XLSX Sheet Preview）

| 步骤 | 操作 | 期望 |
|------|------|------|
| B1 | 点击芯片 / 预览 | 预览面板打开 **Sheet 表格**，非 hex/下载 |
| B2 | 表头与 3 行 | 中文「编号/名称/状态」及样例行完整可读 |
| B3 | 多 Sheet（若有） | 页签可切换 |

**代码锚点：** `previewPaneOfficeXlsxContent.tsx`（`@extend-ai/react-xlsx`）

### 2.3 Reveal（文件管理器）

| 步骤 | 操作 | 期望 |
|------|------|------|
| C1 | 制品侧栏 / 右键 | 出现 **在文件管理器中显示**（`workflow-artifact-reveal-manager`） |
| C2 | 点击 Reveal | Explorer 定位并选中 `deliverable.xlsx` |
| C3 | 远程/无本地路径 | 不出现无效 Reveal（`canRevealInFileManager`） |

**代码锚点：** `WorkflowArtifactSidePane.tsx` · `useFileContextActions.ts` · `openInEditor.ts`

### 2.4 中文回显

| 步骤 | 操作 | 期望 |
|------|------|------|
| D1 | Agent 最终回复 | 中文无乱码、无 `??`/`锟` |
| D2 | 工具输出 / 路径 | 中文文件名/目录显示正确 |
| D3 | 预览表格 | 中文单元格与回显一致 |
| D4 | 终端（若有） | `chcp 65001` / UTF-8，无乱码 |

**代码锚点：** UTF-8 preamble · PowerShell `chcp 65001` · i18n `zh-CN`

---

## 3. 记录模板

```markdown
## P0 真机 UI 验收 · YYYY-MM-DD

- 构建：dev / 安装包 __.exe（版本 __）
- 系统：Windows 11 x64（build __）
- 结果：A1–A3  /  B1–B3  /  C1–C3  /  D1–D4

| 项 | PASS/FAIL | 备注 |
|----|-----------|------|
| A1 芯片出现 | | |
| A2 芯片元数据 | | |
| A3 零配置扫盘 | | |
| B1 打开预览 | | |
| B2 表头/数据 | | |
| B3 Sheet 页签 | | |
| C1 Reveal 入口 | | |
| C2 Explorer 定位 | | |
| C3 远程隐藏 | | |
| D1 回复中文 | | |
| D2 路径中文 | | |
| D3 表格中文 | | |
| D4 终端 UTF-8 | | |

截图：芯片 / 预览 / Reveal / 回复 各一张
结论：PASS / FAIL（阻塞项：）
```

---

## 4. 离线预检（已绿，可复跑）

```powershell
# 扫盘→制品
cd D:\AIProject\HawkNext\vendor\zcode\apps\hawknext-cli\packages\core\src\tool\executor
node --test fsProbeArtifacts.test.ts fsProbeScan.test.ts

# 产品包（含模型 Auto / guard）
cd D:\AIProject\HawkNext\packages\llmapi-adapter
node --test test/unit/*.test.ts
```

---

## 5. 通过标准

**全部 A/B/C/D 项 PASS** 方可关闭 P0 真机 UI 验收。  
任一项 FAIL → 记录截图与步骤，开缺陷，不关 P0。
