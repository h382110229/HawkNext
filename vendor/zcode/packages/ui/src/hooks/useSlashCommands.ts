/**
 * HawkNext Agent Slash Commands 便捷 hook
 *
 * 返回当前 workspace 下 Agent 广播的可用 slash commands 列表。
 */
import { useHawkNextSessionStore, selectWorkspaceHawkNextState } from "../store/hawknextSessionStore.js";

export function useSlashCommands(workspacePath: string, workspaceIdentity?: string) {
  return useHawkNextSessionStore(
    (state) => selectWorkspaceHawkNextState(state, workspacePath, workspaceIdentity).slashCommands,
  );
}
