/**
 * Resolve each manifest tool: bundled → managed env → PATH → missing.
 * Iron rule: never silently pull host-only PATH when bundling is required
 * for closed-loop; resolver records source so installer can decide.
 */
import { accessSync, constants, existsSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import {
  DEFAULT_MANIFEST,
  type ResolutionSource,
  type RuntimeManifest,
  type ToolSpec,
} from "./manifest.ts";

export interface ToolResolution {
  id: string;
  source: ResolutionSource;
  path: string | null;
  detail: string;
  required: boolean;
  ok: boolean;
}

export interface ResolveOptions {
  /** Install/bundle root containing `runtime/`. */
  bundleRoot?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  which?: (cmd: string) => string | null;
  /** Injectable file probe (tests). Default: real fs. */
  exists?: (path: string) => boolean;
  /** If true, accept PATH fallback for required tools (dev mode). */
  allowPathFallback?: boolean;
}

function defaultWhich(cmd: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string | null {
  const pathVar = env.PATH ?? env.Path ?? "";
  const exts =
    platform === "win32"
      ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
      : [""];
  const dirs = pathVar.split(delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, cmd + (ext ? (ext.startsWith(".") ? ext : `.${ext}`) : ""));
      // also try bare cmd if it already has ext
      for (const p of [candidate, join(dir, cmd)]) {
        try {
          accessSync(p, constants.X_OK);
          if (statSync(p).isFile()) return p;
        } catch {
          /* keep looking */
        }
      }
    }
  }
  return null;
}

function existsFile(p: string, probe?: (path: string) => boolean): boolean {
  if (probe) return probe(p);
  try {
    return existsSync(p) && statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolveOne(
  spec: ToolSpec,
  opts: ResolveOptions,
): ToolResolution {
  const env = opts.env ?? process.env;
  const platform = opts.platform ?? process.platform;
  const which = opts.which ?? ((c: string) => defaultWhich(c, env, platform));
  const root = opts.bundleRoot ? resolve(opts.bundleRoot) : null;
  const probe = opts.exists;

  // 1) managed runtime (bundled portable toolchain from engine)
  if (spec.managedEnv) {
    const managed = env[spec.managedEnv]?.trim();
    if (managed && existsFile(managed, probe)) {
      return {
        id: spec.id,
        source: "managed",
        path: managed,
        detail: `${spec.managedEnv}=${managed}`,
        required: spec.required,
        ok: true,
      };
    }
  }

  // 2) bundled layout
  if (spec.bundledPath && root) {
    const rel = spec.bundledPath.replace(/^runtime\//, "");
    const candidates = [
      join(root, spec.bundledPath),
      join(root, "runtime", rel),
      join(root, rel),
      join(root, spec.bundledPath + ".exe"),
      join(root, spec.bundledPath, "bin", spec.commands[0]!),
      join(root, spec.bundledPath, `${spec.commands[0]}.exe`),
      // natural family/bin layout: runtime/<family>/bin/<cmd>
      join(root, "runtime", spec.family, "bin", spec.commands[0]!),
      join(root, "runtime", spec.family, "bin", `${spec.commands[0]}.exe`),
      join(root, "runtime", spec.family, `${spec.commands[0]}.exe`),
      join(root, "runtime", spec.family, spec.commands[0]!),
    ];
    for (const c of candidates) {
      const okFile = existsFile(c, probe);
      const okDir =
        !probe &&
        existsSync(c) &&
        statSync(c).isDirectory() &&
        spec.id === "playwright";
      if (okFile || okDir) {
        return {
          id: spec.id,
          source: "bundled",
          path: c,
          detail: `bundled ${spec.bundledPath}`,
          required: spec.required,
          ok: true,
        };
      }
    }
  }

  // 3) PATH fallback
  const names = [
    ...(platform === "win32" ? (spec.windowsCommands ?? []) : []),
    ...spec.commands,
  ];
  if (opts.allowPathFallback !== false) {
    for (const name of names) {
      const hit = which(name);
      if (hit) {
        return {
          id: spec.id,
          source: "path",
          path: hit,
          detail: `PATH:${name}`,
          required: spec.required,
          ok: true,
        };
      }
    }
  }

  return {
    id: spec.id,
    source: "missing",
    path: null,
    detail: `not bundled and not on PATH (${names.join("|")})`,
    required: spec.required,
    ok: false,
  };
}

export function resolveRuntime(
  manifest: RuntimeManifest = DEFAULT_MANIFEST,
  opts: ResolveOptions = {},
): ToolResolution[] {
  return manifest.tools.map((t) => resolveOne(t, opts));
}

export interface ClosedLoopReport {
  ok: boolean;
  missingRequired: ToolResolution[];
  resolved: ToolResolution[];
  /** True when every required tool came from bundled/managed (not PATH). */
  fullyBundled: boolean;
}

export function evaluateClosedLoop(
  resolutions: ToolResolution[],
  requireBundledForRelease = true,
  opts?: { allowPathFallback?: boolean },
): ClosedLoopReport {
  const missingRequired = resolutions.filter((r) => r.required && !r.ok);
  const fullyBundled =
    resolutions
      .filter((r) => r.required && r.ok)
      .every((r) => r.source === "bundled" || r.source === "managed");
  const allowPath = opts?.allowPathFallback ?? false;
  const ok =
    missingRequired.length === 0 &&
    (!requireBundledForRelease || fullyBundled || allowPath);
  return { ok, missingRequired, resolved: resolutions, fullyBundled };
}
