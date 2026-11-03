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
