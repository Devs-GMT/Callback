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
import { stripInline } from "@/lib/analysis/inline";

export type CvLineKind =
  /** A plain paragraph line. */
  | "text"
  /** A bullet point, marker stripped. */
  | "bullet"
  /** A role, degree or project line that introduces the bullets under it. */
  | "entry"
  /** The job title on its own line under an employer entry, set in italics. */
  | "subtitle"
  /** A paragraph break worth keeping, such as between two jobs. */
  | "gap";

/**
 * An entry line read into its parts, so a template can set the role in bold
 * and push the dates to the right margin. `text` on the line stays the whole
 * original string; this is a reading of it, not a replacement.
 */
export type CvEntryParts = {
  /** "|" when the CV split role and organisation with a pipe, kept on print. */
  separator?: "|";
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
  /** A header line of profile links, set in the accent colour. */
  links?: boolean;
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

/**
 * "Web3 Projects", "Relevant Experience", "Technical Skills": a section word
 * after one or two capitalised qualifiers.
 */
const QUALIFIED_HEADING =
  /^(?:\S+\s+){1,2}(?:projects|experience|skills|certifications?|courses|awards|achievements|publications)\s*:?\s*$/i;

/** "Skills: SQL, Python" — a known section name with its content inline. */
const INLINE_HEADING = new RegExp(`^(${SECTION_NAMES})\\s*:\\s*(.+)$`, "i");

export const BULLET_MARKER = /^\s*(?:[-–—•·*▪◦‣]|\d{1,2}[.)])\s+/;

const CONTACT_HINT =
  /@|https?:\/\/|www\.|linkedin|github|portfolio|\+?\d[\d\s().-]{6,}\d/i;

/** A profile link: LinkedIn, GitHub, a portfolio or any bare web address. */
const PROFILE_LINK = /https?:\/\/|www\.|linkedin|github|gitlab|behance|dribbble|portfolio|^[\w-]+(?:\.[\w-]+)+\/\S*$/i;

/** Separators people already put between contact details on one line. */
const CONTACT_SEPARATOR = /\s+[|•·]\s+|\s{3,}|\t+/;

/** How contact details are joined on the printed line. */
export const CONTACT_JOIN = "  •  ";

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

/**
 * A whole date range after a single space: "Indonesia Mar 2026 – Jun 2026".
 * Only a full range qualifies, so "Graduated in 2020" stays prose.
 */
const TRAILING_RANGE = new RegExp(
  `\\s+((?:${DATE})\\s*(?:-|–|—|to|until|sampai|hingga|s\\.?d\\.?)\\s*(?:${DATE}|${PRESENT}))\\s*$`,
  "i",
);

/** Between role and organisation, in the order they are trusted. */
const ENTRY_SEPARATORS = [/\s*\|\s*/, /\s+[–—]\s+/, /\s+-\s+/, /\s*,\s+/, /\s+at\s+/i, /\s+di\s+/i];

/** What sits between the title and the organisation on print. */
export function orgPrefix(parts: CvEntryParts): string {
  return parts.separator === "|" ? " | " : ", ";
}

/**
 * Read "Data Analyst, Acme Retail, 2021 - 2024" into title, org and dates.
 * Returns undefined when there is nothing to split, so the caller can keep
 * the line as written.
 */
export function splitEntry(text: string): CvEntryParts | undefined {
  const trimmed = text.trim();
  let rest = trimmed;
  let dates: string | undefined;

  const match = trimmed.match(TRAILING_RANGE) ?? trimmed.match(TRAILING_DATES);
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
      if (org.length > 0) {
        const parts: CvEntryParts = { title: rest.slice(0, at).trim(), org, dates };
        if (sep.includes("|")) parts.separator = "|";
        return parts;
      }
    }
  }
  return dates ? { title: rest, dates } : undefined;
}

/** Does this line read as a section heading? */
export function isHeading(line: string): boolean {
  // "**SKILLS**" is still the Skills heading.
  const trimmed = stripInline(line).trim();
  if (trimmed.length === 0 || trimmed.length > 48) return false;
  if (BULLET_MARKER.test(line)) return false;
  if (KNOWN_HEADING.test(trimmed)) return true;
  // "GPA: 3.81/4.00" is a label with its value, not a heading.
  if (/:\s*\S/.test(trimmed)) return false;
  if (
    QUALIFIED_HEADING.test(trimmed) &&
    trimmed.split(/\s+/).every((word) => /^[\p{Lu}\d]/u.test(word))
  ) {
    return true;
  }

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
  return stripInline(raw).trim().replace(/\s*:$/, "").replace(/\s+/g, " ").toUpperCase();
}

type Part = { heading: string; source: string; base: Pick<CvLine, "changed" | "replaced"> } | { line: CvLine };

/** Split a single segment into the heading and/or content lines it holds. */
function classify(segment: CvSegment): Part[] {
  const raw = segment.text;
  const trimmed = raw.trim();
  const base = { changed: segment.changed, replaced: segment.replaced };

  if (trimmed.length === 0) return [{ line: { kind: "gap", text: "", ...base } }];
  if (isHeading(raw)) return [{ heading: headingText(trimmed), source: trimmed, base }];

  const inline = trimmed.match(INLINE_HEADING);
  if (inline) {
    return [
      { heading: headingText(inline[1]), source: inline[1], base },
      { line: { kind: "text", text: inline[2].trim(), ...base } },
    ];
  }

  if (BULLET_MARKER.test(raw)) {
    return [{ line: { kind: "bullet", text: raw.replace(BULLET_MARKER, "").trim(), ...base } }];
  }
  return [{ line: { kind: "text", text: trimmed.replace(/\s+/g, " "), ...base } }];
}

/**
 * Is `next` the rest of `previous`, broken only by the width of the page the
 * text was copied from? PDFs hard-wrap every line, so a bullet often arrives
 * as two: "…tokenization and on-chain" then "workflows.".
 */
function continues(previous: CvLine, next: CvLine): boolean {
  if (next.kind !== "text" || (previous.kind !== "text" && previous.kind !== "bullet")) return false;
  if (/[\p{L}\d]-$/u.test(previous.text)) return true;
  if (/[.!?:]$/.test(previous.text)) return false;
  if (/^\p{Ll}/u.test(next.text)) return true;
  // A long line stopped mid-phrase was wrapped by the page, even when the next
  // word is capitalised: "…Decentralized Systems, Database" / "Systems, …".
  return previous.text.length >= 95 && splitEntry(next.text)?.dates === undefined;
}

function join(previous: CvLine, next: CvLine): CvLine {
  // "full-" + "stack" stays "full-stack"; anything else joins with a space.
  const glue = /[\p{L}\d]-$/u.test(previous.text) ? "" : " ";
  return {
    ...previous,
    text: `${previous.text}${glue}${next.text}`,
    changed: previous.changed || next.changed,
  };
}

/** Drop leading, trailing and repeated gaps, rejoin wrapped lines, and mark entries. */
function tidy(lines: CvLine[]): CvLine[] {
  const out: CvLine[] = [];
  for (const line of lines) {
    if (line.kind === "gap" && (out.length === 0 || out[out.length - 1].kind === "gap")) {
      continue;
    }
    const last = out[out.length - 1];
    if (last && continues(last, line)) {
      out[out.length - 1] = join(last, line);
      continue;
    }
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1].kind === "gap") out.pop();

  // A short plain line directly above a bullet introduces it: "Data Analyst,
  // Acme Retail, 2021 to 2024". Making it an entry lets it be set in bold. A
  // short line ending in dates is one too, even with no bullets under it, which
  // is how most education lines look.
  const marked = out.map((line, index): CvLine => {
    if (line.kind !== "text" || line.text.length > 120) return line;
    const parts = splitEntry(line.text);
    const introducesBullets = out[index + 1]?.kind === "bullet";
    const datedLine = parts?.dates !== undefined && !/[.!?;]$/.test(line.text);
    return introducesBullets || datedLine ? { ...line, kind: "entry", parts } : line;
  });

  // "PT Javas Technology | Yogyakarta   Mar 2026 – Jun 2026" over "Full-Stack
  // Developer Intern": the second line is the job title, not a second entry.
  return marked.map((line, index) => {
    const above = marked[index - 1];
    const isTitle =
      line.kind === "entry" &&
      line.parts?.dates === undefined &&
      line.text.length <= 70 &&
      !/[|,:;]/.test(line.text) &&
      above?.kind === "entry" &&
      above.parts?.dates !== undefined;
    return isTitle ? { ...line, kind: "subtitle", parts: undefined } : line;
  });
}

/** A heading that is a known section name, not just a line in capitals. */
const isKnownHeading = (text: string) =>
  KNOWN_HEADING.test(text) || INLINE_HEADING.test(text) || QUALIFIED_HEADING.test(text);

/**
 * Many CVs set the name and headline in capitals ("BAYU PUTRA", "BACKEND
 * DEVELOPER"), which read like headings. A capitals line above the contact
 * details that is not a known section name is part of the header instead.
 */
function demoteHeaderCaps(parts: Part[]): Part[] {
  const contactAt = parts.findIndex(
    (part, index) => index < 8 && "line" in part && CONTACT_HINT.test(part.line.text),
  );
  if (contactAt === -1) return parts;
  return parts.map((part, index) =>
    index < contactAt && "heading" in part && !isKnownHeading(part.source)
      ? { line: { kind: "text", text: part.source.replace(/\s+/g, " "), ...part.base } }
      : part,
  );
}

export function layoutCv(segments: CvSegment[]): CvLayout {
  const parts = demoteHeaderCaps(segments.flatMap(classify));
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
    stripInline(nameLine.text).length <= 60 &&
    !CONTACT_HINT.test(nameLine.text) &&
    !/[.!?]$/.test(stripInline(nameLine.text));

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
    // One "city • phone • email" line, then the profile links on their own
    // line, is what most parsers and recruiters expect, and it saves the
    // vertical space a stacked block wastes.
    const changed = contactBits.some((line) => line.changed);
    const bits = contactBits.flatMap((line) =>
      line.text.split(CONTACT_SEPARATOR).map((bit) => bit.trim()).filter(Boolean),
    );
    const details = bits.filter((bit) => !PROFILE_LINK.test(bit) || bit.includes("@"));
    const links = bits.filter((bit) => PROFILE_LINK.test(bit) && !bit.includes("@"));
    if (details.length > 0) contact.push({ kind: "text", text: details.join(CONTACT_JOIN), changed });
    if (links.length > 0) contact.push({ kind: "text", text: links.join(CONTACT_JOIN), changed, links: true });
  }

  const sections: CvSection[] = [];
  const profileLines = tidy(profile);
  if (profileLines.length > 0) {
    sections.push({
      heading: "PROFESSIONAL SUMMARY",
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

/* -------------------------------------------------------------------------- */
/* Section edits                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Move a section to a new place. Works on the text, so the change is part of
 * the CV the user copies, downloads and re-checks.
 */
export function moveSection(text: string, from: number, to: number): string {
  const layout = layoutText(text);
  const sections = [...layout.sections];
  if (from < 0 || from >= sections.length || to < 0 || to >= sections.length) return text;
  const [moved] = sections.splice(from, 1);
  sections.splice(to, 0, moved);
  return layoutToText({ ...layout, sections });
}

/**
 * A heading as typed, cleaned so it still reads as a heading on the next
 * layout: capitals, no colon, at least three letters. Undefined when unusable.
 */
export function cleanHeading(value: string): string | undefined {
  const heading = stripInline(value).replace(/[:\n]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  return heading.replace(/[^\p{L}]/gu, "").length >= 3 && heading.length <= 48 ? heading : undefined;
}

export function renameSection(text: string, index: number, heading: string): string {
  const clean = cleanHeading(heading);
  const layout = layoutText(text);
  if (!clean || !layout.sections[index]) return text;
  const sections = layout.sections.map((section, i) => (i === index ? { ...section, heading: clean } : section));
  return layoutToText({ ...layout, sections });
}

/** The layout with the sections the user has hidden left out. */
export function withoutSections(layout: CvLayout, hidden: readonly string[]): CvLayout {
  if (hidden.length === 0) return layout;
  return { ...layout, sections: layout.sections.filter((section) => !hidden.includes(section.heading)) };
}
