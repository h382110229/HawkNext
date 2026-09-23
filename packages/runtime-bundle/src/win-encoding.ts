/**
 * Windows console encoding — fix GBK/CP936 mojibake when Node decodes PowerShell as UTF-8.
 * Wire into child_process spawn for PowerShell/cmd on win32.
 */

export function powershellUtf8Preamble(): string {
  return [
    "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    "[Console]::InputEncoding = [System.Text.Encoding]::UTF8",
    "$env:PYTHONIOENCODING = 'utf-8'",
    "chcp 65001 > $null",
  ].join("; ");
}

export interface DecodedChunk {
  text: string;
  encoding: "utf-8" | "gbk" | "binary";
}

/**
 * Decode child stdout/stderr with UTF-8 first; on replacement chars retry GBK (CP936).
 */
export function decodeConsoleChunk(buf: Buffer): DecodedChunk {
  const utf8 = buf.toString("utf8");
  if (!utf8.includes("�") && !looksLikeMojibake(utf8)) {
    return { text: utf8, encoding: "utf-8" };
  }
  try {
    // Node has no gbk builtin; latin1 + manual map is incomplete.
    // Prefer TextDecoder('gbk') when ICU is present (Node with full-icu).
    const gbk = new TextDecoder("gbk").decode(buf);
    if (gbk && !gbk.includes("�")) {
      return { text: gbk, encoding: "gbk" };
    }
  } catch {
    /* fall through */
  }
  return { text: utf8, encoding: "binary" };
}

function looksLikeMojibake(s: string): boolean {
  // CJK mixed with high proportion of U+00C0–U+00FF + stray symbols typical of GBK misread
  return /[\u00c0-\u00ff]{3,}/.test(s) && /[一-鿿]/.test(s) === false && /\?|_/.test(s);
}

/** Wrap command with UTF-8 preamble (PowerShell). */
export function wrapPowerShellCommand(command: string): string {
  return `${powershellUtf8Preamble()}; ${command}`;
}

export function defaultSpawnArgs(command: string, isWin: boolean): { shell: string; args: string[] } {
  if (isWin) {
    return {
      shell: "powershell.exe",
      args: ["-NoProfile", "-Command", wrapPowerShellCommand(command)],
    };
  }
  return { shell: "/bin/bash", args: ["-c", command] };
}
