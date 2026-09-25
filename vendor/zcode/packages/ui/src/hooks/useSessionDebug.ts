import { useEffect, useState } from "react";
import type { SessionDebugSnapshot } from "@hawknext/shared";
import { useServices } from "@/hooks/useServices.js";

const REFRESH_INTERVAL_MS = 1000;
const EMPTY_DEBUG = { rounds: [], networkEntries: [], cache: null } as const;

export function useSessionDebug({
  workspacePath,
  workspaceIdentity,
  taskId,
  enabled = true,
}: {
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string | null;
  enabled?: boolean;
}) {
  const { hawknextAgentService } = useServices();
  const scopeKey = JSON.stringify([workspaceIdentity?.trim() || workspacePath, taskId]);
  const [result, setResult] = useState<{
    key: string;
    service: typeof hawknextAgentService;
    data: SessionDebugSnapshot | null;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (!enabled || !taskId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try {
        const data = await hawknextAgentService.readSessionDebug({
          workspacePath,
          workspaceIdentity,
          sessionId: taskId,
        });
        if (!disposed) setResult({ key: scopeKey, service: hawknextAgentService, data, error: false });
      } catch {
        if (!disposed)
          setResult((previous) => ({
            key: scopeKey,
            service: hawknextAgentService,
            data:
              previous?.key === scopeKey && previous.service === hawknextAgentService
                ? previous.data
                : null,
            error: true,
          }));
      } finally {
        // 调试查询按完成节拍刷新，不重叠请求；切任务后的旧结果不能覆盖新任务。
        if (!disposed) timer = setTimeout(() => void refresh(), REFRESH_INTERVAL_MS);
      }
    };
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [enabled, scopeKey, taskId, workspaceIdentity, workspacePath, hawknextAgentService]);
  const current = result?.key === scopeKey && result.service === hawknextAgentService ? result : null;
  return { ...(current?.data ?? EMPTY_DEBUG), error: current?.error ?? false };
}
