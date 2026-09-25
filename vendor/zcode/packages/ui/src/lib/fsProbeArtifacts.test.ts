import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fsProbeToArtifactSummaries,
  mergeFsProbeIntoCompletionArtifacts,
} from "./fsProbeArtifacts.ts";
import {
  createHeartbeatTimeout,
  touchHeartbeat,
  shellTimeoutFromEnv,
} from "../../../services/src/shell/shellHeartbeatTimeout.ts";

describe("fsProbeArtifacts", () => {
  it("maps probe hits to file chips (xlsx/txt/json)", () => {
    const chips = fsProbeToArtifactSummaries([
      { absPath: "D:\\out\\汇总.xlsx", size: 100 },
      { absPath: "D:\\out\\notes.txt", size: 3 },
      { absPath: "D:\\out\\readme.md", size: 9 },
    ]);
    assert.equal(chips.length, 3);
    assert.equal(chips[0]!.kind, "file");
    assert.equal(chips[2]!.kind, "markdown");
    assert.ok(chips[0]!.title?.includes("汇总"));
  });

  it("merges without duplicating journal artifacts", () => {
    const probe = fsProbeToArtifactSummaries([
      { absPath: "D:\\a.xlsx", size: 1 },
      { absPath: "D:\\b.txt", size: 2 },
    ]);
    const base = [{ id: probe[0]!.id }];
    const merged = mergeFsProbeIntoCompletionArtifacts(base, probe);
    assert.equal(merged.length, 2);
  });

  it("respects max=8", () => {
    const hits = Array.from({ length: 12 }, (_, i) => ({ absPath: `D:\\f${i}.txt` }));
    assert.equal(fsProbeToArtifactSummaries(hits).length, 8);
  });
});

describe("shellHeartbeatTimeout", () => {
  it("idle timeout fires after quiet period", async () => {
    let fired: string | undefined;
    const h = createHeartbeatTimeout({
      idleMs: 30,
      maxMs: 10_000,
      onTimeout: (r) => {
        fired = r;
      },
    });
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(fired, "idle");
    h.cancel();
  });

  it("touch extends life", async () => {
    let fired = false;
    const h = createHeartbeatTimeout({
      idleMs: 40,
      maxMs: 10_000,
      onTimeout: () => {
        fired = true;
      },
    });
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 20));
      touchHeartbeat(h);
    }
    assert.equal(fired, false);
    h.cancel();
  });

  it("env defaults", () => {
    const t = shellTimeoutFromEnv({
      HAWKNEXT_SHELL_IDLE_TIMEOUT_MS: "120000",
      HAWKNEXT_SHELL_MAX_TIMEOUT_MS: "1800000",
    });
    assert.equal(t.idleMs, 120_000);
    assert.equal(t.maxMs, 1_800_000);
  });
});
