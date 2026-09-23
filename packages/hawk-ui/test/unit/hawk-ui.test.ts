import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HAWK_TOKENS,
  HAWK_ALIAS_DARK,
  HAWK_ALIAS_LIGHT,
  tokensToCssBlock,
} from "../../src/tokens.ts";
import { applyHawkSkin, readSkinMode, writeSkinMode, LEGACY_CLASS, HAWK_CLASS } from "../../src/skin.ts";
import {
  DELIVERY_WIZARD_STEPS,
  DELIVERY_WIZARD_ENTRY,
  primarySteps,
  nextStep,
  validateLlmApiKey,
  validateModelChoice,
} from "../../src/delivery-wizard.ts";

describe("HawkBrain tokens", () => {
  it("exposes core color tokens from design spec", () => {
    assert.equal(HAWK_TOKENS["--hawk-bg-primary"], "#080B0C");
    assert.equal(HAWK_TOKENS["--hawk-bg-card"], "#111719");
    assert.equal(HAWK_TOKENS["--hawk-bg-input"], "#1A2424");
    assert.equal(HAWK_TOKENS["--hawk-gold"], "#D6AD5C");
    assert.equal(HAWK_TOKENS["--hawk-text"], "#F3EFE5");
    assert.equal(HAWK_TOKENS["--hawk-teal"], "#39C7B0");
    assert.equal(HAWK_TOKENS["--hawk-text-secondary"], "#8A9494");
    assert.equal(HAWK_TOKENS["--hawk-error"], "#BE1D5D");
    assert.equal(HAWK_TOKENS["--hawk-warning"], "#F4A259");
  });

  it("has radius + font + 8px spacing", () => {
    assert.equal(HAWK_TOKENS["--hawk-radius-btn"], "8px");
    assert.equal(HAWK_TOKENS["--hawk-radius-card"], "12px");
    assert.match(HAWK_TOKENS["--hawk-font-mono"], /JetBrains Mono/);
    assert.equal(HAWK_TOKENS["--hawk-space-1"], "8px");
  });

  it("css block includes dark + light aliases", () => {
    const css = tokensToCssBlock();
    assert.match(css, /--hawk-gold:\s*#D6AD5C/);
    assert.match(css, /\.theme-zai-dark/);
    assert.match(css, /\.theme-zai-light/);
    assert.equal(HAWK_ALIAS_DARK["--primary"], "var(--hawk-gold)");
    assert.equal(HAWK_ALIAS_LIGHT["--primary"], "var(--hawk-gold)");
  });
});

describe("skin mode + 旧布局回退", () => {
  it("default is hawk; legacy persists", () => {
    const mem = new Map<string, string>();
    const ls = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    assert.equal(readSkinMode({ localStorage: ls }), "hawk");
    writeSkinMode("legacy", { localStorage: ls });
    assert.equal(readSkinMode({ localStorage: ls }), "legacy");
    writeSkinMode("hawk", { localStorage: ls });
    assert.equal(readSkinMode({ localStorage: ls }), "hawk");
  });

  it("applyHawkSkin toggles classes", () => {
    const classes = new Set<string>();
    const dataset: Record<string, string> = {};
    const fakeDoc = {
      documentElement: {
        classList: {
          toggle: (c: string, on: boolean) => {
            if (on) classes.add(c);
            else classes.delete(c);
          },
          contains: (c: string) => classes.has(c),
        },
        dataset,
        style: { setProperty: () => {} },
      },
      getElementById: () => null,
      createElement: () => ({ id: "", textContent: "" }),
      head: { appendChild: () => {} },
    };
    const mem = new Map<string, string>();
    const ls = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    const s1 = applyHawkSkin("hawk", { document: fakeDoc as never, localStorage: ls });
    assert.equal(s1.applied, true);
    assert.ok(classes.has(HAWK_CLASS));
    assert.equal(dataset.hawkSkin, "hawk");

    const s2 = applyHawkSkin("legacy", { document: fakeDoc as never, localStorage: ls });
    assert.ok(classes.has(LEGACY_CLASS));
    assert.ok(!classes.has(HAWK_CLASS));
    assert.equal(s2.mode, "legacy");
  });
});

describe("delivery wizard first-screen", () => {
  it("entry is first-screen visible primary CTA", () => {
    assert.equal(DELIVERY_WIZARD_ENTRY.visibleFirstScreen, true);
    assert.equal(DELIVERY_WIZARD_ENTRY.variant, "primary");
    assert.equal(DELIVERY_WIZARD_ENTRY.labelZh, "交付向导");
  });

  it("steps cover llmapi key / Auto / runtime / paths", () => {
    const ids = DELIVERY_WIZARD_STEPS.map((s) => s.id);
    assert.deepEqual(ids, [
      "welcome",
      "llmapi-key",
      "model-auto",
      "runtime-doctor",
      "paths",
      "finish",
    ]);
    assert.ok(primarySteps().length >= 3);
    assert.equal(nextStep("llmapi-key"), "model-auto");
    assert.equal(nextStep("finish"), null);
  });

  it("key + model validation (Auto default)", () => {
    assert.equal(validateLlmApiKey("").ok, false);
    assert.equal(validateLlmApiKey("as-abcdefghij").ok, false, "too short");
    assert.equal(validateLlmApiKey("as-" + "x".repeat(40)).ok, true);
    assert.equal(validateModelChoice(undefined).wire, "Auto");
    assert.equal(validateModelChoice("glm-5").wire, "Auto");
    assert.equal(validateModelChoice("mimo-v2.6-pro").wire, "mimo-v2.6-pro");
  });
});
