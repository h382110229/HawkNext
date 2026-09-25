import type { ReactNode } from "react";

/**
 * GitHub / Cursor style Callout for `> [!NOTE]` / `> [!TIP]` / `> [!WARNING]` blockquotes.
 * Map through Streamdown `blockquote` component override.
 */
export type CalloutKind = "note" | "tip" | "warning" | "important" | "caution";

const KIND_META: Record<CalloutKind, { label: string; accent: string; bg: string }> = {
  note: { label: "NOTE", accent: "#39C7B0", bg: "rgba(57,199,176,0.10)" },
  tip: { label: "TIP", accent: "#D6AD5C", bg: "rgba(214,173,92,0.10)" },
  warning: { label: "WARNING", accent: "#F4A259", bg: "rgba(244,162,89,0.10)" },
  important: { label: "IMPORTANT", accent: "#F4A259", bg: "rgba(244,162,89,0.10)" },
  caution: { label: "CAUTION", accent: "#F4A259", bg: "rgba(244,162,89,0.10)" },
};

export function detectCalloutKind(children: ReactNode): CalloutKind | null {
  const raw = extractText(children);
  const m = /\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/i.exec(raw);
  if (!m) return null;
  return m[1]!.toLowerCase() as CalloutKind;
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    return extractText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

export function stripCalloutMarker(children: ReactNode): ReactNode {
  const raw = extractText(children);
  const cleaned = raw.replace(/\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/i, "");
  return cleaned;
}

export function MarkdownCallout({
  kind,
  children,
}: {
  kind: CalloutKind;
  children: ReactNode;
}) {
  const meta = KIND_META[kind] ?? KIND_META.note;
  return (
    <div
      className="hawk-callout"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 8,
        margin: "0 0 12px",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #1A2424",
        borderLeft: `3px solid ${meta.accent}`,
        background: meta.bg,
      }}
    >
      <div aria-hidden style={{ lineHeight: 1.4 }}>
        💡
      </div>
      <div>
        <div
          style={{
            font: "600 11px/1.4 Inter, sans-serif",
            letterSpacing: "0.06em",
            color: meta.accent,
            marginBottom: 4,
          }}
        >
          {meta.label}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}
