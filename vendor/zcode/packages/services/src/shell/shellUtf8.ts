/**
 * Shell tool spawn helpers — UTF-8 on Windows PowerShell (fixes GBK mojibake in agent output).
 * Pair with packages/shared/src/winConsoleUtf8.ts for UI-side decode.
 */
import { isWindowsPlatform, windowsPowerShellArgs, wrapPowerShellCommand, decodeConsoleChunk } from "@hawknext/shared";

export { isWindowsPlatform, windowsPowerShellArgs, wrapPowerShellCommand, decodeConsoleChunk };

export interface ShellSpawnPlan {
  shell: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}

/**
 * Plan a shell spawn with UTF-8 console codepage on Windows.
 * Use for agent `run_shell` / exec adapters — not for interactive PTY terminals.
 */
export function planShellSpawn(command: string, env?: NodeJS.ProcessEnv): ShellSpawnPlan {
  if (isWindowsPlatform()) {
    const { shell, args } = windowsPowerShellArgs(command);
    return {
      shell,
      args,
      env: {
        ...env,
        PYTHONIOENCODING: "utf-8",
      },
    };
  }
  return { shell: "/bin/bash", args: ["-c", command], env };
}

/** Decode stdout/stderr chunks with UTF-8 + GBK fallback. */
export function decodeShellChunk(buf: Buffer | Uint8Array | string): string {
  return decodeConsoleChunk(buf).text;
}
