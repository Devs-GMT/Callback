/**
 * Inline formatting in the CV text: bold, italic and links.
 *
 * The CV stays plain text, which is what the ATS check, the re-check and the
 * suggestions all work on, so formatting is written as light markers that
 * read naturally even when they are not rendered:
 *
 *   **bold**     *italic*     [label](https://example.com)
 *
 * The renderers turn them into real bold, italic and clickable links; every
 * path that analyses the text strips them first with `stripInline`, so
 * formatting can never change a score.
 *
 * Contact details get links without any markers: an email address, a web
 * address or a LinkedIn / GitHub path in the header is made clickable.
 */

export type InlineRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
};

// Bold before italic so "**x**" is never read as two italics. Italic needs a
// non-space just inside each star, so "5 * 3" and a "* " bullet stay as they are.
const TOKEN = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*(?=\S)(.+?)(?<=\S)\*\*|\*(?=[^\s*])(.+?)(?<=[^\s*])\*/g;

/** Only web and mail links are kept; anything else is shown as plain text. */
export function safeHref(raw: string): string | undefined {
  const value = raw.trim();
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(value)) return value;
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  // "linkedin.com/in/jane" and "www.jane.dev" are written without a scheme.
  if (/^(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?$/i.test(value)) return `https://${value}`;
  return undefined;
}

export function parseInline(text: string, inherit: Omit<InlineRun, "text"> = {}): InlineRun[] {
  const runs: InlineRun[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) runs.push({ ...inherit, text: text.slice(last, at) });
    const [, label, url, bold, italic] = match;
    if (label !== undefined) {
      const href = safeHref(url);
      runs.push(...parseInline(label, href ? { ...inherit, href } : inherit));
    } else if (bold !== undefined) {
      runs.push(...parseInline(bold, { ...inherit, bold: true }));
    } else if (italic !== undefined) {
      runs.push(...parseInline(italic, { ...inherit, italic: true }));
    }
    last = at + match[0].length;
  }
  if (last < text.length) runs.push({ ...inherit, text: text.slice(last) });
  return runs.filter((run) => run.text.length > 0);
}

/** The text with its markers removed: what an ATS, a score or a copy sees. */
export function stripInline(text: string): string {
  return parseInline(text)
    .map((run) => run.text)
    .join("");
}

/** True when the text carries any formatting marker. */
export function hasInline(text: string): boolean {
  TOKEN.lastIndex = 0;
  return TOKEN.test(text);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** An email or web address on its own, as a link; a phone or a place is not. */
function addressHref(bit: string): string | undefined {
  if (EMAIL.test(bit)) return `mailto:${bit}`;
  if (/\s/.test(bit) || !/[a-z]/i.test(bit)) return undefined;
  return safeHref(bit);
}

/**
 * Header contact runs with clickable addresses: each "•"-separated bit that
 * is an email or a web address becomes a link to itself.
 */
export function contactRuns(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const run of parseInline(text)) {
    if (run.href) {
      runs.push(run);
      continue;
    }
    for (const piece of run.text.split(/(\s+[|•·]\s+)/)) {
      if (piece.length === 0) continue;
      const href = addressHref(piece.trim());
      runs.push(href ? { ...run, text: piece, href } : { ...run, text: piece });
    }
  }
  return runs;
}

/** Wrap the selection in a marker, or take it off when it is already there. */
export function toggleMarker(
  value: string,
  start: number,
  end: number,
  marker: "**" | "*",
): { value: string; start: number; end: number } {
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  const size = marker.length;

  // Already wrapped just outside the selection: unwrap.
  if (before.endsWith(marker) && after.startsWith(marker) && !(marker === "*" && before.endsWith("**") && after.startsWith("**"))) {
    return {
      value: before.slice(0, -size) + selected + after.slice(size),
      start: start - size,
      end: end - size,
    };
  }
  // The selection includes the markers: unwrap.
  if (selected.length > size * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(size, -size);
    return { value: before + inner + after, start, end: start + inner.length };
  }
  // Markers cannot hug spaces, so keep them inside the words.
  const lead = selected.match(/^\s*/)?.[0] ?? "";
  const trail = selected.match(/\s*$/)?.[0] ?? "";
  const core = selected.slice(lead.length, selected.length - trail.length);
  const text = core.length > 0 ? core : "text";
  return {
    value: `${before}${lead}${marker}${text}${marker}${trail}${after}`,
    start: start + lead.length + size,
    end: start + lead.length + size + text.length,
  };
}

/** Make the selection a link, or replace the link it is already part of. */
export function insertLink(
  value: string,
  start: number,
  end: number,
  url: string,
): { value: string; start: number; end: number } {
  const label = value.slice(start, end).trim() || url;
  const link = `[${label}](${url})`;
  return { value: value.slice(0, start) + link + value.slice(end), start, end: start + link.length };
}

/** Lines touched by the selection, bulleted or un-bulleted together. */
export function toggleBullets(
  value: string,
  start: number,
  end: number,
): { value: string; start: number; end: number } {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", Math.max(end - 1, start));
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(lineStart, lineEnd).split("\n");

  const marker = /^\s*(?:[-–—•·*▪◦‣]|\d{1,2}[.)])\s+/;
  const content = lines.filter((line) => line.trim().length > 0);
  const allBulleted = content.length > 0 && content.every((line) => marker.test(line));
  const next = lines.map((line) => {
    if (line.trim().length === 0) return line;
    return allBulleted ? line.replace(marker, "") : `• ${line.replace(marker, "")}`;
  });
  const replaced = next.join("\n");
  return {
    value: value.slice(0, lineStart) + replaced + value.slice(lineEnd),
    start: lineStart,
    end: lineStart + replaced.length,
  };
}
