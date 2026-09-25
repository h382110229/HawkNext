// Bootstrap public API surface.

export * from "./app/create-app.js";
export type {
  ListHawkNextSessionsOptions,
  PromptInput,
  ResolveLatestSessionOptions,
  ResumeOptions,
  RunHawkNextProtocolAgentOptions,
  SendInputOptions,
  SendInputResult,
  SetLocaleResult,
  SteerTurnOptions,
  SubmitPromptOptions,
  UserPromptInput,
  HawkNextApp,
  HawkNextAppOptions,
  HawkNextModelOption,
} from "./app/types.js";
export * from "./auth-login.js";
export {
  inspectHawkNextCustomCommand,
  listHawkNextCustomCommands,
  loadHawkNextCustomCommand,
} from "./custom-commands.js";
export type {
  InspectHawkNextCustomCommandOptions,
  ListHawkNextCustomCommandsOptions,
  HawkNextCustomCommandInspection,
} from "./custom-commands.js";
export { createModelAdapter } from "./model-factory.js";
export type { CreateModelAdapterOptions } from "./model-factory.js";
export { startProcessProviderRegistryRuntime } from "./app/process-provider-registry-runtime.js";
export type { ProcessProviderRegistryRuntimeOptions } from "./app/process-provider-registry-runtime.js";
export {
  addHawkNextPluginMarketplace,
  getHawkNextPluginsOverview,
  installHawkNextMarketplacePlugin,
  listHawkNextPlugins,
  removeHawkNextPluginMarketplace,
  resolveHawkNextPlugins,
  setHawkNextPluginEnabled,
  uninstallHawkNextMarketplacePlugin,
  updateHawkNextMarketplacePlugin,
  updateHawkNextPluginMarketplace,
  validateHawkNextPluginPath,
} from "./plugins.js";
export type {
  AddHawkNextMarketplaceOptions,
  InstallHawkNextMarketplacePluginOptions,
  ListHawkNextPluginsOptions,
  RemoveHawkNextMarketplaceOptions,
  ResolveHawkNextPluginsOptions,
  SetHawkNextPluginEnabledOptions,
  SetHawkNextPluginEnabledResult,
  UninstallHawkNextMarketplacePluginOptions,
  UpdateHawkNextMarketplaceOptions,
  UpdateHawkNextMarketplacePluginOptions,
  ValidateHawkNextPluginPathOptions,
  HawkNextAvailablePluginData,
  HawkNextInstalledPluginData,
  HawkNextMarketplaceSummaryData,
  HawkNextMarketplaceUpdateData,
  HawkNextPluginInstallData,
  HawkNextPluginUpdateData,
  HawkNextPluginsOverviewData,
} from "./plugins.js";
export { runHawkNextProtocolAgent } from "./hawknext-protocol-entrypoint.js";
// Exposed for the CLI's --output-format stream-json: it needs the same event
// shape the protocol server emits, rather than inventing a second one.
export { mapSessionEvent } from "./hawknext-protocol/session-mapper.js";
export { prepareHawkNextTelemetryEnv, shutdownHawkNextTelemetry } from "./telemetry-bootstrap.js";
export type { SessionTranscriptMessage, SessionTranscriptPart } from "./session-transcript.js";
export { listHawkNextSessions, resolveLatestSession } from "./sessions.js";
export { inspectHawkNextSkill, listHawkNextSkills } from "./skills.js";
export type {
  InspectHawkNextSkillOptions,
  ListHawkNextSkillsOptions,
  HawkNextSkillInspection,
} from "./skills.js";
// Exposed for the CLI's headless slash routing: it must decide "is this a real
// custom command?" with the *same* reserved-name gate the app facade's
// customCommandPromptResolver applies, or the two disagree and a reserved name
// reaches the model as literal prompt text. See prompt-command.ts.
export { isReservedHawkNextSlashCommandName } from "./slash-command-surface.js";
export {
  grantWorkspaceHookTrust,
  inspectWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
} from "./workspace-hook-trust-cli.js";
export type {
  WorkspaceHookTrustCliItem,
  WorkspaceHookTrustCliStatus,
  WorkspaceHookTrustCliTarget,
} from "./workspace-hook-trust-cli.js";
