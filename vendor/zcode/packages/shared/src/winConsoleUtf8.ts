/**
 * Windows console UTF-8 helpers — wire into shell/exec spawn paths.
 * Fixes GBK/CP936 mojibake when decoding PowerShell output as UTF-8.
 */

export function powershellUtf8Preamble(): string {
  return (
    "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; " +
    "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; " +
    "$env:PYTHONIOENCODING = 'utf-8'; chcp 65001 > $null"
  );
}

export function wrapPowerShellCommand(command: string): string {
  return `${powershellUtf8Preamble()}; ${command}`;
}

export interface DecodedConsoleChunk {
  text: string;
  encoding: "utf-8" | "gbk" | "fallback";
}

/**
 * Decode a console Buffer: UTF-8 first; on U+FFFD / mojibake try GBK (full-icu).
 */
export function decodeConsoleChunk(buf: Buffer | Uint8Array | string): DecodedConsoleChunk {
  if (typeof buf === "string") return { text: buf, encoding: "utf-8" };
  const u8 = buf instanceof Buffer ? buf : Buffer.from(buf);
  const utf8 = u8.toString("utf8");
  if (!utf8.includes("�")) return { text: utf8, encoding: "utf-8" };
  try {
    const gbk = new TextDecoder("gbk").decode(u8);
    if (gbk && !gbk.includes("�")) return { text: gbk, encoding: "gbk" };
  } catch {
    /* no gbk decoder */
  }
  return { text: utf8, encoding: "fallback" };
}

export function isWindowsPlatform(platform: string = process.platform): boolean {
  return platform === "win32";
}

/** Default shell spawn for agent shell tools on Windows. */
export function windowsPowerShellArgs(command: string): { shell: string; args: string[] } {
  return {
    shell: "powershell.exe",
    args: ["-NoProfile", "-NonInteractive", "-Command", wrapPowerShellCommand(command)],
  };
}
