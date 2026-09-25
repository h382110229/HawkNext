import { recordArmsCustomEventForE2E } from "@hawknext/ui";
import { DesktopCommandIds, buildLocalMediaPreviewUrl, type IPlatformService } from "@hawknext/shared";

import { desktopBrowserPlatformBridge } from "./desktopBrowserPlatformBridge.js";

export function createDesktopPlatform(options: {
  isLocalDevelopmentRuntime: boolean;
}): IPlatformService {
  return {
    canSelectFilePath: true,
    createLocalMediaPreviewUrl: buildLocalMediaPreviewUrl,
    isLocalDevelopmentRuntime: options.isLocalDevelopmentRuntime,
    selectDirectory: () => window.hawknext.selectDirectory(),
    selectFile: () => window.hawknext.selectFile(),
    selectFiles: () => window.hawknext.selectFiles?.() ?? Promise.resolve([]),
    createTempTextAttachment: (payload) => window.hawknext.createTempTextAttachment(payload),
    onRemoteConnectionLog: (handler) => window.hawknext.onRemoteConnectionLog(handler),
    onRemoteSessionClosed: (handler) => window.hawknext.onRemoteSessionClosed(handler),
    activateOrSetWorkspace: (path) =>
      window.hawknext.activateOrSetWorkspace?.(path) ?? Promise.resolve({ activated: false }),
    connectRemote: (remoteOptions, requestId, context) =>
      window.hawknext.connectRemote(remoteOptions, requestId, context),
    cancelPendingRemoteConnection: (requestId) =>
      window.hawknext.cancelPendingRemoteConnection?.(requestId) ?? Promise.resolve(),
    bindRemoteWorkspaceSessionContext: (context) =>
      window.hawknext.bindRemoteWorkspaceSessionContext?.(context) ?? Promise.resolve(),
    disposeRemoteSession: (sessionId) => window.hawknext.disposeRemoteSession(sessionId),
    isDockerAvailable: () => window.hawknext.isDockerAvailable(),
    listWSLDistros: () => window.hawknext.listWSLDistros(),
    listDockerContainers: () => window.hawknext.listDockerContainers(),
    listSSHConfigAliases: () => window.hawknext.listSSHConfigAliases(),
    loadMcpFromUserDirectory: (payload) => window.hawknext.loadMcpFromUserDirectory(payload),
    saveMcpToUserDirectory: (payload) => window.hawknext.saveMcpToUserDirectory(payload),
    migrateLegacyCommonMcp: (payload) => window.hawknext.migrateLegacyCommonMcp(payload),
    openExternal: (url) => window.hawknext.openExternal(url),
    openFeedback: () => window.hawknext.executeDesktopCommand(DesktopCommandIds.OpenFeedback),
    openCommunity: () => window.hawknext.executeDesktopCommand(DesktopCommandIds.OpenCommunity),
    canOpenCommunity: (locale) => window.hawknext.canOpenCommunity(locale),
    openInFileManager: (path) => window.hawknext.openInFileManager(path),
    openExternalFile: (path) => window.hawknext.openExternalFile(path),
    openCuaPermissionOnboarding: window.hawknext.openCuaPermissionOnboarding
      ? (permissionOptions) =>
          window.hawknext.openCuaPermissionOnboarding?.(permissionOptions) ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    prepareCuaHelperPermissionDrag: window.hawknext.prepareCuaHelperPermissionDrag
      ? () =>
          window.hawknext.prepareCuaHelperPermissionDrag?.() ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    startCuaHelperPermissionDrag: window.hawknext.startCuaHelperPermissionDrag
      ? () => window.hawknext.startCuaHelperPermissionDrag?.()
      : undefined,
    registerOAuthState: (payload) => window.hawknext.registerOAuthState(payload),
    onOAuthCallback: (callback) => window.hawknext.onOAuthCallback(callback),
    onPaymentCallback: (callback) => window.hawknext.onPaymentCallback(callback),
    onShareImport: (callback) => window.hawknext.onShareImport?.(callback) ?? (() => {}),
    notifyRendererReady: () => window.hawknext.notifyRendererReady(),
    reportTelemetryEvent: (payload) => window.hawknext.reportTelemetryEvent(payload),
    reportArmsCustomEvent: (payload) => {
      recordArmsCustomEventForE2E(payload);
      return window.hawknext.reportArmsCustomEvent(payload);
    },
    getRendererActionTraceConfig: window.hawknext.getRendererActionTraceConfig
      ? () => window.hawknext.getRendererActionTraceConfig!()
      : undefined,
    onRendererActionTraceConfigChanged: window.hawknext.onRendererActionTraceConfigChanged
      ? (callback) => window.hawknext.onRendererActionTraceConfigChanged!(callback)
      : undefined,
    reportLocalTtftBatch: (batch) => window.hawknext.reportLocalTtftBatch(batch),
    reportRendererActionTraceBatch: window.hawknext.reportRendererActionTraceBatch
      ? (batch) => window.hawknext.reportRendererActionTraceBatch!(batch)
      : undefined,
    reportRendererHeapSample: window.hawknext.reportRendererHeapSample
      ? (sample) => window.hawknext.reportRendererHeapSample!(sample)
      : undefined,
    showTaskNotification: (payload) => window.hawknext.showTaskNotification(payload),
    syncWindowTabs: (paths) => window.hawknext.syncWindowTabs(paths),
    syncWindowUnreadCount: (count) => window.hawknext.syncWindowUnreadCount(count),
    syncActiveTaskSession: (sessionId) => window.hawknext.syncActiveTaskSession(sessionId),
    syncAppSettings: (patch) => window.hawknext.syncAppSettings?.(patch),
    setShortcutRecordingActive: (active) => window.hawknext.setShortcutRecordingActive?.(active),
    onFocusTab: (handler) => window.hawknext.onFocusTab(handler),
    onNewTab: (handler) => window.hawknext.onNewTab(handler),
    onCloseActiveContextRequest: (handler) =>
      window.hawknext.onCloseActiveContextRequest?.(handler) ?? (() => {}),
    onOpenBrowserUrl: (handler) => window.hawknext.onOpenBrowserUrl?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfacePrepare: (handler) =>
      window.hawknext.onBrowserViewScreenshotSurfacePrepare?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfaceRelease: (handler) =>
      window.hawknext.onBrowserViewScreenshotSurfaceRelease?.(handler) ?? (() => {}),
    browserViewScreenshotSurfaceReady: (payload) =>
      window.hawknext.browserViewScreenshotSurfaceReady?.(payload),
    ...desktopBrowserPlatformBridge,
    onNewTask: (handler) => window.hawknext.onNewTask(handler),
    onOpenWorkspace: (handler) => {
      // 开发态或升级后的旧窗口可能仍运行未暴露 onOpenWorkspace 的 preload，
      // renderer 直接调用会在启动时崩溃。这里和 activateOrSetWorkspace 一样做兼容兜底，
      // 缺少该 bridge 时只禁用原生菜单回调，不影响应用继续打开。
      return window.hawknext.onOpenWorkspace?.(handler) ?? (() => {});
    },
    onOpenWorkspacePath: (handler) => window.hawknext.onOpenWorkspacePath?.(handler) ?? (() => {}),
    onOpenFeedbackDialog: (handler) => window.hawknext.onOpenFeedbackDialog?.(handler) ?? (() => {}),
    onOpenTicketsPanel: (handler) => window.hawknext.onOpenTicketsPanel?.(handler) ?? (() => {}),
    onWindowFullscreenChanged: (handler) => window.hawknext.onWindowFullscreenChanged(handler),
    getDesktopWindowChromeState: window.hawknext.getDesktopWindowChromeState
      ? () => window.hawknext.getDesktopWindowChromeState!()
      : undefined,
    onDesktopWindowChromeStateChanged: window.hawknext.onDesktopWindowChromeStateChanged
      ? (handler) => window.hawknext.onDesktopWindowChromeStateChanged!(handler)
      : undefined,
    getWindowControlsOverlayMetrics: () => window.hawknext.getWindowControlsOverlayMetrics?.() ?? null,
    onWindowControlsOverlayChanged: (handler) =>
      window.hawknext.onWindowControlsOverlayChanged?.(handler) ?? (() => {}),
    getDesktopZoomLevel: () =>
      window.hawknext.getDesktopZoomLevel?.() ?? Promise.resolve({ zoomLevel: 0 }),
    onDesktopZoomLevelChanged: (handler) =>
      window.hawknext.onDesktopZoomLevelChanged?.(handler) ?? (() => {}),
    onTaskNotificationClick: (handler) => window.hawknext.onTaskNotificationClick(handler),
    exportLogs: () => window.hawknext.exportLogs(),
    captureWindowScreenshot: () =>
      window.hawknext.captureWindowScreenshot?.() ?? Promise.resolve(null),
    onUpdateReady: (callback) => window.hawknext.onUpdateReady(callback),
    onUpdateCheckResult: (callback) => window.hawknext.onUpdateCheckResult(callback),
    onUpdateStateChanged: (callback) => window.hawknext.onUpdateStateChanged?.(callback) ?? (() => {}),
    getUpdateState: () =>
      window.hawknext.getUpdateState?.() ?? Promise.resolve({ kind: "idle", enabled: true }),
    downloadUpdate: () => window.hawknext.downloadUpdate?.() ?? Promise.resolve(),
    cancelUpdateDownload: () => window.hawknext.cancelUpdateDownload?.() ?? Promise.resolve(),
    openUpdateStatusWindow: () => window.hawknext.openUpdateStatusWindow?.() ?? Promise.resolve(),
    getAutoUpdatePreferences: () =>
      window.hawknext.getAutoUpdatePreferences?.() ??
      Promise.resolve({ autoDownloadAndInstallUpdates: false }),
    setAutoDownloadAndInstallUpdates: (enabled) =>
      window.hawknext.setAutoDownloadAndInstallUpdates?.(enabled) ?? Promise.resolve(),
    getDesktopSessionActivity: () =>
      window.hawknext.getDesktopSessionActivity?.() ??
      Promise.resolve({ runningAgentSessionCount: 0 }),
    getHawkNextStdioTapDevState: () =>
      window.hawknext.getHawkNextStdioTapDevState?.() ??
      Promise.resolve({ enabled: false, visible: false, logDir: "", statePath: "" }),
    onSettingsChanged: (callback) => window.hawknext.onSettingsChanged?.(callback) ?? (() => {}),
    onApplicationLocaleChanged: (callback) =>
      window.hawknext.onApplicationLocaleChanged?.(callback) ?? (() => {}),
    onPostUpdateReleaseNotes: (callback) => window.hawknext.onPostUpdateReleaseNotes(callback),
    acknowledgePostUpdateReleaseNotes: (version) =>
      window.hawknext.acknowledgePostUpdateReleaseNotes(version),
    skipUpdateVersion: (version) => window.hawknext.skipUpdateVersion?.(version) ?? Promise.resolve(),
    quitAndInstallUpdate: () => window.hawknext.quitAndInstallUpdate(),
    getInstalledEditors: () => window.hawknext.getInstalledEditors(),
    getApplicationIcon: (bundleId) =>
      window.hawknext.getApplicationIcon?.(bundleId) ?? Promise.resolve(null),
    openInEditor: (editorId, path, editorOptions) =>
      window.hawknext.openInEditor(editorId, path, editorOptions),
    executeDesktopCommand: (command) => window.hawknext.executeDesktopCommand(command),
    setApplicationLocale: (locale) => window.hawknext.setApplicationLocale(locale),
    getSystemLocale: () =>
      window.hawknext.getSystemLocale?.() ??
      Promise.resolve(navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US"),
    setTitleBarTheme: (theme) => window.hawknext.setTitleBarTheme(theme),
    getDeviceId: () =>
      (window as Window & { __HAWKNEXT_DEVICE_ID__?: string }).__HAWKNEXT_DEVICE_ID__ ?? "",
  };
}
