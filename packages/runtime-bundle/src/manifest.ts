/**
 * HawkNext max-closed-loop runtime manifest.
 * architecture-kickoff §1: Node · Python · LibreOffice/Pandoc · FFmpeg · rg/fd ·
 * Git · Playwright+browser · 7z · 签名自检
 */
export type ToolFamily =
  | "node"
  | "python"
  | "office"
  | "media"
  | "search"
  | "vcs"
  | "browser"
  | "archive"
  | "signing";

export type ResolutionSource = "bundled" | "managed" | "path" | "missing";

export interface ToolSpec {
  id: string;
  family: ToolFamily;
  displayName: string;
  /** Candidate executable names (first match wins). */
  commands: string[];
  /** Relative path under bundle root, if vendored. */
  bundledPath?: string;
  /** Optional managed runtime path (e.g. MIMO_PYTHON). */
  managedEnv?: string;
  /** Probe args to confirm the binary runs. */
  versionArgs?: string[];
  /** Hard requirement for closed-loop installer. */
  required: boolean;
  /** Platform-specific extra names. */
  windowsCommands?: string[];
  notes?: string;
}

export interface RuntimeManifest {
  schemaVersion: 1;
  product: "HawkNext";
  /** Bundle root layout version for installer. */
  layoutVersion: number;
  tools: ToolSpec[];
}

export const BUNDLE_SCHEMA_VERSION = 1;
export const LAYOUT_VERSION = 1;

/** Default on-disk layout under `runtime/` next to the app. */
export const RUNTIME_LAYOUT = {
  root: "runtime",
  node: "runtime/node",
  python: "runtime/python",
  office: "runtime/office",
  media: "runtime/media",
  search: "runtime/search",
  vcs: "runtime/git",
  browser: "runtime/browser",
  archive: "runtime/archive",
  signing: "runtime/signing",
  manifests: "runtime/manifests",
} as const;

export const DEFAULT_MANIFEST: RuntimeManifest = {
  schemaVersion: BUNDLE_SCHEMA_VERSION,
  product: "HawkNext",
  layoutVersion: LAYOUT_VERSION,
  tools: [
    {
      id: "node",
      family: "node",
      displayName: "Node.js",
      commands: ["node"],
      bundledPath: "runtime/node/node",
      managedEnv: "MIMO_NODE",
      versionArgs: ["--version"],
      required: true,
      notes: "drive llmapi-adapter / drivers",
    },
    {
      id: "python",
      family: "python",
      displayName: "Python",
      commands: ["python", "python3"],
      bundledPath: "runtime/python/python",
      managedEnv: "MIMO_PYTHON",
      versionArgs: ["--version"],
      required: true,
    },
    {
      id: "libreoffice",
      family: "office",
      displayName: "LibreOffice",
      commands: ["soffice", "libreoffice"],
      bundledPath: "runtime/office/soffice",
      managedEnv: "MIMO_SOFFICE",
      versionArgs: ["--version"],
      required: true,
      notes: "Office pipeline (codex driver)",
    },
    {
      id: "pandoc",
      family: "office",
      displayName: "Pandoc",
      commands: ["pandoc"],
      bundledPath: "runtime/office/pandoc",
      versionArgs: ["--version"],
      required: true,
    },
    {
      id: "ffmpeg",
      family: "media",
      displayName: "FFmpeg",
      commands: ["ffmpeg"],
      bundledPath: "runtime/media/ffmpeg",
      versionArgs: ["-version"],
      required: true,
    },
    {
      id: "rg",
      family: "search",
      displayName: "ripgrep",
      commands: ["rg"],
      bundledPath: "runtime/search/rg",
      managedEnv: "MIMO_RIPGREP_PATH",
      versionArgs: ["--version"],
      required: true,
    },
    {
      id: "fd",
      family: "search",
      displayName: "fd",
      commands: ["fd", "fdfind"],
      bundledPath: "runtime/search/fd",
      versionArgs: ["--version"],
      required: true,
    },
    {
      id: "git",
      family: "vcs",
      displayName: "Git",
      commands: ["git"],
      bundledPath: "runtime/git/git",
      versionArgs: ["--version"],
      required: true,
    },
    {
      id: "playwright",
      family: "browser",
      displayName: "Playwright browsers",
      commands: ["playwright"],
      bundledPath: "runtime/browser/playwright",
      versionArgs: ["--version"],
      required: true,
      notes: "browser automation + local browser binaries under runtime/browser/browsers",
    },
    {
      id: "sevenzip",
      family: "archive",
      displayName: "7-Zip",
      commands: ["7z", "7za", "7zz"],
      bundledPath: "runtime/archive/7z",
      versionArgs: ["-?"],
      required: true,
    },
    {
      id: "signtool",
      family: "signing",
      displayName: "Signature self-check",
      commands: ["signtool", "osslsigncode"],
      bundledPath: "runtime/signing/self-check",
      versionArgs: [],
      required: true,
      notes: "codesign / SmartScreen self-check (see signature.ts)",
    },
  ],
};

export function toolById(manifest: RuntimeManifest, id: string): ToolSpec | undefined {
  return manifest.tools.find((t) => t.id === id);
}
