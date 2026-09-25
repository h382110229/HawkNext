import type {
  HawkNextAgentMcpServer,
  HawkNextAutomationScheduleRule,
  HawkNextMcpListMode,
  ModelSelection,
} from "@hawknext/shared";

export interface HawkNextAgentWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  /** 远程 workspace 的运行时会话身份；只用于隔离/路由，不能替代 workspacePath。 */
  remoteSessionId?: string;
}

export interface HawkNextAgentPluginViewParams extends HawkNextAgentWorkspaceTarget {
  configScope?: "user" | "workspace";
}

export interface HawkNextAgentListMcpServerStatusesParams extends HawkNextAgentWorkspaceTarget {
  mcpServers?: HawkNextAgentMcpServer[];
  mode?: HawkNextMcpListMode;
}

export interface HawkNextAgentAddPluginMarketplaceParams extends HawkNextAgentWorkspaceTarget {
  dryRun?: boolean;
  operationId?: string;
  source: string;
}

export interface HawkNextAgentRemovePluginMarketplaceParams extends HawkNextAgentWorkspaceTarget {
  marketplace: string;
}

export interface HawkNextAgentUpdatePluginMarketplaceParams extends HawkNextAgentWorkspaceTarget {
  marketplace?: string;
  operationId?: string;
}

export interface HawkNextAgentInstallPluginParams extends HawkNextAgentWorkspaceTarget {
  dryRun?: boolean;
  marketplace: string;
  operationId?: string;
  pluginName: string;
  scope?: "user" | "workspace";
}

export interface HawkNextAgentCancelPluginOperationParams {
  operationId: string;
}

export interface HawkNextAgentUninstallPluginParams extends HawkNextAgentWorkspaceTarget {
  marketplace?: string;
  pluginId?: string;
  pluginName?: string;
  removeCache?: boolean;
}

export interface HawkNextAgentUpdatePluginParams extends HawkNextAgentWorkspaceTarget {
  pluginId?: string;
  marketplace?: string;
}

export interface HawkNextAgentRestoreBuiltinPluginParams extends HawkNextAgentWorkspaceTarget {
  pluginId: string;
}

export interface HawkNextAgentConfigurePluginParams extends HawkNextAgentWorkspaceTarget {
  clearOptionKeys?: string[];
  dryRun?: boolean;
  options: Record<string, unknown>;
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface HawkNextAgentResetPluginConfigParams extends HawkNextAgentWorkspaceTarget {
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface HawkNextAgentValidatePluginParams extends HawkNextAgentWorkspaceTarget {
  marketplace?: string;
  pluginName?: string;
  source?: string;
}

export interface HawkNextAgentDescribePluginParams extends HawkNextAgentWorkspaceTarget {
  marketplace: string;
  pluginName: string;
}

export interface HawkNextAgentSetPluginEnabledParams extends HawkNextAgentWorkspaceTarget {
  enabled: boolean;
  operationId?: string;
  pluginId: string;
  scope?: "user" | "workspace";
}

// Plugin 对话引用 catalog：
// 带 sessionId → session-owned 冻结 catalog（必须路由到持有该 session 的 workspace client）；
// 不带 → workspace 当前 catalog（新建草稿 Picker）。
export interface HawkNextAgentPluginReferenceCatalogParams extends HawkNextAgentWorkspaceTarget {
  sessionId?: string;
}

// Composer Skill catalog：与 Plugin 引用相同，以 sessionId 区分 workspace 当前目录和
// resident Session runtime 快照；不参与 Settings 管理目录。
export interface HawkNextAgentSkillReferenceCatalogParams extends HawkNextAgentWorkspaceTarget {
  sessionId?: string;
}
export interface HawkNextAgentResolveSuggestedPluginReferenceParams extends HawkNextAgentWorkspaceTarget {
  stableId: string;
  operationId: string;
  clientMode: "desktop-continuous" | "web-remote-replayable";
  deliveryKind: "desktop-continuous" | "web-remote-replayable";
}

// ---- 定时任务(automation)管理参数 ----

export interface HawkNextAgentCreateAutomationParams extends HawkNextAgentWorkspaceTarget {
  title: string;
  cronExpr: string;
  relativeDelayMinutes?: number;
  prompt: string;
  modelSelection?: ModelSelection;
  mode?: string;
  recurring?: boolean;
  maxRuns?: number;
  endAt?: number;
  scheduleRule?: HawkNextAutomationScheduleRule;
}

export interface HawkNextAgentUpdateAutomationParams extends HawkNextAgentWorkspaceTarget {
  automationId: string;
  title?: string;
  cronExpr?: string;
  prompt?: string;
  modelSelection?: ModelSelection | null;
  mode?: string | null;
  recurring?: boolean;
  maxRuns?: number | null;
  endAt?: number | null;
  scheduleRule?: HawkNextAutomationScheduleRule | null;
  scheduleEditedByUser?: boolean;
}

export interface HawkNextAgentAutomationIdParams extends HawkNextAgentWorkspaceTarget {
  automationId: string;
}

export interface HawkNextAgentSetAutomationEnabledParams extends HawkNextAgentWorkspaceTarget {
  automationId: string;
  enabled: boolean;
}

export interface HawkNextAgentDeleteAutomationRunParams extends HawkNextAgentWorkspaceTarget {
  runId: string;
}
