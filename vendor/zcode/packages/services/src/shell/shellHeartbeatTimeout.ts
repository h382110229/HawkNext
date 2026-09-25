/**
 * Heartbeat-aware timeout for long agent shell runs.
 * Resets the timer on every stdout/stderr chunk so convert pipelines are not SIGKILL'd at 60s.
 */

export interface HeartbeatTimeoutHandle {
  cancel(): void;
  /** Last activity timestamp (ms). */
  readonly lastActivity: number;
}

export interface HeartbeatTimeoutOptions {
  /** Idle timeout ms after last activity (default 60_000). */
  idleMs?: number;
  /** Absolute max runtime ms (default 30 min). */
  maxMs?: number;
  onTimeout: (reason: "idle" | "max") => void;
}

export function createHeartbeatTimeout(opts: HeartbeatTimeoutOptions): HeartbeatTimeoutHandle {
  const idleMs = opts.idleMs ?? 60_000;
  const maxMs = opts.maxMs ?? 30 * 60_000;
  let lastActivity = Date.now();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const maxTimer = setTimeout(() => opts.onTimeout("max"), maxMs);

  function arm() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => opts.onTimeout("idle"), idleMs);
  }
  arm();

  const handle: HeartbeatTimeoutHandle = {
    get lastActivity() {
      return lastActivity;
    },
    cancel() {
      if (idleTimer) clearTimeout(idleTimer);
      clearTimeout(maxTimer);
    },
  };

  // attach touch as own property so tests / callers can re-arm idle clock
  (handle as HeartbeatTimeoutHandle & { touch(): void }).touch = () => {
    lastActivity = Date.now();
    arm();
  };

  return handle;
}

/** Call when a chunk arrives. Resets the idle timer. */
export function touchHeartbeat(handle: HeartbeatTimeoutHandle): void {
  const t = handle as HeartbeatTimeoutHandle & { touch?: () => void };
  if (typeof t.touch === "function") {
    t.touch();
    return;
  }
  // fallback: no-op if handle was constructed without touch (should not happen)
}

/**
 * Preferred default for agent shell tools: idle 120s (heartbeat extends), absolute 30m.
 * Override via HAWKNEXT_SHELL_IDLE_TIMEOUT_MS / HAWKNEXT_SHELL_MAX_TIMEOUT_MS.
 */
export function shellTimeoutFromEnv(env: NodeJS.ProcessEnv = process.env): {
  idleMs: number;
  maxMs: number;
} {
  const idle = Number(env.HAWKNEXT_SHELL_IDLE_TIMEOUT_MS || 120_000);
  const max = Number(env.HAWKNEXT_SHELL_MAX_TIMEOUT_MS || 30 * 60_000);
  return {
    idleMs: Number.isFinite(idle) && idle > 0 ? idle : 120_000,
    maxMs: Number.isFinite(max) && max > 0 ? max : 30 * 60_000,
  };
}
