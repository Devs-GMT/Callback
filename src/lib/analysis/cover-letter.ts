/**
 * Checking and assembling the cover letter.
 *
 * The prompt asks for a CV quote behind every body paragraph; this module is
 * where that is enforced, the same way `buildMatchReport` re-checks match
 * evidence. A quote the CV does not contain is dropped, and a body paragraph
 * left with no quote is dropped with it — a letter that claims things the CV
 * cannot back is worse than a shorter one.
 */

import type { CoverLetter, CoverLetterDraft, CoverLetterParagraph } from "@/lib/types";
import { LOCALE_TAGS, fmt, type Locale } from "@/i18n/config";
import { libMessages } from "@/i18n/lib";
import { detectLanguage } from "@/lib/analysis/language";

const collapse = (value: string) => value.toLowerCase().replace(/[“”"‘’'`]/g, "").replace(/\s+/g, " ").trim();

/** Bullet markers and quotes the model may add around a copied line. */
const stripMarkers = (value: string) => value.replace(/^[\s\-–—•·*▪◦]+/, "").trim();

/** Does the CV contain this quote, allowing for spacing, case and quote marks? */
export function quoteInCv(quote: string, cvHaystack: string): boolean {
  const needle = collapse(stripMarkers(quote));
  return needle.length >= 8 && cvHaystack.includes(needle);
}

export type VerifiedDraft = {
  draft: CoverLetterDraft;
  /** Body paragraphs removed because nothing in them could be found in the CV. */
  dropped: number;
};

export function verifyCoverLetter(draft: CoverLetterDraft, cvText: string): VerifiedDraft {
  const haystack = collapse(cvText);
  const body: CoverLetterParagraph[] = [];
  let dropped = 0;

  for (const paragraph of draft.body) {
    const evidence = [...new Set(paragraph.evidence.map((quote) => stripMarkers(quote)))].filter(
      (quote) => quoteInCv(quote, haystack),
    );
    if (paragraph.text.trim().length === 0) continue;
    if (evidence.length === 0) {
      dropped += 1;
      continue;
    }
    body.push({ text: paragraph.text.trim(), evidence });
  }

  return { draft: { ...draft, body }, dropped };
}

/** The letter as plain text: greeting to signature, paragraphs blank-separated. */
export function coverLetterText(letter: CoverLetterDraft, candidateName?: string): string {
  const signature = [letter.signOff.trim(), candidateName?.trim()].filter(Boolean).join("\n");
  return [
    letter.greeting.trim(),
    letter.opening.trim(),
    ...letter.body.map((paragraph) => paragraph.text.trim()),
    letter.closing.trim(),
    signature,
  ]
    .filter((block) => block.length > 0)
    .join("\n\n");
}

/** What is shown and exported: the user's edit when there is one. */
export function currentLetterText(letter: CoverLetter, candidateName?: string): string {
  return letter.editedText ?? coverLetterText(letter, candidateName);
}

/**
 * The business-letter frame around the text: who it is addressed to and the
 * line that says what it is about. Kept out of the editable text so a copy
 * pasted into an email starts at the greeting.
 */
/**
 * The language a letter is written in. The model writes it in the job's
 * language, so the date, addressee and subject line around it follow the
 * letter, not the site.
 */
export function letterLanguage(
  letter: Partial<Pick<CoverLetter, "greeting" | "opening" | "closing">>,
): Locale {
  return detectLanguage([letter.greeting, letter.opening, letter.closing].filter(Boolean).join(" "));
}

/** The date line, written the way the letter's own language writes dates. */
export function letterDate(time: number, language: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[language], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(time);
}

export function letterFrame(
  letter: Pick<CoverLetter, "options"> & Partial<Pick<CoverLetter, "greeting" | "opening" | "closing">>,
  job: { jobTitle?: string; company?: string },
): { recipient: string[]; subject?: string } {
  const m = libMessages(letterLanguage(letter)).letter;
  const recipient = [
    letter.options.hiringManager?.trim() || m.recipient,
    job.company?.trim(),
  ].filter((line): line is string => Boolean(line));
  const role = job.jobTitle?.trim();
  return { recipient, subject: role ? fmt(m.subject, { role }) : undefined };
}

/** Paragraphs of a plain-text letter, for the exporters. */
export function letterParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

export function letterWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
