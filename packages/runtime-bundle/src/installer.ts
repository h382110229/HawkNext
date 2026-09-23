/**
 * Closed-loop installer layout (design locked in docs/runtime-bundle-design.md).
 * Emits the directory plan and packaging checklist used by electron-builder / NSIS / 7z SFX.
 */
import { RUNTIME_LAYOUT, type RuntimeManifest, DEFAULT_MANIFEST } from "./manifest.ts";

export type InstallerOs = "win32" | "darwin" | "linux";

export interface InstallerArtifact {
  id: string;
  /** Output filename pattern. */
  pattern: string;
  /** Payload includes signed app + runtime/. */
  includesRuntime: boolean;
  notes: string;
}

export interface InstallerPlan {
  product: string;
  version: string;
  os: InstallerOs;
  arch: "x64" | "arm64";
  /** Top-level install tree. */
  tree: Record<string, string>;
  artifacts: InstallerArtifact[];
  /** Pre-publish gates. */
  gates: string[];
  /** Approx size budget (MB) for max-closed-loop. */
  sizeBudgetMb: number;
}

export function buildInstallerPlan(
  os: InstallerOs,
  version = "0.1.0",
  arch: "x64" | "arm64" = "x64",
  _manifest: RuntimeManifest = DEFAULT_MANIFEST,
): InstallerPlan {
  const baseTree: Record<string, string> = {
    app: "resources/app.asar (or app/)",
    runtime: RUNTIME_LAYOUT.root,
    "runtime/node": "portable Node",
    "runtime/python": "portable Python + stdlib",
    "runtime/office": "LibreOffice + pandoc",
    "runtime/media": "ffmpeg",
    "runtime/search": "rg + fd",
    "runtime/git": "portable Git",
    "runtime/browser": "playwright drivers + browsers/",
    "runtime/archive": "7z",
    "runtime/signing": "self-check tool + hash lockfile",
    "runtime/manifests": "manifest.json + hashes.json",
  };

  const artifacts: InstallerArtifact[] =
    os === "win32"
      ? [
          {
            id: "nsis",
            pattern: `HawkNext-Setup-${version}-${arch}.exe`,
            includesRuntime: true,
            notes: "NSIS + signed exe; runtime/ uncompressed beside app for self-check",
          },
          {
            id: "zip",
            pattern: `HawkNext-${version}-win32-${arch}.zip`,
            includesRuntime: true,
            notes: "portable 7z SFX optional; still signed",
          },
        ]
      : os === "darwin"
        ? [
            {
              id: "dmg",
              pattern: `HawkNext-${version}-darwin-${arch}.dmg`,
              includesRuntime: true,
              notes: "codesign + notarize required",
            },
          ]
        : [
            {
              id: "AppImage",
              pattern: `HawkNext-${version}-linux-${arch}.AppImage`,
              includesRuntime: true,
              notes: "optional .deb companion",
            },
          ];

  return {
    product: "HawkNext",
    version,
    os,
    arch,
    tree: baseTree,
    artifacts,
    gates: [
      "runtime resolve: all required tools bundled|managed (no PATH-only for release)",
      "signature self-check: hash lockfile match + signing tool present (win32)",
      "SmartScreen posture: Authenticode signed before publish",
      "size budget check",
      "DoD brand residual = 0",
    ],
    sizeBudgetMb: os === "win32" ? 450 : 500,
  };
}

export function formatInstallerPlan(plan: InstallerPlan): string {
  const lines = [
    `HawkNext installer plan (${plan.os}/${plan.arch}) v${plan.version}`,
    `size budget: ~${plan.sizeBudgetMb}MB`,
    "",
    "tree:",
    ...Object.entries(plan.tree).map(([k, v]) => `  ${k}/ → ${v}`),
    "",
    "artifacts:",
    ...plan.artifacts.map((a) => `  - ${a.pattern}  [${a.id}] ${a.notes}`),
    "",
    "release gates:",
    ...plan.gates.map((g) => `  [ ] ${g}`),
  ];
  return lines.join("\n");
}
