# HawkNext Runtime Bundle + 签名自检（闭环安装包设计）

**对应：** architecture-kickoff 实施顺序 #5 · 产出「闭环安装包设计」  
**包：** `packages/runtime-bundle`

---

## 1. 目标

最大闭环安装包：用户装完 **不依赖系统 PATH** 即可跑 Office + Coding 全管道；  
发布二进制 **可自检签名**（Authenticode / SmartScreen 姿态）。

## 2. 运行时清单（必选）

| family | 组件 | bundled 相对路径 | managed 环境变量 |
|--------|------|------------------|------------------|
| node | Node.js | `runtime/node/` | `MIMO_NODE` |
| python | Python | `runtime/python/` | `MIMO_PYTHON` |
| office | LibreOffice + Pandoc | `runtime/office/` | `MIMO_SOFFICE` |
| media | FFmpeg | `runtime/media/` | — |
| search | rg + fd | `runtime/search/` | `MIMO_RIPGREP_PATH` |
| vcs | Git | `runtime/git/` | — |
| browser | Playwright + browsers/ | `runtime/browser/` | — |
| archive | 7z | `runtime/archive/` | — |
| signing | 自检工具 | `runtime/signing/self-check` | — |

解析顺序：**managed → bundled → PATH**。  
发布门禁：required 工具必须来自 bundled/managed（`HAWKNEXT_ALLOW_PATH=1` 仅开发）。

## 3. 磁盘布局

```text
HawkNext/
  HawkNext.exe            # 签名
  resources/app.asar
  runtime/
    manifest.json         # RuntimeManifest
    hashes.json           # sha256 lockfile
    node/ python/ office/ media/ search/ git/ browser/ archive/ signing/
    manifests/
```

## 4. 产物

| OS | 产物 | 签名 |
|----|------|------|
| win32 | `HawkNext-Setup-<ver>-x64.exe`（NSIS）+ zip | Authenticode；SmartScreen 需 OV/EV |
| darwin | `.dmg` | codesign + notarize |
| linux | `.AppImage`（可选 .deb） | 可选 |

体积预算：win32 ≤ 450MB（runtime 全带）。

## 5. 签名自检（`signature.ts`）

1. **hash lockfile**：`runtime/hashes.json` 与磁盘 sha256 逐文件比对  
2. **签名工具链在位**：`signtool` / `osslsigncode`（win32 缺失 → fail）  
3. **SmartScreen 姿态**：未签名 Windows 二进制 → fail  
4. **平台验签入口**：`Get-AuthenticodeSignature` / `codesign -dv`（安装器发布前跑）

First-run / installer pre-publish 均可调用 `signatureSelfCheck()`。

## 6. 发布门禁（gates）

- [ ] `resolveRuntime` 全部 required ∈ {bundled, managed}
- [ ] `signatureSelfCheck` ok（win32 需 signtool + 已签名）
- [ ] 体积 ≤ 预算
- [ ] 品牌 DoD 残留 0
- [ ] 默认无遥测外发（Wave 1 铁律）

## 7. 与 Wave 6 的关系

向导首屏展示 runtime doctor（缺件列表 + 自检结果）；皮肤用 HawkBrain token。
