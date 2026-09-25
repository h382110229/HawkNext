import {
  collectVisibleHawkNextBackgroundTaskControlItems,
  getHawkNextBackgroundTaskControlItemElapsedMs,
  isActiveHawkNextBackgroundTaskControlItem,
  parseHawkNextBackgroundTaskControlItems,
  type HawkNextBackgroundTaskControlItem,
  type HawkNextBackgroundTaskControlStatus,
} from "./background-task-controls.js";

export type HawkNextBackgroundBashJobStatus = HawkNextBackgroundTaskControlStatus;
export type HawkNextBackgroundBashJob = HawkNextBackgroundTaskControlItem & {
  taskKind: "bash";
};

export function parseHawkNextBackgroundBashJobs(value: unknown): HawkNextBackgroundBashJob[] {
  return parseHawkNextBackgroundTaskControlItems(value).filter(isBackgroundBashJob);
}

export function isActiveHawkNextBackgroundBashJob(job: HawkNextBackgroundBashJob): boolean {
  return isActiveHawkNextBackgroundTaskControlItem(job);
}

export function getHawkNextBackgroundBashJobElapsedMs(
  job: HawkNextBackgroundBashJob,
  now = Date.now(),
): number {
  return getHawkNextBackgroundTaskControlItemElapsedMs(job, now);
}

export function collectVisibleHawkNextBackgroundBashJobs(
  jobs: readonly HawkNextBackgroundBashJob[],
  now = Date.now(),
  thresholdMs = 30_000,
): Array<HawkNextBackgroundBashJob & { elapsedMs: number }> {
  return collectVisibleHawkNextBackgroundTaskControlItems(jobs, now, thresholdMs) as Array<
    HawkNextBackgroundBashJob & { elapsedMs: number }
  >;
}

function isBackgroundBashJob(job: HawkNextBackgroundTaskControlItem): job is HawkNextBackgroundBashJob {
  return job.taskKind === "bash";
}
