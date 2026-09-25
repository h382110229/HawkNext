import { ServiceChannels } from "@hawknext/shared";
import type {
  TraceId,
  HawkNextAgentMcpServer,
  HawkNextDeliveryKind,
  HawkNextMessageWithParts,
  ModelSelection,
  HawkNextPermissionRequestParams,
  HawkNextUserInputRequestParams,
  HawkNextUserInputResponse,
  HawkNextSessionInfo,
  HawkNextSessionImportHistory,
  HawkNextSessionEvent,
  HawkNextSessionMode,
  HawkNextSessionPersistence,
  HawkNextSessionStateSnapshot,
  HawkNextStateUpdatedNotification,
  HawkNextWorkspacePresentation,
} from "@hawknext/shared";
import { createServiceDescriptor } from "#src/descriptors.js";

export interface HawkNextSessionWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  remoteSessionId?: string;
}

export type HawkNextSessionReadWorkspacePresentationParams = HawkNextSessionWorkspaceTarget;

export interface HawkNextTaskTarget extends HawkNextSessionWorkspaceTarget {
  sessionId: string;
}

export interface HawkNextSessionCreateParams extends HawkNextSessionWorkspaceTarget {
  /** 仅导入事务使用的预分配 ID；普通新会话继续由 Agent 分配。 */
  sessionId?: string;
  sessionTraceId?: TraceId;
  parentSessionId?: string;
  mode?: HawkNextSessionMode;
  model?: ModelSelection;
  persistence?: HawkNextSessionPersistence;
  thoughtLevel?: string;
  mcpServers?: HawkNextAgentMcpServer[];
  importedHistory?: HawkNextSessionImportHistory;
}

export interface HawkNextSessionResumeParams extends HawkNextTaskTarget {
  model?: ModelSelection;
  thoughtLevel?: string;
  mcpServers?: HawkNextAgentMcpServer[];
  /**
   * 默认广播 resume 得到的历史快照，并让 shadow 订阅请求初始 snapshot。
   * 续聊发送前的 runtime 预恢复会关闭它，避免旧终态快照覆盖本地已开始的新输入运行态。
   */
  broadcastSnapshot?: boolean;
}

export interface HawkNextSessionListParams extends HawkNextSessionWorkspaceTarget {
  includeArchived?: boolean;
  limit?: number;
}

export interface HawkNextSessionReadParams extends HawkNextTaskTarget {
  deliveryKind?: HawkNextDeliveryKind;
  messageLimit?: number;
  afterSeq?: number;
}

export interface HawkNextSessionMessagesParams extends HawkNextTaskTarget {
  afterMessageId?: string;
  limit?: number;
}

export interface HawkNextSessionEventsParams extends HawkNextTaskTarget {
  afterSeq?: number;
  limit?: number;
}

export interface HawkNextSessionSetModelParams extends HawkNextTaskTarget {
  model: ModelSelection;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface HawkNextSessionSetThoughtLevelParams extends HawkNextTaskTarget {
  thoughtLevel?: string;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface HawkNextSessionSetModeParams extends HawkNextTaskTarget {
  mode: HawkNextSessionMode;
  expectedRevision?: number;
}

export interface HawkNextSessionSubscribeParams extends HawkNextTaskTarget {
  deliveryKind: HawkNextDeliveryKind;
  afterSeq?: number;
  includeSnapshot?: boolean;
  eventCoalescing?: {
    mode: "background-summary";
    intervalMs?: number;
  };
}

export type HawkNextSessionServiceEvent =
  | { type: "session.event"; event: HawkNextSessionEvent }
  | { type: "state.updated"; notification: HawkNextStateUpdatedNotification }
  | { type: "permission.request"; request: HawkNextPermissionRequestParams }
  | { type: "userInput.request"; request: HawkNextUserInputRequestParams }
  | {
      type: "userInput.response";
      requestId: string;
      response: HawkNextUserInputResponse;
    }
  | { type: "snapshot"; snapshot: HawkNextSessionStateSnapshot };

export interface HawkNextSessionInitializeResult {
  available: boolean;
  workspaceKey: string;
  protocolName?: string;
  protocolVersion?: number;
  transportKind?: "stdio" | "websocket";
  reason?: string;
  reasonCode?: "provider_not_ready";
}

export interface HawkNextSessionWorkspaceRuntimeIdentity {
  generation: number;
  identity: string;
  processId?: number;
  workspaceKey: string;
}

export interface IHawkNextSessionService {
  initializeWorkspace(params: HawkNextSessionWorkspaceTarget): Promise<HawkNextSessionInitializeResult>;
  getWorkspaceRuntimeIdentity(
    params: HawkNextSessionWorkspaceTarget,
  ): Promise<HawkNextSessionWorkspaceRuntimeIdentity>;
  readWorkspacePresentation(
    params: HawkNextSessionReadWorkspacePresentationParams,
  ): Promise<HawkNextWorkspacePresentation>;
  createSession(params: HawkNextSessionCreateParams): Promise<HawkNextSessionStateSnapshot>;
  resumeSession(params: HawkNextSessionResumeParams): Promise<HawkNextSessionStateSnapshot>;
  listSessions(params: HawkNextSessionListParams): Promise<HawkNextSessionInfo[]>;
  readSession(params: HawkNextSessionReadParams): Promise<HawkNextSessionStateSnapshot>;
  readSessionMessages(params: HawkNextSessionMessagesParams): Promise<HawkNextMessageWithParts[]>;
  readSessionEvents(params: HawkNextSessionEventsParams): Promise<HawkNextSessionEvent[]>;
  promoteDeferredDraftSession(params: HawkNextTaskTarget): Promise<void>;
  closeSession(params: HawkNextTaskTarget): Promise<void>;
  closeDeferredDraftSession(params: HawkNextTaskTarget): Promise<boolean>;
  setModel(params: HawkNextSessionSetModelParams): Promise<HawkNextSessionStateSnapshot>;
  setThoughtLevel(params: HawkNextSessionSetThoughtLevelParams): Promise<HawkNextSessionStateSnapshot>;
  setMode(params: HawkNextSessionSetModeParams): Promise<HawkNextSessionStateSnapshot>;
  // renderer 订阅面走 agentService 的 conversation/sessions-index 帧通道。
}

export const IHawkNextSessionService = createServiceDescriptor<IHawkNextSessionService>(
  ServiceChannels.HawkNextSession,
);
