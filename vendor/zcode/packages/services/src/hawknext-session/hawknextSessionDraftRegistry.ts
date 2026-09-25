import type { HawkNextSessionStateSnapshot } from "@hawknext/shared";
import type {
  HawkNextSessionWorkspaceTarget,
  HawkNextTaskTarget,
} from "#src/hawknext-session/hawknextSession.js";

function getWorkspaceKey(target: HawkNextSessionWorkspaceTarget): string {
  return target.workspaceIdentity?.trim() || target.workspacePath;
}

function getSessionScopedKey(target: HawkNextTaskTarget): string {
  return `${getWorkspaceKey(target)}\0${target.sessionId}`;
}

export function createHawkNextDeferredDraftRegistry() {
  const sessionKeys = new Set<string>();

  return {
    remember(params: HawkNextSessionWorkspaceTarget, snapshot: HawkNextSessionStateSnapshot): void {
      sessionKeys.add(
        getSessionScopedKey({
          workspacePath: snapshot.session.workspace.workspacePath,
          workspaceIdentity:
            snapshot.session.workspace.workspaceIdentity ?? params.workspaceIdentity,
          sessionId: snapshot.session.sessionId,
        }),
      );
    },

    has(target: HawkNextTaskTarget): boolean {
      return sessionKeys.has(getSessionScopedKey(target));
    },

    forget(target: HawkNextTaskTarget): void {
      sessionKeys.delete(getSessionScopedKey(target));
    },
  };
}
