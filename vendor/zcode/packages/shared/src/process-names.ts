const HAWKNEXT_PROCESS_PREFIX = "hawknext";
const MAX_PROCESS_NAME_SEGMENT_LENGTH = 24;

function sanitizeProcessNameSegment(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_PROCESS_NAME_SEGMENT_LENGTH);
}

function joinHawkNextProcessName(...segments: Array<string | null | undefined>): string {
  const sanitizedSegments = segments
    .map((segment) => sanitizeProcessNameSegment(segment))
    .filter((segment): segment is string => Boolean(segment));
  return [HAWKNEXT_PROCESS_PREFIX, ...sanitizedSegments].join("-");
}

function pickWorkspaceTag(workspacePath: string | null | undefined): string | undefined {
  const trimmedPath = workspacePath?.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const parts = trimmedPath.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? trimmedPath;
}

export function formatHawkNextMainProcessName(): string {
  return joinHawkNextProcessName("main");
}

export function formatHawkNextGpuProcessName(): string {
  return joinHawkNextProcessName("gpu");
}

export function formatHawkNextHostProcessName(label?: string): string {
  return joinHawkNextProcessName("host", label);
}

export function formatHawkNextRendererProcessName(windowTitle?: string): string {
  const normalizedTitle = windowTitle?.trim();
  if (!normalizedTitle || normalizedTitle === "HawkNext") {
    return joinHawkNextProcessName("renderer", "main");
  }

  if (normalizedTitle === "Resource Manager") {
    return joinHawkNextProcessName("renderer", "resource-manager");
  }

  const remoteWindowPrefix = "HawkNext - ";
  if (normalizedTitle.startsWith(remoteWindowPrefix)) {
    return joinHawkNextProcessName(
      "renderer",
      "remote",
      normalizedTitle.slice(remoteWindowPrefix.length),
    );
  }

  return joinHawkNextProcessName("renderer", normalizedTitle);
}

export function formatHawkNextAgentProcessName(provider: string, workspacePath?: string): string {
  return joinHawkNextProcessName("agent", provider, pickWorkspaceTag(workspacePath));
}

export function formatHawkNextUtilityProcessName(name?: string, type = "utility"): string {
  return joinHawkNextProcessName(type, name);
}
