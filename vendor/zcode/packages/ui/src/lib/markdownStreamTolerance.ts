/**
 * Streaming Markdown tolerance — prevent layout judder while the model is typing.
 * Close unclosed code fences and unbalanced strong emphasis for render-only preview.
 * Does NOT mutate the stored transcript; pass through completed messages unchanged.
 */

export interface StreamToleranceOptions {
  /** True while the assistant turn is still streaming. */
  streaming?: boolean;
}

export function tolerantMarkdown(source: string, opts: StreamToleranceOptions = {}): string {
  if (!opts.streaming) return source;
  let s = source;

  // 1) Unclosed code fence → close for render
  const fenceCount = (s.match(/^[ \t]*```/gm) || []).length;
  if (fenceCount % 2 === 1) {
    s += "\n```";
  }

  // 2) Unbalanced ** strong → soft-close (avoid swallowing rest of buffer)
  const strongOpens = (s.match(/\*\*/g) || []).length;
  if (strongOpens % 2 === 1) {
    const last = s.lastIndexOf("**");
    // only close if the tail after ** looks like an in-progress phrase
    const tail = s.slice(last + 2);
    if (tail.length < 200 && !tail.includes("\n\n")) {
      s = s.slice(0, last + 2) + tail + "**";
    }
  }

  // 3) Unclosed inline code ` during stream
  const ticks = (s.match(/(?<!`)`(?!`)/g) || []).length;
  if (ticks % 2 === 1) {
    s += "`";
  }

  return s;
}
