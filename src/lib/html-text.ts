/**
 * HTML to plain text.
 *
 * Shared by the server-side link reader and the browser-side DOCX importer:
 * mammoth converts a .docx to HTML, and job pages arrive as HTML, so both
 * paths need the same conversion to text that keeps line and bullet structure
 * intact. Deliberately dependency-free and DOM-free so it runs in a route
 * handler and in the browser without change.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  bull: "•",
  middot: "·",
  times: "×",
  trade: "™",
  reg: "®",
  copy: "©",
  euro: "€",
  pound: "£",
  deg: "°",
  frac12: "½",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity) => {
    if (entity.startsWith("#")) {
      const isHex = entity[1] === "x" || entity[1] === "X";
      const code = parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Elements whose contents are never page text. */
const DROP_ELEMENTS =
  /<(script|style|noscript|template|svg|canvas|iframe|form|select|button|nav|footer|aside|header)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Self-closing or unmatched versions of the same. */
const DROP_SINGLE = /<(?:br|hr|img|input|source|track|meta|link)\b[^>]*\/?>/gi;

/** Block-level tags, converted to line breaks so paragraphs survive. */
const BLOCK_BOUNDARY =
  /<\/?(p|div|section|article|main|ul|ol|li|dl|dt|dd|table|thead|tbody|tr|td|th|h1|h2|h3|h4|h5|h6|blockquote|pre|figure|figcaption|address)\b[^>]*>/gi;

/** Convert an HTML fragment to plain text, keeping line structure. */
export function htmlToText(html: string): string {
  let text = html;

  text = text.replace(DROP_ELEMENTS, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  // A list item becomes a bullet so job requirement lists stay scannable, and
  // so the CV bullet detector recognises them on a CV page.
  text = text.replace(/<li\b[^>]*>/gi, "\n• ");
  text = text.replace(/<br\b[^>]*\/?>/gi, "\n");
  text = text.replace(BLOCK_BOUNDARY, "\n");
  text = text.replace(DROP_SINGLE, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
