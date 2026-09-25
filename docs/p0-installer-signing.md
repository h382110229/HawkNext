# P0 安装包实签（Authenticode + NSIS）

> 目标：`HawkNext-Setup-<ver>-x64.exe` 产出后 **真实签名**，`Get-AuthenticodeSignature = Valid`  
> 链路：electron-builder NSIS → signtool Authenticode → self-check  
> 状态：脚本就绪；**缺 OV/EV 代码签名证书**

---

## 1. 产物与门禁

| 项 | 期望 |
|----|------|
| 产物 | `HawkNext-Setup-0.1.0-x64.exe`（NSIS） |
| 签名 | SHA256 Authenticode + RFC3161 timestamp |
| 验证 | `Get-AuthenticodeSignature` → `Valid` |
| 自检 | `packages/runtime-bundle` `signatureSelfCheck` + hash lockfile |
| SmartScreen | OV 起量 / EV 加速；**未签名必拦** |
| 体积 | ≤ 450MB（runtime 全带预算） |

发布门禁（`installer-plan-win32.txt`）：

- [ ] runtime resolve：required ∈ bundled|managed（无 PATH-only）
- [ ] signature self-check：hash lockfile + signtool
- [ ] SmartScreen：Authenticode 已签再发
- [ ] size budget
- [ ] DoD 品牌残留 = 0

---

## 2. 证书要求

| 类型 | SmartScreen | 采购 |
|------|-------------|------|
| **OV Code Signing** | 需积累下载信誉 | 常见 CA / 云 KMS |
| **EV Code Signing** | 信誉起点更高 | 硬件 token / 云 HSM |
| 自签名 | 仅内网/测试，**不可发布** | 本地 makecert |

格式：
- `.pfx` / `.p12`（含私钥），或
- 证书库 Subject（`certlm.msc` → 个人）

**铁律：密码不入库、不写文档、不进 shell 历史明文。** 用环境变量或交互输入。

---

## 3. 打包（NSIS）

```powershell
cd D:\AIProject\HawkNext\vendor\zcode
pnpm bootstrap
# 生产构建 + electron-builder（win target = nsis）
pnpm --filter @hawknext/desktop run bundle
# 产物目录：packages/desktop/dist/ 或 electron-builder output
```

electron-builder Windows 目标已锁定 `win.target: ["nsis"]`（见 `packages/desktop/electron-builder.config.js`）。

---

## 4. 实签

```powershell
# 方式 A：PFX
$env:WIN_CSC_LINK = "D:\secure\hawknEXT-codesign.pfx"
$env:WIN_CSC_KEY_PASSWORD = Read-Host -MaskInput "PFX password"
node scripts/sign-win-installer.mjs "path\to\HawkNext-Setup-0.1.0-x64.exe"

# 方式 B：证书库
node scripts/sign-win-installer.mjs "path\to\HawkNext-Setup-0.1.0-x64.exe" --subject "CN=Your Org Name"

# 只预览命令行（不签名）
node scripts/sign-win-installer.mjs "path\to\Setup.exe" --pfx cert.pfx --dry-run
```

脚本会：
1. `signtool sign /fd SHA256 /td SHA256 /tr <timestamp>`
2. `Get-AuthenticodeSignature` 必须 `Valid`
3. 失败 exit 1

---

## 5. 自检（签名后）

```powershell
cd D:\AIProject\HawkNext\packages\runtime-bundle
node scripts/self-check.mjs D:\AIProject\HawkNext

# 或 PowerShell 直接验
Get-AuthenticodeSignature "HawkNext-Setup-0.1.0-x64.exe" | Format-List Status, SignerCertificate
```

hash lockfile（如已生成）：

```powershell
# runtime/hashes.json 与磁盘比对由 signatureSelfCheck 完成
```

---

## 6. 可选：electron-builder 内联签

若要在 `bundle` 阶段自动签，配置环境变量后 electron-builder 会调用 signtool：

```powershell
$env:CSC_LINK = $env:WIN_CSC_LINK
$env:CSC_KEY_PASSWORD = $env:WIN_CSC_KEY_PASSWORD
pnpm --filter @hawknext/desktop run bundle
```

或在 `electron-builder.config.js` 的 `win` 段增加 `certificateFile` / `signingHashAlgorithms`（需本地改动，按仓库约定先开 issue）。

推荐：**先 `bundle` 出未签名包 → `sign-win-installer.mjs` 实签 → 验证**，便于失败重试且不把密码绑进构建进程。

---

## 7. 阻塞项（当前机器）

| 项 | 状态 |
|----|------|
| signtool.exe | ✅ `runtime/signing/signtool.exe` |
| NSIS 配置 | ✅ electron-builder `win.target: nsis` + `installer.nsh` |
| 签名脚本 | ✅ `scripts/sign-win-installer.mjs` |
| 证书自检脚本 | ✅ `packages/runtime-bundle` |
| **OV/EV 证书** | ❌ **未提供**（证书库仅有 localhost TLS） |
| 已构建 Setup.exe | ❌ vendor/zcode 未 bootstrap |

---

## 8. 关闭 P0 的判据

1. 产出 NSIS Setup.exe  
2. `sign-win-installer.mjs` 对该 exe 签名  
3. `Get-AuthenticodeSignature.Status = Valid`  
4. `runtime-bundle` self-check `signature: OK`  
5. （建议）干净虚拟机安装一次，SmartScreen 记录在案  

全部满足 → P0 安装包实签完成。
