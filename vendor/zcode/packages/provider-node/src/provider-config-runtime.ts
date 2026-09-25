import {
  ProviderConfigService,
  type ProviderConfigLayerSnapshot,
  type ProviderConfigLayerUpdate,
} from "@hawknext/provider";
import { NodeHawkNextBuiltinProviderConfigSource } from "./hawknext-builtin-provider-config-source.js";
import {
  EndpointScopedHawkNextBuiltinSource,
  type EndpointScopedHawkNextBuiltinSourceOptions,
} from "./endpoint-scoped-hawknext-builtin-source.js";
import {
  HawkNextBuiltinRemoteSynchronizer,
  type HawkNextBuiltinRemoteSynchronizerOptions,
  type HawkNextBuiltinRefreshResult,
} from "./hawknext-builtin-remote-synchronizer.js";
import {
  NodePersonalProviderConfigRepository,
  type PersonalProviderConfigRecoveryEvent,
} from "./personal-provider-config-repository.js";

export interface NodeProviderConfigRuntimeOptions {
  readonly hawknextBuiltinFilePath: string;
  readonly hawknextBuiltinActiveFilePath?: string;
  readonly hawknextBuiltinRemote?: Omit<HawkNextBuiltinRemoteSynchronizerOptions, "source">;
  readonly hawknextBuiltinEnvironment?: Omit<
    EndpointScopedHawkNextBuiltinSourceOptions,
    "bundledFilePath"
  >;
  readonly onHawkNextBuiltinRefreshError?: (error: unknown) => void;
  readonly onPersonalConfigRecovery?: (event: PersonalProviderConfigRecoveryEvent) => void;
  readonly onPersonalConfigPollingError?: (error: unknown) => void;
  readonly personalFilePath: string;
  readonly personalPollingIntervalMs?: number | false;
  readonly importLegacy?: (
    hawknextBuiltin: ProviderConfigLayerSnapshot,
  ) => Promise<ProviderConfigLayerUpdate | null>;
  readonly watch?: boolean;
}

/** 组装一个 Node.js 进程内共享的 HawkNext Built-in/Personal Config 运行边界。 */
export class NodeProviderConfigRuntime {
  readonly configService: ProviderConfigService;
  readonly #hawknextBuiltinSource:
    | NodeHawkNextBuiltinProviderConfigSource
    | EndpointScopedHawkNextBuiltinSource;
  readonly #personalRepository: NodePersonalProviderConfigRepository;
  readonly #remoteSynchronizer?: HawkNextBuiltinRemoteSynchronizer;
  readonly #onRemoteRefreshError?: (error: unknown) => void;
  #startPromise: Promise<void> | null = null;
  #disposed = false;
  readonly #checkListeners = new Set<() => Promise<void>>();
  #checkTimer: ReturnType<typeof setInterval> | null = null;
  #checkInFlight: Promise<void> | null = null;

  constructor(options: NodeProviderConfigRuntimeOptions) {
    this.#hawknextBuiltinSource = options.hawknextBuiltinEnvironment
      ? new EndpointScopedHawkNextBuiltinSource({
          bundledFilePath: options.hawknextBuiltinFilePath,
          ...options.hawknextBuiltinEnvironment,
        })
      : new NodeHawkNextBuiltinProviderConfigSource({
          bundledFilePath: options.hawknextBuiltinFilePath,
          activeFilePath: options.hawknextBuiltinActiveFilePath,
          watch: options.watch,
        });
    this.#remoteSynchronizer =
      options.hawknextBuiltinRemote &&
      this.#hawknextBuiltinSource instanceof NodeHawkNextBuiltinProviderConfigSource
        ? new HawkNextBuiltinRemoteSynchronizer({
            source: this.#hawknextBuiltinSource,
            ...options.hawknextBuiltinRemote,
          })
        : undefined;
    this.#onRemoteRefreshError = options.onHawkNextBuiltinRefreshError;
    this.#personalRepository = new NodePersonalProviderConfigRepository({
      filePath: options.personalFilePath,
      onRecovery: options.onPersonalConfigRecovery,
      onPollingError: options.onPersonalConfigPollingError,
      pollingIntervalMs: options.personalPollingIntervalMs,
      ...(options.importLegacy
        ? {
            importLegacy: async () => options.importLegacy!(await this.#hawknextBuiltinSource.read()),
          }
        : {}),
    });
    this.configService = new ProviderConfigService({
      hawknextBuiltinSource: this.#hawknextBuiltinSource,
      personalRepository: this.#personalRepository,
    });
  }

  resolveHawkNextBuiltinActiveFilePath(): Promise<string> {
    return this.#hawknextBuiltinSource instanceof NodeHawkNextBuiltinProviderConfigSource
      ? Promise.resolve(this.#hawknextBuiltinSource.activeFilePath)
      : this.#hawknextBuiltinSource.resolveActiveFilePath();
  }

  get personalRepository(): import("@hawknext/provider").PersonalProviderConfigRepository {
    return this.#personalRepository;
  }

  /** Environment 同一周期检查中恢复未对齐依赖，不被下载 TTL 或失败挡住。 */
  onDidCheckHawkNextBuiltin(listener: () => Promise<void>): () => void {
    this.#checkListeners.add(listener);
    return () => this.#checkListeners.delete(listener);
  }

  start(): Promise<void> {
    if (this.#disposed) throw new Error("NodeProviderConfigRuntime 已 dispose");
    if (this.#startPromise) return this.#startPromise;
    const startPromise = this.configService.read().then(() => {
      if (this.#disposed) return;
      void this.#checkBackground();
      // Managed Worker 无下载配置也无恢复 owner，不建立周期任务。
      if (
        this.#remoteSynchronizer ||
        this.#hawknextBuiltinSource instanceof EndpointScopedHawkNextBuiltinSource ||
        this.#checkListeners.size > 0
      ) {
        this.#checkTimer = setInterval(() => {
          void this.#checkBackground();
        }, 60_000);
        this.#checkTimer.unref?.();
      }
    });
    this.#startPromise = startPromise;
    void startPromise.catch(() => {
      if (this.#startPromise === startPromise) this.#startPromise = null;
    });
    return startPromise;
  }

  refreshHawkNextBuiltin(options?: { readonly force?: boolean }): Promise<HawkNextBuiltinRefreshResult> {
    if (this.#disposed) return Promise.resolve("disposed");
    if (this.#hawknextBuiltinSource instanceof EndpointScopedHawkNextBuiltinSource) {
      return this.#hawknextBuiltinSource.refresh(options);
    }
    return this.#remoteSynchronizer?.refresh(options) ?? Promise.resolve("skipped");
  }

  #checkBackground(): Promise<void> {
    if (this.#disposed) return Promise.resolve();
    if (this.#checkInFlight) return this.#checkInFlight;
    const check = Promise.allSettled([
      this.refreshHawkNextBuiltin(),
      ...[...this.#checkListeners].map((listener) => Promise.resolve().then(listener)),
    ])
      .then((results) => {
        if (this.#disposed) return;
        for (const result of results)
          if (result.status === "rejected") this.#onRemoteRefreshError?.(result.reason);
      })
      .finally(() => {
        if (this.#checkInFlight === check) this.#checkInFlight = null;
      });
    this.#checkInFlight = check;
    return check;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#checkTimer) clearInterval(this.#checkTimer);
    this.#checkTimer = null;
    this.#checkListeners.clear();
    this.#remoteSynchronizer?.dispose();
    this.configService.dispose();
    this.#personalRepository.dispose();
    this.#hawknextBuiltinSource.dispose();
  }
}

export function createNodeProviderConfigRuntime(
  options: NodeProviderConfigRuntimeOptions,
): NodeProviderConfigRuntime {
  return new NodeProviderConfigRuntime(options);
}
