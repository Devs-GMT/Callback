/**
 * Applying accepted suggestions to the CV.
 *
 * PRD section 2 step 4 wants an "Improved CV" that is editable text with the
 * accepted changes applied and highlighted. That means the result cannot be a
 * plain string: the UI has to know which parts changed, and the re-check has
 * to score the finished text.
 *
 * So this works line by line and returns both. Line-based rather than string
 * surgery because a CV's structure lives in its line breaks — replacing a
 * bullet is a line operation, and a naive `replace` on a short bullet can hit
 * the wrong occurrence or straddle a line boundary.
 *
 * Two kinds are never applied automatically:
 *   - `keywords`, because PRD section 3 only allows a keyword in if the user
 *     confirms it is true of them. Writing it in for them would be the exact
 *     invention the product promises not to do.
 *   - `gap`, which is advice about what to go and do, not CV text.
 */

import { isHeading } from "@/lib/analysis/cv-layout";
import type { Suggestion, SuggestionDecision } from "@/lib/types";

export type CvSegment = {
  text: string;
  /** True when this line was added or rewritten by a suggestion. */
  changed: boolean;
  /** Set on a changed line, for the "why did this change" affordance. */
  suggestionId?: string;
  /** The text this line replaced, for the before/after view. */
  replaced?: string;
};

export type AppliedCv = {
  /** The improved CV as plain text, ready to copy, export or re-check. */
  text: string;
  segments: CvSegment[];
  /** Suggestions that were accepted but could not be located in the CV. */
  unapplied: Suggestion[];
};

/** Suggestion kinds that change the CV text. */
const APPLICABLE = new Set<Suggestion["kind"]>(["rewrite", "summary", "cut", "moveup"]);

export function isApplicable(suggestion: Suggestion): boolean {
  return APPLICABLE.has(suggestion.kind);
}

/** Compare two lines ignoring case, whitespace and bullet markers. */
function normaliseForMatch(line: string): string {
  return line
    .replace(/^\s*(?:[-–—•·*▪◦‣]|\d{1,2}[.)])\s+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Recover the bullet marker and indentation of an original line. */
function leadingMarker(line: string): string {
  return line.match(/^\s*(?:[-–—•·*▪◦‣]|\d{1,2}[.)])\s+/)?.[0] ?? "";
}

/**
 * Find the line a suggestion's `before` refers to.
 *
 * Exact-ish match first, then a containment fallback: models sometimes quote a
 * bullet having dropped its trailing full stop or tidied a double space, and
 * losing the change over that would be worse than accepting a close match.
 */
function findLine(lines: string[], before: string, taken: Set<number>): number {
  const needle = normaliseForMatch(before);
  if (needle.length === 0) return -1;

  // Headings are structure, not content: a suggestion never rewrites, cuts or
  // moves one, or the sections around it lose their label.
  for (let i = 0; i < lines.length; i += 1) {
    if (taken.has(i) || isHeading(lines[i])) continue;
    if (normaliseForMatch(lines[i]) === needle) return i;
  }

  // Only fall back for quotes long enough that containment is meaningful.
  if (needle.length >= 25) {
    for (let i = 0; i < lines.length; i += 1) {
      if (taken.has(i) || isHeading(lines[i])) continue;
      const candidate = normaliseForMatch(lines[i]);
      // A blank or near-blank line must not match: `needle.includes("")` is
      // always true, so without this floor every quote would anchor to the
      // first empty line in the CV.
      if (candidate.length < 25) continue;
      if (candidate.includes(needle) || needle.includes(candidate)) return i;
    }
  }

  return -1;
}

const SUMMARY_HEADING =
  /^\s*(summary|professional\s+summary|profile|about\s+me|objective|career\s+objective|personal\s+statement)\s*:?\s*$/i;

/** The heading a new summary gets when the CV has none. */
const NEW_SUMMARY_HEADING = "PROFESSIONAL SUMMARY";

/**
 * Where a new summary belongs: replacing the body under an existing summary
 * heading, or, when there is none, under a new heading placed just before the
 * first section, which is where the header ends.
 */
function summaryTarget(lines: string[]): {
  insertAt: number;
  replaceCount: number;
  needsHeading: boolean;
} {
  const headingIndex = lines.findIndex((line) => SUMMARY_HEADING.test(line));

  if (headingIndex !== -1) {
    // Replace the summary body: every line up to the next section heading.
    // Text copied from a PDF rarely has blank lines between sections, so a
    // blank line alone is not a safe end — stopping only there once replaced
    // the whole rest of the CV.
    let start = headingIndex + 1;
    while (start < lines.length && lines[start].trim().length === 0) start += 1;
    let end = start;
    while (end < lines.length && lines[end].trim().length > 0 && !isHeading(lines[end])) {
      end += 1;
    }
    return { insertAt: start, replaceCount: end - start, needsHeading: false };
  }

  const firstSection = lines.findIndex((line, index) => index > 0 && isHeading(line));
  if (firstSection !== -1) {
    return { insertAt: firstSection, replaceCount: 0, needsHeading: true };
  }

  // No headings at all: after the opening block, up to the first blank line.
  const firstBlank = lines.findIndex((line) => line.trim().length === 0);
  return {
    insertAt: firstBlank === -1 ? 0 : firstBlank + 1,
    replaceCount: 0,
    needsHeading: false,
  };
}

/* -------------------------------------------------------------------------- */

type Operation =
  | { kind: "replace"; index: number; text: string; suggestionId: string }
  | { kind: "remove"; index: number; suggestionId: string }
  | { kind: "insert"; index: number; text: string; suggestionId: string }
  | { kind: "move"; from: number; to: number; suggestionId: string };

/**
 * Apply the accepted suggestions and return the improved CV with its changes
 * marked.
 *
 * Operations are collected first and applied afterwards, so that two
 * suggestions cannot shift each other's line indices mid-flight.
 */
export function applySuggestions(
  cvText: string,
  suggestions: Suggestion[],
  decisions: Record<string, SuggestionDecision>,
): AppliedCv {
  const lines = cvText.split("\n");
  const accepted = suggestions.filter(
    (suggestion) => decisions[suggestion.id] === "accepted",
  );

  const operations: Operation[] = [];
  const unapplied: Suggestion[] = [];
  const taken = new Set<number>();

  for (const suggestion of accepted) {
    if (!isApplicable(suggestion)) continue;

    if (suggestion.kind === "summary") {
      if (!suggestion.after) {
        unapplied.push(suggestion);
        continue;
      }
      const target = summaryTarget(lines);
      for (let i = 0; i < target.replaceCount; i += 1) {
        operations.push({
          kind: "remove",
          index: target.insertAt + i,
          suggestionId: suggestion.id,
        });
        taken.add(target.insertAt + i);
      }
      operations.push({
        kind: "insert",
        index: target.insertAt,
        text: target.needsHeading ? `${NEW_SUMMARY_HEADING}\n${suggestion.after}` : suggestion.after,
        suggestionId: suggestion.id,
      });
      continue;
    }

    if (!suggestion.before) {
      unapplied.push(suggestion);
      continue;
    }

    const index = findLine(lines, suggestion.before, taken);
    if (index === -1) {
      unapplied.push(suggestion);
      continue;
    }
    taken.add(index);

    if (suggestion.kind === "rewrite") {
      if (!suggestion.after) {
        unapplied.push(suggestion);
        continue;
      }
      // Keep the original bullet marker so the rewritten line still looks
      // like the list it belongs to.
      operations.push({
        kind: "replace",
        index,
        text: `${leadingMarker(lines[index])}${suggestion.after}`,
        suggestionId: suggestion.id,
      });
    } else if (suggestion.kind === "cut") {
      operations.push({ kind: "remove", index, suggestionId: suggestion.id });
    } else if (suggestion.kind === "moveup") {
      const target = summaryTarget(lines);
      operations.push({
        kind: "move",
        from: index,
        to: target.insertAt + target.replaceCount,
        suggestionId: suggestion.id,
      });
    }
  }

  /* ---------------- apply ---------------- */

  // Build a working list of segments mirroring the original lines, then mutate
  // it. Removals are marked rather than spliced so later indices stay valid.
  type Slot = {
    text: string;
    removed: boolean;
    changed: boolean;
    suggestionId?: string;
    replaced?: string;
    /** Lines inserted before this slot. */
    prepend: CvSegment[];
  };

  const slots: Slot[] = lines.map((text) => ({
    text,
    removed: false,
    changed: false,
    prepend: [],
  }));

  for (const operation of operations) {
    switch (operation.kind) {
      case "replace": {
        const slot = slots[operation.index];
        if (!slot) break;
        slot.replaced = slot.text;
        slot.text = operation.text;
        slot.changed = true;
        slot.suggestionId = operation.suggestionId;
        break;
      }
      case "remove": {
        const slot = slots[operation.index];
        if (!slot) break;
        slot.removed = true;
        break;
      }
      case "insert": {
        const slot = slots[Math.min(operation.index, slots.length - 1)];
        if (!slot) break;
        for (const line of operation.text.split("\n")) {
          slot.prepend.push({
            text: line,
            changed: true,
            suggestionId: operation.suggestionId,
          });
        }
        break;
      }
      case "move": {
        const source = slots[operation.from];
        const destination = slots[Math.min(operation.to, slots.length - 1)];
        if (!source || !destination || source === destination) break;
        source.removed = true;
        destination.prepend.push({
          text: source.text,
          changed: true,
          suggestionId: operation.suggestionId,
        });
        break;
      }
    }
  }

  const segments: CvSegment[] = [];
  for (const slot of slots) {
    segments.push(...slot.prepend);
    if (slot.removed) continue;
    segments.push({
      text: slot.text,
      changed: slot.changed,
      suggestionId: slot.suggestionId,
      replaced: slot.replaced,
    });
  }

  // Collapse the blank runs a removal can leave behind.
  const cleaned: CvSegment[] = [];
  for (const segment of segments) {
    const isBlank = segment.text.trim().length === 0;
    const previousBlank =
      cleaned.length > 0 && cleaned[cleaned.length - 1].text.trim().length === 0;
    if (isBlank && previousBlank) continue;
    cleaned.push(segment);
  }

  return {
    text: cleaned.map((segment) => segment.text).join("\n").trim(),
    segments: cleaned,
    unapplied,
  };
}

/** How many accepted suggestions actually changed the CV. */
export function countApplied(
  suggestions: Suggestion[],
  decisions: Record<string, SuggestionDecision>,
): number {
  return suggestions.filter(
    (suggestion) =>
      decisions[suggestion.id] === "accepted" && isApplicable(suggestion),
  ).length;
}
