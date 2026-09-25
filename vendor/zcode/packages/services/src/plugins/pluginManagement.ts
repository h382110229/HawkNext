// 平台能力面收敛：设置页「插件管理」的薄服务接口。
//
// 背景：pluginManagementStore / usePluginUninstall 过去直接注入 IHawkNextAgentService，
// UI 层因此散布 13 个 plugins/* 旧协议词的消费点。收敛为独立薄 service 后，UI 只依赖
// 本接口；plugins/* 词表的 host 侧消费点收拢到 pluginManagementService 一处（插件的
// 事实源在 hawknext-cli 进程，服务实现仍经 agent 协议往返——plugins 词表的收口归属
// 插件能力面自身的协议演进，不在会话 v4 词表范围内）。
// 注意与既有 IPluginsService（已 retired 的 marketplace pluginStore 通道）区分：
// 那套接口按 pluginName+marketplace 寻址且方法语义过时，不复用避免签名冲突。
import type { Event } from "@hawknext/rpc";
import type {
  HawkNextPluginOperationProgressNotification,
  HawkNextPluginsConfigureResult,
  HawkNextPluginsCancelOperationResult,
  HawkNextPluginsDescribeResult,
  HawkNextPluginsInstallResult,
  HawkNextPluginsListResult,
  HawkNextPluginsMarketplaceMutationResult,
  HawkNextPluginsOverviewResult,
  HawkNextPluginsReferenceCatalogResult,
  HawkNextPluginsRestoreBuiltinResult,
  HawkNextPluginsSetEnabledResult,
  HawkNextPluginsUninstallResult,
  HawkNextPluginsValidateResult,
} from "@hawknext/shared";
import { ServiceChannels } from "@hawknext/shared";
import { createServiceDescriptor } from "../descriptors.js";
import type {
  HawkNextAgentAddPluginMarketplaceParams,
  HawkNextAgentConfigurePluginParams,
  HawkNextAgentCancelPluginOperationParams,
  HawkNextAgentDescribePluginParams,
  HawkNextAgentInstallPluginParams,
  HawkNextAgentPluginReferenceCatalogParams,
  HawkNextAgentResolveSuggestedPluginReferenceParams,
  HawkNextAgentResetPluginConfigParams,
  HawkNextAgentPluginViewParams,
  HawkNextAgentRemovePluginMarketplaceParams,
  HawkNextAgentRestoreBuiltinPluginParams,
  HawkNextAgentSetPluginEnabledParams,
  HawkNextAgentUninstallPluginParams,
  HawkNextAgentUpdatePluginMarketplaceParams,
  HawkNextAgentUpdatePluginParams,
  HawkNextAgentValidatePluginParams,
} from "../hawknext-agent/hawknextAgentPluginParams.js";

export interface IPluginManagementService {
  listPlugins(params: HawkNextAgentPluginViewParams): Promise<HawkNextPluginsListResult>;
  /**
   * Plugin 对话引用 catalog：
   * 带 sessionId → session-owned 冻结 catalog；不带 → workspace 当前 catalog。
   * 实现路由到 workspace 级 agent client，不走插件管理独立进程。
   */
  getPluginReferenceCatalog(
    params: HawkNextAgentPluginReferenceCatalogParams,
  ): Promise<HawkNextPluginsReferenceCatalogResult>;
  resolveSuggestedPluginReference(
    params: HawkNextAgentResolveSuggestedPluginReferenceParams,
  ): Promise<import("@hawknext/shared").HawkNextPluginsResolveSuggestedReferenceResult>;
  onDynamicPluginOperationProgress(
    operationId: string,
  ): Event<HawkNextPluginOperationProgressNotification>;
  getPluginsOverview(params: HawkNextAgentPluginViewParams): Promise<HawkNextPluginsOverviewResult>;
  addPluginMarketplace(
    params: HawkNextAgentAddPluginMarketplaceParams,
  ): Promise<HawkNextPluginsMarketplaceMutationResult>;
  removePluginMarketplace(
    params: HawkNextAgentRemovePluginMarketplaceParams,
  ): Promise<HawkNextPluginsMarketplaceMutationResult>;
  updatePluginMarketplace(
    params: HawkNextAgentUpdatePluginMarketplaceParams,
  ): Promise<HawkNextPluginsMarketplaceMutationResult>;
  installPlugin(params: HawkNextAgentInstallPluginParams): Promise<HawkNextPluginsInstallResult>;
  cancelPluginOperation(
    params: HawkNextAgentCancelPluginOperationParams,
  ): Promise<HawkNextPluginsCancelOperationResult>;
  uninstallPlugin(params: HawkNextAgentUninstallPluginParams): Promise<HawkNextPluginsUninstallResult>;
  updatePlugin(params: HawkNextAgentUpdatePluginParams): Promise<HawkNextPluginsInstallResult>;
  restoreBuiltinPlugin(
    params: HawkNextAgentRestoreBuiltinPluginParams,
  ): Promise<HawkNextPluginsRestoreBuiltinResult>;
  configurePlugin(params: HawkNextAgentConfigurePluginParams): Promise<HawkNextPluginsConfigureResult>;
  resetPluginConfig(
    params: HawkNextAgentResetPluginConfigParams,
  ): Promise<HawkNextPluginsConfigureResult>;
  validatePlugin(params: HawkNextAgentValidatePluginParams): Promise<HawkNextPluginsValidateResult>;
  describePlugin(params: HawkNextAgentDescribePluginParams): Promise<HawkNextPluginsDescribeResult>;
  setPluginEnabled(params: HawkNextAgentSetPluginEnabledParams): Promise<HawkNextPluginsSetEnabledResult>;
}

export const IPluginManagementService = createServiceDescriptor<IPluginManagementService>(
  ServiceChannels.PluginManagement,
);
