import type { ReactNode } from "react";
import {
  detectCalloutKind,
  MarkdownCallout,
  stripCalloutMarker,
} from "./markdown-callout.js";

/**
 * Blockquote renderer — GitHub/Cursor callouts (`> [!NOTE]`) + default quote.
 * Used as Streamdown `blockquote` component override in message.tsx.
 */
export function MarkdownBlockquote({
  children,
  className,
  ...rest
}: {
  children?: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLQuoteElement>) {
  const kind = detectCalloutKind(children);
  if (kind) {
    return <MarkdownCallout kind={kind}>{stripCalloutMarker(children)}</MarkdownCallout>;
  }
  return (
    <blockquote
      className={className}
      style={{
        borderLeft: "3px solid #D6AD5C",
        margin: "0 0 12px",
        padding: "4px 0 4px 12px",
        fontStyle: "italic",
        color: "#8A9494",
        background: "rgba(8,11,12,0.5)",
      }}
      {...rest}
    >
      {children}
    </blockquote>
  );
}
