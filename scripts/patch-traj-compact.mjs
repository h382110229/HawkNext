#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/ToolCallBlocks/renderers/execute-group.tsx";
let s = readFileSync(p, "utf8");

if (s.includes("HAWK_TRAJ_COMPACT")) {
  console.log("already");
  process.exit(0);
}

const reFn = /function formatCompletedSummary\(\s*intl: ReturnType<typeof useHawkNextIntl>\["intl"\],\s*childStatuses: string\[\],\s*\) \{[\s\S]*?return parts\.join\(", "\);\s*\}/;

if (!reFn.test(s)) {
  console.error("fn regex missing");
  const i = s.indexOf("function formatCompletedSummary");
  console.log(JSON.stringify(s.slice(i, i + 200)));
  process.exit(1);
}

const neu = `function formatCompletedSummary(
  intl: ReturnType<typeof useHawkNextIntl>["intl"],
  childStatuses: string[],
  elapsedSeconds?: number,
) {
  // HAWK_TRAJ_COMPACT: many-step runs collapse to one-line Cursor-style summary
  const failedCount = childStatuses.filter((status) => status === "failed").length;
  const stoppedCount = childStatuses.filter((status) => status === "stopped").length;
  if (childStatuses.length >= 3) {
    const head = intl.formatMessage(
      {
        id: "chat.trajectory.compact",
        defaultMessage: "⚡ {count} 个步骤已完成 · 耗时 {seconds}s",
      },
      {
        count: String(childStatuses.length),
        seconds: String(elapsedSeconds ?? 0),
      },
    );
    const tail: string[] = [];
    if (failedCount > 0) {
      tail.push(
        intl.formatMessage({ id: "chat.toolCall.executeGroup.failed" }, { count: failedCount }),
      );
    }
    if (stoppedCount > 0) {
      tail.push(
        intl.formatMessage({ id: "chat.toolCall.executeGroup.stopped" }, { count: stoppedCount }),
      );
    }
    return tail.length > 0 ? head + " · " + tail.join(", ") : head;
  }
  const parts = [
    intl.formatMessage(
      {
        id:
          childStatuses.length === 1
            ? "chat.toolCall.executeGroup.command.one"
            : "chat.toolCall.executeGroup.command.other",
      },
      { count: childStatuses.length },
    ),
  ];
  if (failedCount > 0) {
    parts.push(
      intl.formatMessage({ id: "chat.toolCall.executeGroup.failed" }, { count: failedCount }),
    );
  }
  if (stoppedCount > 0) {
    parts.push(
      intl.formatMessage({ id: "chat.toolCall.executeGroup.stopped" }, { count: stoppedCount }),
    );
  }
  return parts.join(", ");
}`;

s = s.replace(reFn, neu);

const reCall = /const completedSummary = formatCompletedSummary\(\s*intl,\s*childToolCalls\.map\(\(child\) => child\.toolCall\.status\),\s*\);/;
const neuCall = `const elapsedSeconds = (() => {
    const times = childToolCalls
      .map((c) => {
        const t = (c.toolCall as { startedAt?: string | number }).startedAt;
        return typeof t === "number" ? t : typeof t === "string" ? Date.parse(t) : NaN;
      })
      .filter((t) => Number.isFinite(t));
    if (times.length < 2) return undefined;
    return Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / 1000));
  })();
  const completedSummary = formatCompletedSummary(
    intl,
    childToolCalls.map((child) => child.toolCall.status),
    elapsedSeconds,
  ); // HAWK_TRAJ_COMPACT`;

if (!reCall.test(s)) {
  console.error("call regex missing");
  process.exit(1);
}
s = s.replace(reCall, neuCall);
writeFileSync(p, s, "utf8");
console.log("execute-group compact wired");
