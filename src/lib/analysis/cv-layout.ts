/**
 * Turning the improved CV's lines into a tidy, ATS-friendly structure.
 *
 * `applySuggestions` works on raw lines so that changes land exactly where the
 * original text was. That keeps whatever mess the CV arrived with: headings in
 * mixed case, "Skills: SQL, Python" run together on one line, three different
 * bullet characters, stray blank lines. This module reads those lines into
 * name, contact block and sections, so the preview, the plain-text copy and
 * the .docx can all present the same clean single-column layout.
 *
 * It only reorganises; it never rewrites a word. Every line keeps its
 * `changed` flag, so highlighting survives the restructuring.
 */

import type { CvSegment } from "@/lib/analysis/apply";

export type CvLineKind =
  /** A plain paragraph line. */
  | "text"
  /** A bullet point, marker stripped. */
  | "bullet"
  /** A role, degree or project line that introduces the bullets under it. */
  | "entry"
  /** A paragraph break worth keeping, such as between two jobs. */
  | "gap";

/**
 * An entry line read into its parts, so a template can set the role in bold
 * and push the dates to the right margin. `text` on the line stays the whole
 * original string; this is a reading of it, not a replacement.
 */
export type CvEntryParts = {
  title: string;
  org?: string;
  dates?: string;
};

export type CvLine = {
  kind: CvLineKind;
  text: string;
  changed: boolean;
  replaced?: string;
  /** Only on `entry` lines. */
  parts?: CvEntryParts;
};

export type CvSection = {
  /** Display heading, upper-cased. */
  heading: string;
  changed: boolean;
  lines: CvLine[];
};

export type CvLayout = {
  name?: CvLine;
  /** The one-line professional title under the name: "Junior Data Analyst". */
  headline?: CvLine;
  /** Contact lines under the headline, usually one joined line. */
  contact: CvLine[];
  sections: CvSection[];
};

const SECTION_NAMES =
  "summary|professional\\s+summary|profile|professional\\s+profile|about\\s+me|objective|career\\s+objective|personal\\s+statement|experience|work\\s+experience|professional\\s+experience|relevant\\s+experience|employment(?:\\s+history)?|work\\s+history|career\\s+history|education|academic\\s+background|qualifications|skills|key\\s+skills|technical\\s+skills|core\\s+competenc(?:y|ies)|competencies|technologies|tech\\s+stack|projects|certifications?|licen[cs]es(?:\\s+(?:and|&)\\s+certifications)?|languages|interests|hobbies|references|awards|achievements|publications|volunteering|volunteer\\s+experience|training|courses";

/** A line that is only a known section name, optionally with a colon. */
const KNOWN_HEADING = new RegExp(`^(?:${SECTION_NAMES})\\s*:?\\s*$`, "i");

/** "Skills: SQL, Python" — a known section name with its content inline. */
const INLINE_HEADING = new RegExp(`^(${SECTION_NAMES})\\s*:\\s*(.+)$`, "i");

export const BULLET_MARKER = /^\s*(?:[-–—•·*▪◦‣]|\d{1,2}[.)])\s+/;

const CONTACT_HINT =
  /@|https?:\/\/|www\.|linkedin|github|portfolio|\+?\d[\d\s().-]{6,}\d/i;

/** "London, UK" or "Jakarta Selatan, Indonesia": a place, not a headline. */
const LOCATION = /^[\p{L}][\p{L} .'’-]*,\s*[\p{L}][\p{L} .'’-]*$/u;

// English and Indonesian month names, full and short.
const MONTH =
  "jan(?:uary|uari)?|feb(?:ruary|ruari)?|mar(?:ch|et)?|apr(?:il)?|ma[yi]|jun(?:e|i)?|jul(?:y|i)?|aug(?:ust)?|agu(?:stus)?|agt|sep(?:t(?:ember)?)?|o[ck]t(?:ober)?|nov(?:ember)?|de[cs](?:ember)?";
const PRESENT = "present|current|now|today|ongoing|sekarang|saat\\s+ini";
const DATE = `(?:(?:${MONTH})\\.?\\s+)?(?:19|20)\\d{2}|\\d{1,2}[/.](?:19|20)\\d{2}`;
const DATE_RANGE = `(?:${DATE})(?:\\s*(?:-|–|—|to|until|sampai|hingga|s\\.?d\\.?)\\s*(?:${DATE}|${PRESENT}))?`;

/**
 * Dates at the end of a line, set off by a comma, pipe, spaced dash, tab, a
 * run of spaces or brackets. "Graduated in 2020" has no separator, so prose
 * that happens to end on a year is left alone.
 */
const TRAILING_DATES = new RegExp(
  `(?:\\s*[,|·•]\\s*|\\s+[-–—]\\s+|\\t+|\\s{2,}|\\s*\\(\\s*)(${DATE_RANGE})\\s*\\)?\\s*$`,
  "i",
);

/** Between role and organisation, in the order they are trusted. */
const ENTRY_SEPARATORS = [/\s+\|\s+/, /\s+[–—]\s+/, /\s+-\s+/, /\s*,\s+/, /\s+at\s+/i, /\s+di\s+/i];

/**
 * Read "Data Analyst, Acme Retail, 2021 - 2024" into title, org and dates.
 * Returns undefined when there is nothing to split, so the caller can keep
 * the line as written.
 */
export function splitEntry(text: string): CvEntryParts | undefined {
  const trimmed = text.trim();
  let rest = trimmed;
  let dates: string | undefined;

  const match = trimmed.match(TRAILING_DATES);
  if (match && match.index !== undefined && match.index > 0) {
    dates = match[1].replace(/\s*(-|–|—)\s*/, " – ").replace(/\s+/g, " ");
    rest = trimmed.slice(0, match.index).replace(/[\s,|·•–—-]+$/, "");
  }
  if (rest.length === 0) return undefined;

  for (const separator of ENTRY_SEPARATORS) {
    const at = rest.search(separator);
    if (at > 0) {
      const sep = rest.slice(at).match(separator)?.[0] ?? "";
      const org = rest.slice(at + sep.length).trim();
      if (org.length > 0) return { title: rest.slice(0, at).trim(), org, dates };
    }
  }
  return dates ? { title: rest, dates } : undefined;
}

/** Does this line read as a section heading? */
export function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 48) return false;
  if (BULLET_MARKER.test(line)) return false;
  if (KNOWN_HEADING.test(trimmed)) return true;

  // A short all-caps line with no sentence punctuation is a heading too.
  const letters = trimmed.replace(/[^\p{L}]/gu, "");
  return (
    letters.length >= 3 &&
    letters === letters.toUpperCase() &&
    !/[.!?,;@]$/.test(trimmed) &&
    !CONTACT_HINT.test(trimmed)
  );
}

function headingText(raw: string): string {
  return raw.trim().replace(/\s*:$/, "").replace(/\s+/g, " ").toUpperCase();
}

/** Split a single segment into the heading and/or content lines it holds. */
function classify(
  segment: CvSegment,
): Array<{ heading: string } | { line: CvLine }> {
  const raw = segment.text;
  const trimmed = raw.trim();
  const base = { changed: segment.changed, replaced: segment.replaced };

  if (trimmed.length === 0) return [{ line: { kind: "gap", text: "", ...base } }];
  if (isHeading(raw)) return [{ heading: headingText(trimmed) }];

  const inline = trimmed.match(INLINE_HEADING);
  if (inline) {
    return [
      { heading: headingText(inline[1]) },
      { line: { kind: "text", text: inline[2].trim(), ...base } },
    ];
  }

  if (BULLET_MARKER.test(raw)) {
    return [{ line: { kind: "bullet", text: raw.replace(BULLET_MARKER, "").trim(), ...base } }];
  }
  return [{ line: { kind: "text", text: trimmed.replace(/\s+/g, " "), ...base } }];
}

/** Drop leading, trailing and repeated gaps, and mark entry lines. */
function tidy(lines: CvLine[]): CvLine[] {
  const out: CvLine[] = [];
  for (const line of lines) {
    if (line.kind === "gap" && (out.length === 0 || out[out.length - 1].kind === "gap")) {
      continue;
    }
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1].kind === "gap") out.pop();

  // A short plain line directly above a bullet introduces it: "Data Analyst,
  // Acme Retail, 2021 to 2024". Making it an entry lets it be set in bold. A
  // short line ending in dates is one too, even with no bullets under it, which
  // is how most education lines look.
  return out.map((line, index) => {
    if (line.kind !== "text" || line.text.length > 120) return line;
    const parts = splitEntry(line.text);
    const introducesBullets = out[index + 1]?.kind === "bullet";
    const datedLine = parts?.dates !== undefined && !/[.!?;]$/.test(line.text);
    return introducesBullets || datedLine ? { ...line, kind: "entry", parts } : line;
  });
}

export function layoutCv(segments: CvSegment[]): CvLayout {
  const parts = segments.flatMap(classify);
  const firstHeading = parts.findIndex((part) => "heading" in part);
  const preamble = (firstHeading === -1 ? parts : parts.slice(0, firstHeading))
    .map((part) => ("line" in part ? part.line : null))
    .filter((line): line is CvLine => line !== null);

  // The opening block, up to the first blank line, is the name and contact
  // details. Anything after it but before the first heading is an unlabelled
  // profile paragraph, which gets the heading an ATS looks for.
  const firstContent = preamble.findIndex((line) => line.kind !== "gap");
  const content = firstContent === -1 ? [] : preamble.slice(firstContent);
  const breakAt = content.findIndex((line) => line.kind === "gap");
  const opening = (breakAt === -1 ? content : content.slice(0, breakAt)).filter(
    (line) => line.kind !== "gap",
  );
  const profile = breakAt === -1 ? [] : content.slice(breakAt + 1);

  const [nameLine, ...rest] = opening;
  const looksLikeName =
    nameLine !== undefined &&
    nameLine.kind === "text" &&
    nameLine.text.length <= 60 &&
    !CONTACT_HINT.test(nameLine.text) &&
    !/[.!?]$/.test(nameLine.text);

  const headerLines = looksLikeName ? rest : opening;
  const others = headerLines.filter((line) => !CONTACT_HINT.test(line.text));

  // The first line that is neither contact detail nor place is the headline.
  const headlineIndex = looksLikeName
    ? others.findIndex((line) => line.text.length <= 80 && !LOCATION.test(line.text))
    : -1;
  const headline = headlineIndex === -1 ? undefined : others[headlineIndex];
  const remaining = others.filter((_, index) => index !== headlineIndex);

  // Short leftovers (a city) join the contact details; anything longer keeps
  // its own line rather than being squeezed in.
  const joinable = (line: CvLine) => CONTACT_HINT.test(line.text) || line.text.length <= 40;
  const contactBits = headerLines.filter(
    (line) => line !== headline && joinable(line),
  );
  const contact: CvLine[] = remaining.filter((line) => !joinable(line));
  if (contactBits.length > 0) {
    // One "city | email | phone | link" line is what most parsers and
    // recruiters expect, and it saves the vertical space a stacked block wastes.
    contact.push({
      kind: "text",
      text: contactBits.map((line) => line.text).join("  |  "),
      changed: contactBits.some((line) => line.changed),
    });
  }

  const sections: CvSection[] = [];
  const profileLines = tidy(profile);
  if (profileLines.length > 0) {
    sections.push({
      heading: "PROFILE",
      changed: profileLines.some((line) => line.changed),
      lines: profileLines,
    });
  }

  if (firstHeading !== -1) {
    let current: CvSection | null = null;
    for (const part of parts.slice(firstHeading)) {
      if ("heading" in part) {
        current = { heading: part.heading, changed: false, lines: [] };
        sections.push(current);
      } else if (current) {
        current.lines.push(part.line);
      }
    }
    for (const section of sections) section.lines = tidy(section.lines);
  }

  return {
    name: looksLikeName ? { ...nameLine, kind: "text" } : undefined,
    headline,
    contact,
    // A heading with nothing under it is noise, usually a stray label.
    sections: sections.filter((section) => section.lines.length > 0),
  };
}

/**
 * The layout as plain text, for copying, editing and the re-check.
 *
 * Plain text cannot carry a ruled divider an ATS will ignore, so sections are
 * separated the way parsers read most reliably: an upper-case heading on its
 * own line with a blank line before it. Bullets share one marker.
 */
export function layoutToText(layout: CvLayout): string {
  const blocks: string[] = [];

  const head = [
    layout.name?.text,
    layout.headline?.text,
    ...layout.contact.map((line) => line.text),
  ].filter(
    (value): value is string => Boolean(value),
  );
  if (head.length > 0) blocks.push(head.join("\n"));

  for (const section of layout.sections) {
    const body = section.lines.map((line) =>
      line.kind === "bullet" ? `• ${line.text}` : line.text,
    );
    blocks.push([section.heading, ...body].join("\n"));
  }

  return blocks.join("\n\n");
}

/** Lay out a plain string, for text the user has edited by hand. */
export function layoutText(text: string): CvLayout {
  return layoutCv(text.split("\n").map((line) => ({ text: line, changed: false })));
}
