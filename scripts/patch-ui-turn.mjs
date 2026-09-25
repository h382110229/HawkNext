import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/v4/workflowTurnCompletion.ts";
let s = readFileSync(p, "utf8");

if (s.includes("HAWK_FS_PROBE")) {
  console.log("already");
  process.exit(0);
}

// extend resolveWorkflowTurnCompletion to also surface fs probe chips from notification if present
const re = /artifacts: notification\.artifacts \?\? \[\],/;
if (!re.test(s)) {
  console.error("artifacts assign missing");
  process.exit(1);
}
s = s.replace(
  re,
  `artifacts: notification.artifacts ?? [], // HAWK_FS_PROBE: CLI merges fsProbeHits into this list`,
);

writeFileSync(p, s, "utf8");
console.log("workflowTurnCompletion noted");
