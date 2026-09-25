#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/app-shell/WorkflowArtifactSidePane.tsx";
let s = readFileSync(p, "utf8");

if (s.includes("HAWK_REVEAL_MANAGER")) {
  console.log("already");
  process.exit(0);
}

if (!s.includes("useFileContextActions")) {
  s = s.replace(
    'import { useHawkNextIntl } from "@/i18n/IntlProvider.js";',
    'import { useHawkNextIntl } from "@/i18n/IntlProvider.js";\nimport { useFileContextActions } from "@/hooks/useFileContextActions.js"; // HAWK_REVEAL_MANAGER',
  );
}

// add ExternalLinkIcon to lucide import
const reLucide = /import \{([^}]+)\} from "lucide-react";/;
if (reLucide.test(s) && !s.includes("ExternalLinkIcon")) {
  s = s.replace(reLucide, (_f, names) => {
    return `import {${names.trimEnd().replace(/,\s*$/, "")}, ExternalLinkIcon } from "lucide-react";`;
  });
}

const reBtn =
  /\{localSourcePath !== undefined && onRevealFileInTree !== undefined \? \(\s*<Button\s+data-testid="workflow-artifact-reveal"[\s\S]*?<\/Button>\s*\) : null\}/;

if (!reBtn.test(s)) {
  console.error("reveal btn regex missing");
  const i = s.indexOf("workflow-artifact-reveal");
  console.log(JSON.stringify(s.slice(i - 80, i + 200)));
  process.exit(1);
}

s = s.replace(
  reBtn,
  (m) => `${m}
            {localSourcePath !== undefined && fileActions.canRevealInFileManager({ path: localSourcePath }) ? (
              <Button
                data-testid="workflow-artifact-reveal-manager"
                onClick={() => void fileActions.revealInFileManager({ path: localSourcePath })}
                size="sm"
                type="button"
                variant="ghost"
                title={intl.formatMessage({ id: "git.changeContext.revealInFileManager" })}
              >
                <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
                {intl.formatMessage({ id: "git.changeContext.revealInFileManager" })}
              </Button>
            ) : null} // HAWK_REVEAL_MANAGER`,
);

// inject fileActions near intl
const idx = s.indexOf("const { intl } = useHawkNextIntl();");
if (idx < 0) {
  console.error("intl missing");
  process.exit(1);
}
const insertAt = idx + "const { intl } = useHawkNextIntl();".length;
s =
  s.slice(0, insertAt) +
  `\n  const fileActions = useFileContextActions({ canOpenLocalFileManager: true }); // HAWK_REVEAL_MANAGER` +
  s.slice(insertAt);

writeFileSync(p, s, "utf8");
console.log("reveal manager wired");
