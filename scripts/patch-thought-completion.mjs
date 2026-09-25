#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const reasonPath =
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/components/ai-elements/reasoning.tsx";
let r = readFileSync(reasonPath, "utf8");
if (!r.includes("streamingElapsed")) {
  const re =
    /isStreaming && !isOpen \? \(\s*<span className="animated-gradient-text font-medium">\s*\{intl\.formatMessage\(\{ id: "chat\.reasoning\.thinking" \}\)\}\s*<\/span>\s*\) : duration === undefined \? \(/;
  if (!re.test(r)) {
    console.error("reasoning regex missing");
    const i = r.indexOf("isStreaming && !isOpen");
    console.log(JSON.stringify(r.slice(i, i + 220)));
    process.exit(1);
  }
  r = r.replace(
    re,
    `isStreaming && !isOpen ? (
        <span className="animated-gradient-text font-medium">
          {intl.formatMessage({ id: "chat.reasoning.thinking" })}
          {duration !== undefined && duration > 0 ? (
            <span className="font-normal text-foreground-subtlest">
              {" · "}
              {intl.formatMessage(
                { id: "chat.reasoning.streamingElapsed" },
                { seconds: String(duration) },
              )}
            </span>
          ) : null}
        </span>
      ) : duration === undefined ? (`,
  );
  writeFileSync(reasonPath, r, "utf8");
  console.log("reasoning elapsed wired");
} else {
  console.log("reasoning already");
}

const zhPath =
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/i18n/locales/zh-CN.ts";
let z = readFileSync(zhPath, "utf8");
if (!z.includes("chat.reasoning.streamingElapsed")) {
  z = z.replace(
    '"chat.reasoning.durationSeconds": "持续了 {seconds} 秒",',
    `"chat.reasoning.durationSeconds": "持续了 {seconds} 秒",
  "chat.reasoning.streamingElapsed": "已耗时 {seconds}s",
  "chat.trajectory.compact": "⚡ {count} 个步骤已完成 · 耗时 {seconds}s",`,
  );
  writeFileSync(zhPath, z, "utf8");
  console.log("zh i18n");
}

const enPath =
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/i18n/locales/en-US.ts";
let e = readFileSync(enPath, "utf8");
if (!e.includes("chat.reasoning.streamingElapsed")) {
  e = e.replace(
    '"chat.reasoning.durationSeconds": "{seconds} seconds",',
    `"chat.reasoning.durationSeconds": "{seconds} seconds",
  "chat.reasoning.streamingElapsed": "elapsed {seconds}s",
  "chat.trajectory.compact": "⚡ {count} steps done · {seconds}s",`,
  );
  writeFileSync(enPath, e, "utf8");
  console.log("en i18n");
}

const compPath =
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/v4/ConversationWorkflowCompletion.tsx";
let c = readFileSync(compPath, "utf8");
if (!c.includes("HAWK_UI_FS_PROBE")) {
  if (!c.includes("withFsProbeCompletion")) {
    const reImp = /(import type \{ WorkflowCompletionArtifact \}[^\n]*\n)/;
    if (!reImp.test(c)) {
      console.error("import anchor missing");
      process.exit(1);
    }
    c = c.replace(
      reImp,
      `$1import { withFsProbeCompletionArtifacts, type UiFsProbeHit } from "@/lib/withFsProbeCompletion.js"; // HAWK_UI_FS_PROBE\n`,
    );
  }
  const reMerge = /const artifacts = useMemo\(\s*\(\) => mergeCompletionArtifacts\(completion\.artifacts, state\.artifacts\),\s*\[completion\.artifacts, state\.artifacts\],\s*\);/;
  if (!reMerge.test(c)) {
    console.error("completion merge missing");
    process.exit(1);
  }
  c = c.replace(
    reMerge,
    `const artifacts = useMemo(() => {
    const merged = mergeCompletionArtifacts(completion.artifacts, state.artifacts);
    // HAWK_UI_FS_PROBE: fold local probe hits (host-supplied) into chips
    const probeHits = (completion as { fsProbeHits?: UiFsProbeHit[] }).fsProbeHits;
    return probeHits && probeHits.length > 0
      ? withFsProbeCompletionArtifacts(merged, probeHits)
      : merged;
  }, [completion, state.artifacts]);`,
  );
  writeFileSync(compPath, c, "utf8");
  console.log("completion probe wired");
} else {
  console.log("completion already");
}
