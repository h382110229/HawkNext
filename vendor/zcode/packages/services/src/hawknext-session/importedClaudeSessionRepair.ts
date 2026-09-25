import type { HawkNextSessionStateSnapshot } from "@hawknext/shared";
import { createServiceLogger } from "#src/logger/serviceLogger.js";
import { repairImportedClaudeSessionSnapshot } from "#src/session/claude-native/importedClaudeHistoryRepair.js";
import type { IHawkNextAgentService } from "#src/hawknext-agent/hawknextAgent.js";
import type {
  HawkNextSessionReadParams,
  HawkNextSessionResumeParams,
} from "#src/hawknext-session/hawknextSession.js";

const logger = createServiceLogger("hawknext-session-service");

export async function repairEmptyImportedClaudeSessionSnapshot(params: {
  agentService: IHawkNextAgentService;
  snapshot: HawkNextSessionStateSnapshot;
  target: HawkNextSessionResumeParams | HawkNextSessionReadParams;
}): Promise<HawkNextSessionStateSnapshot> {
  const repaired = await repairImportedClaudeSessionSnapshot({
    snapshot: params.snapshot,
    target: {
      workspacePath: params.target.workspacePath,
      workspaceIdentity: params.target.workspaceIdentity,
      taskId: params.target.sessionId,
      ...("mcpServers" in params.target && params.target.mcpServers
        ? { mcpServers: params.target.mcpServers }
        : {}),
    },
    createSession: (input) => params.agentService.createSession(input),
    onRepair: (history) => {
      logger.warn(
        undefined,
        `[hawknext-session-service] Claude 导入 session 历史异常，按 ${history.source} 回填 taskId=${params.target.sessionId}`,
      );
    },
  });
  return repaired ?? params.snapshot;
}
