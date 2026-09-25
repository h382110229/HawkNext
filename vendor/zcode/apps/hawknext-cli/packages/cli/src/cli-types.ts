import type { TuiReadClipboardImage, TuiWriteClipboardText } from "@hawknext/tui";
import type { UiLocale } from "@hawknext/i18n";
import type { Logger } from "@hawknext/contracts";
import type {
  createManagedCdpBrowserRuntime,
  ManagedCdpBrowserRuntimeOptions,
} from "@hawknext/adapters/browser";
import type {
  createModelAdapter,
  createHawkNextApp,
  CreateModelAdapterOptions,
  configureCodingPlanApiKey,
  ConfigureCodingPlanApiKeyOptions,
  inspectHawkNextSkill,
  inspectWorkspaceHookTrust,
  grantWorkspaceHookTrust,
  revokeWorkspaceHookTrustCli,
  inspectHawkNextCustomCommand,
  InspectHawkNextCustomCommandOptions,
  InspectHawkNextSkillOptions,
  loginHawkNextCli,
  loginCloudCnCodingPlan,
  LoginCloudCnCodingPlanOptions,
  LoginHawkNextCliOptions,
  listHawkNextCustomCommands,
  ListHawkNextCustomCommandsOptions,
  loadHawkNextCustomCommand,
  listHawkNextSessions,
  listHawkNextSkills,
  ListHawkNextSessionsOptions,
  ListHawkNextSkillsOptions,
  logoutHawkNextCli,
  LogoutHawkNextCliOptions,
  resolveLatestSession,
  ResolveLatestSessionOptions,
  RunHawkNextProtocolAgentOptions,
  prepareHawkNextTelemetryEnv,
  startProcessProviderRegistryRuntime,
  shutdownHawkNextTelemetry,
  HawkNextAppOptions,
} from "@hawknext/bootstrap";
import type { CliEnv, DotenvLoadResult, LoadCliDotenvOptions } from "./env.js";
import type { PluginsCommandOverrides } from "./plugins-command.js";
import type { CliShutdownProcess } from "./shutdown.js";
import type { resolveWorkspaceGitBranch } from "./tui-workspace-git.js";

export type BootstrapModule = typeof import("@hawknext/bootstrap");

export interface RunDependencies extends PluginsCommandOverrides {
  protocolLifecycle?: RunHawkNextProtocolAgentOptions["lifecycle"];
  protocolInput?: NodeJS.ReadableStream;
  createManagedCdpBrowserRuntime?: (
    options?: ManagedCdpBrowserRuntimeOptions,
  ) => ReturnType<typeof createManagedCdpBrowserRuntime>;
  createModelAdapter?: (
    options?: CreateModelAdapterOptions,
  ) => ReturnType<typeof createModelAdapter>;
  createHawkNextApp?: (
    options?: HawkNextAppOptions,
  ) => Awaited<ReturnType<typeof createHawkNextApp>> | ReturnType<typeof createHawkNextApp>;
  /**
   * Session-event shaper for --output-format stream-json. Defaults to the
   * bootstrap module's, which is also what the protocol server uses; injectable
   * so a caller that supplies its own `createHawkNextApp` (tests, embedders) can
   * still stream, since the bootstrap module is not loaded on that path.
   */
  mapSessionEvent?: BootstrapModule["mapSessionEvent"];
  cwd?: () => string;
  env?: CliEnv;
  inspectSkill?: (options: InspectHawkNextSkillOptions) => ReturnType<typeof inspectHawkNextSkill>;
  inspectWorkspaceHookTrust?: typeof inspectWorkspaceHookTrust;
  grantWorkspaceHookTrust?: typeof grantWorkspaceHookTrust;
  revokeWorkspaceHookTrustCli?: typeof revokeWorkspaceHookTrustCli;
  inspectCustomCommand?: (
    options: InspectHawkNextCustomCommandOptions,
  ) => ReturnType<typeof inspectHawkNextCustomCommand>;
  loginHawkNextCli?: (options?: LoginHawkNextCliOptions) => ReturnType<typeof loginHawkNextCli>;
  loginCloudCnCodingPlan?: (
    options?: LoginCloudCnCodingPlanOptions,
  ) => ReturnType<typeof loginCloudCnCodingPlan>;
  configureCodingPlanApiKey?: (
    options: ConfigureCodingPlanApiKeyOptions,
  ) => ReturnType<typeof configureCodingPlanApiKey>;
  loadDotenv?: (options?: LoadCliDotenvOptions) => DotenvLoadResult;
  prepareHawkNextTelemetryEnv?: typeof prepareHawkNextTelemetryEnv;
  projectConfigPath?: string;
  listSessions?: (options: ListHawkNextSessionsOptions) => ReturnType<typeof listHawkNextSessions>;
  listCustomCommands?: (
    options: ListHawkNextCustomCommandsOptions,
  ) => ReturnType<typeof listHawkNextCustomCommands>;
  loadCustomCommand?: (
    options: InspectHawkNextCustomCommandOptions,
  ) => ReturnType<typeof loadHawkNextCustomCommand>;
  // headless slash 路由要和 app facade 的保留名 gate 用同一个判据；默认取 bootstrap 的，
  // 注入点只为让单测不必拉起整个 bootstrap 模块。见 prompt-command.ts。
  isReservedSlashCommandName?: BootstrapModule["isReservedHawkNextSlashCommandName"];
  listSkills?: (options: ListHawkNextSkillsOptions) => ReturnType<typeof listHawkNextSkills>;
  logger?: Logger;
  readClipboardImage?: TuiReadClipboardImage;
  writeClipboardText?: TuiWriteClipboardText;
  resolveLatestSession?: (
    options: ResolveLatestSessionOptions,
  ) => ReturnType<typeof resolveLatestSession>;
  resolveWorkspaceGitBranch?: typeof resolveWorkspaceGitBranch;
  logoutHawkNextCli?: (options?: LogoutHawkNextCliOptions) => ReturnType<typeof logoutHawkNextCli>;
  runHawkNextProtocolAgent?: (options?: RunHawkNextProtocolAgentOptions) => Promise<void>;
  runTui?: typeof import("@hawknext/tui").runTui;
  skipUserConfig?: boolean;
  userConfigPath?: string;
  exitProcess?: (code: number) => void;
  shutdownCleanupTimeoutMs?: number;
  shutdownProcess?: CliShutdownProcess;
  startProcessProviderRegistryRuntime?: typeof startProcessProviderRegistryRuntime;
  shutdownHawkNextTelemetry?: typeof shutdownHawkNextTelemetry;
}

export type CliPermissionMode = "build" | "plan" | "edit" | "yolo";
export type CliRuntimeMode = CliPermissionMode | "auto";

export interface CliModeState {
  current?: CliRuntimeMode;
  override?: CliPermissionMode;
}

export interface CliTargetRequest {
  objective: string;
  replaceExisting: boolean;
}

export type ModeCapableApp = Awaited<ReturnType<typeof createHawkNextApp>> & {
  getMode?: () => CliRuntimeMode;
  setLocale?: (locale: UiLocale) => Promise<{ locale: "en-US" | "zh-CN" }>;
  setMode?: (mode: CliRuntimeMode) => Promise<{ mode: CliRuntimeMode }>;
};

export interface CliResumeRequest {
  continueSession: boolean;
  resumeSessionId?: string;
}
