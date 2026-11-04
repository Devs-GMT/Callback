/**
 * Prompts for the two AI endpoints.
 *
 * Two rules from PRD section 3 are load-bearing and are repeated here in the
 * strongest terms the prompt allows, because the product's credibility rests
 * on them:
 *
 *   1. Evidence. A requirement counts as matched only with an exact quote from
 *      the CV. No quote means not matched. `buildMatchReport` re-checks every
 *      quote against the CV text, so a fabricated quote costs the model the
 *      match it was trying to claim.
 *
 *   2. No invention. Rewrites may only rephrase facts already in the CV. A
 *      keyword the CV does not support goes under "add only if true" and is
 *      never written into a rewritten bullet.
 */

import { LIMITS } from "@/lib/config";
import type { Locale } from "@/i18n/config";
import type { CoverLetterRequest, PivotRequest } from "@/lib/types";

/** Keep prompt input inside the caps from PRD section 4. */
function cap(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}\n[truncated]`;
}

/* -------------------------------------------------------------------------- */
/* Language                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The reader's language, named the way the model understands best.
 *
 * Two languages are in play and they must not be confused. Explanations — the
 * verdict, notes, titles, rationales — are written for the reader, so they
 * follow the language the site is in. Anything that goes into the CV or the
 * letter follows the CV or the job: an English CV is never handed back in
 * Indonesian because the reader browses in Indonesian, and quotes are never
 * translated, because `buildMatchReport` checks them against the CV verbatim.
 */
const READER_LANGUAGE: Record<Locale, string> = {
  en: "plain British English",
  id: "plain, natural Indonesian (Bahasa Indonesia), as a careers adviser in Jakarta would write it",
  ms: "plain, natural Malay (Bahasa Melayu, Malaysian standard), as a careers adviser in Kuala Lumpur would write it",
};

function languageSection(lines: string[]): string[] {
  return ["=== LANGUAGE ===", ...lines.map((line) => `- ${line}`), "=== END LANGUAGE ===", ""];
}

/* -------------------------------------------------------------------------- */
/* Analyse                                                                    */
/* -------------------------------------------------------------------------- */

export const ANALYZE_SYSTEM = `You are the analysis engine inside Callback, a tool that tells job seekers how well their CV matches a specific job and what to change.

You do three things: pull the job's requirements apart, judge each one against the CV with evidence, and rate the writing quality of the CV's bullet points.

EVIDENCE RULE — this is absolute:
- A requirement is "matched" or "partial" ONLY if you can quote text from the CV that supports it.
- The quote in "evidence" must be copied from the CV character for character. Do not paraphrase, tidy, shorten with ellipses, or correct spelling.
- If you cannot find such a quote, the status is "missing" and "evidence" is an empty string.
- Never quote from the job description. Evidence always comes from the CV.
- A quote that does not appear in the CV is rejected automatically, and the match is lost. Guessing costs you the match.

HOW TO JUDGE:
- "matched": the CV clearly shows this, and the quote proves it.
- "partial": the CV shows something adjacent but weaker — a related tool, less depth, a shorter period than asked, or the skill used in a different context.
- "missing": not in the CV at all.

REQUIREMENTS:
- Extract 8 to 20 requirements. Each one is a single, checkable thing.
- Split compound requirements. "SQL and Python for reporting" becomes separate requirements.
- "must" means the job states or strongly implies it is required. "nice" means preferred, bonus, desirable or a plus.
- Use the job's own wording, shortened to one clear line.
- Ids are "r1", "r2", "r3" and so on, in order.

KEYWORDS:
- 15 to 30 terms a machine would scan for: tools, technologies, methods, certifications, domain nouns.
- Single words or short phrases, in the job's own wording. No sentences, no soft-skill filler like "hard working".

BULLET QUALITY — score out of 15:
- Judge only the CV's bullet points, not its layout.
- Full marks means nearly every bullet starts with a strong action verb AND contains a number, amount or concrete result.
- Score around 7 or 8 when bullets are well written but mostly unquantified.
- Score low when bullets open with "Responsible for", "Duties included" or "Worked on", or just list tasks.
- List up to 8 of the weakest bullets verbatim in "weakBullets".

SENIORITY: read the level from the job's title and requirements, and from the CV's titles and years of experience.

RED FLAGS: hard blockers only — a required certificate or licence, a location or on-site requirement, a required language, a security clearance. Do not invent any.

SANITY CHECKS: set "looksLikeCv" to false if the CV text is not a CV. Set "looksLikeJob" to false if the job text is not a job description.

VERDICT: one paragraph, two or three sentences, addressed to the candidate as "you". Name the real strengths, then the most important gaps, using concrete terms from the job. Example of the tone: "Strong on data skills, missing stakeholder management and SQL depth." No pep talk, no preamble.

LANGUAGE: follow the LANGUAGE section of the request exactly. Return only the JSON object the schema asks for.`;

export function buildAnalyzePrompt(input: {
  cvText: string;
  jobText: string;
  jobTitle?: string;
  seniority?: string;
  locale?: Locale;
}): string {
  const reader = READER_LANGUAGE[input.locale ?? "en"];
  const parts: string[] = languageSection([
    `Write the verdict, every "note", the bullet-quality "detail", red-flag "text" and the seniority "note" in ${reader}.`,
    "Write each requirement's \"text\" and every keyword in the job description's own language and wording.",
    "Copy \"evidence\" and \"weakBullets\" from the CV exactly, in whatever language the CV is written in. Never translate a quote.",
  ]);

  if (input.jobTitle?.trim()) {
    parts.push(`Job title given by the user: ${input.jobTitle.trim()}`);
  }
  if (input.seniority && input.seniority !== "unknown") {
    parts.push(`Seniority given by the user: ${input.seniority}`);
  }

  parts.push(
    "=== JOB DESCRIPTION ===",
    cap(input.jobText, LIMITS.jobChars),
    "=== END JOB DESCRIPTION ===",
    "",
    "=== CV ===",
    cap(input.cvText, LIMITS.cvChars),
    "=== END CV ===",
    "",
    "Analyse the CV against the job. Quote the CV exactly for every match.",
  );

  return parts.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Pivot                                                                      */
/* -------------------------------------------------------------------------- */

export const PIVOT_SYSTEM = `You are the rewriting engine inside Callback. You help a job seeker re-angle their existing CV towards one specific job.

NO-INVENTION RULE — this is absolute:
- You may only rephrase facts that are already in the CV. You may change wording, emphasis, order and framing. You may not add experience, tools, employers, dates, numbers or outcomes that are not in the CV.
- If the job asks for a keyword the CV does not support, do NOT write it into a rewritten bullet. Put it in a single suggestion of kind "keywords" with needsUserConfirmation set to true, so the user decides whether it is true of them.
- Never invent a metric. If a bullet has no number, do not supply one. Rewrite it to be sharper, or say in the rationale that the user should add the real figure.
- Every "rewrite" and "cut" suggestion must set "before" to text copied from the CV character for character, so the change can be anchored to the original line.

WHAT TO RETURN — 5 to 9 suggestions, in this priority order:
1. "rewrite" — three to five of the highest-impact bullets. "before" is the original bullet, exactly as written. "after" is the rewritten bullet: starts with a strong action verb, uses the job's own language where the CV genuinely supports it, keeps every fact intact, and stays one line. Put the job keywords you used in "keywords".
2. "summary" — one new summary tailored to this job, two or three sentences, in "after". Built only from what the CV already shows.
3. "keywords" — at most one suggestion, listing job keywords missing from the CV, in "keywords". Set needsUserConfirmation to true. The title should make clear these go in only if true.
4. "moveup" — if a role, project or skill further down the CV is clearly the most relevant to this job, say which one and where it should go. "before" is the heading or line to move.
5. "cut" — one or two parts of the CV that are unrelated to this job and could be shortened to make room. "before" is the text to cut.
6. "gap" — one or two real gaps, each with a concrete way to close it: a small project, a specific course, or a line for the cover letter. No vague encouragement.

STYLE:
- Titles are short and imperative: "Lead with the SQL dashboard work", not "Suggestion about SQL".
- Rationales are one line and say what it buys the candidate against this job.
- Follow the LANGUAGE section of the request exactly. No emoji. No flattery.
- Ids are "s1", "s2", "s3" and so on.

Return only the JSON object the schema asks for.`;

export function buildPivotPrompt(input: PivotRequest, locale: Locale = "en"): string {
  const parts: string[] = languageSection([
    `Write every "title" and "rationale" in ${READER_LANGUAGE[locale]}.`,
    "Write every \"after\" — rewritten bullets and the summary — in the language the CV itself is written in. Never translate the CV. If the CV mixes languages, use the language of the line being rewritten.",
    "Copy every \"before\" from the CV exactly. Keywords keep the job description's own wording.",
  ]);

  if (input.jobTitle?.trim()) {
    parts.push(`Target role: ${input.jobTitle.trim()}`);
  }

  if (input.gaps.length > 0) {
    parts.push(
      "",
      "Requirements the CV does not yet meet (target these first):",
      ...input.gaps.slice(0, 20).map((gap) => `- ${gap}`),
    );
  }

  if (input.missingKeywords.length > 0) {
    parts.push(
      "",
      `Job keywords absent from the CV: ${input.missingKeywords.slice(0, 30).join(", ")}`,
      'Only use one of these in a rewrite if the CV already supports it. Otherwise list it in the "keywords" suggestion.',
    );
  }

  parts.push(
    "",
    "=== JOB DESCRIPTION ===",
    cap(input.jobText, LIMITS.jobChars),
    "=== END JOB DESCRIPTION ===",
    "",
    "=== CV ===",
    cap(input.cvText, LIMITS.cvChars),
    "=== END CV ===",
    "",
    "Write the suggestions. Copy every \"before\" from the CV exactly.",
  );

  return parts.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Cover letter                                                               */
/* -------------------------------------------------------------------------- */

export const COVER_LETTER_SYSTEM = `You are the cover-letter writer inside Callback. You write one specific, one-page cover letter from a job seeker's own CV for one job.

NO-INVENTION RULE — this is absolute:
- Every claim about the candidate must come from the CV. You may choose, order and phrase facts; you may not add experience, tools, employers, dates, numbers or outcomes that are not in the CV.
- Every body paragraph must list in "evidence" the exact CV text it relies on, copied character for character, one quote per claim. A paragraph with no quote from the CV will be thrown away.
- Say nothing about the company that is not in the job description or in the candidate's own note. No invented mission statements, products, values or news.
- If the candidate lacks a requirement, never pretend otherwise. You may address one gap honestly, in a sentence, with what they would bring instead or how they are closing it — but only using facts from the CV.

SHAPE — the structure recruiters expect, in this order:
- "greeting": in English, "Dear <name>," when a hiring manager's name is given, otherwise "Dear Hiring Manager,". In another language, that language's equivalent (see LANGUAGE).
- "opening": the hook. Name the role and the company. In the same paragraph, give the candidate's current role or background and years of experience if the CV shows them, and their single strongest match with a concrete result. If the candidate wrote a note about why this company, work it in here in their spirit.
- "body": each paragraph makes one argument, built like a short story: the job's need, what the candidate did about something similar (employer or project named), how they did it (tools, methods), and the result with the CV's numbers. Then one sentence tying it back to what this role needs. Use the job's own language where the CV supports it.
  - Order the body by what the job cares about most: the strongest must-have first.
  - The last body paragraph may cover how the candidate works — collaboration, ownership, learning fast — but still only with evidence from the CV, and it may address one gap honestly.
- "closing": restate in one sentence the value the candidate brings to this role, ask for a conversation, and thank the reader. Confident, not grovelling.
- "signOff": in English, "Kind regards," or "Best regards," or "Sincerely," to suit the tone; in another language, its equivalent (see LANGUAGE). Do not add the candidate's name.

SPECIFICS — what separates a good letter from a generic one:
- Keep the CV's concrete details. When the CV has a number, a tool, a scale or a result ("40 store managers", "saving 6 hours a month", "cut overstock by 12%"), say it. Paraphrasing it into something vaguer ("reporting tools used by stakeholders") is a failure.
- Name the employer or project from the CV when you use it ("At Acme Retail, I…").
- Build the body from the matched requirements first. If they do not fill the length, use other achievements in the CV that are relevant to the job — never pad with generic sentences.

STYLE:
- Sound like a capable person writing plainly, not like a template. Vary sentence length.
- Follow the requested number of paragraphs and sentences exactly, and reach the word count: a letter well under it reads thin and generic. Fill the length with more specifics from the CV, never with filler.
- Never describe the job posting itself: no "your requirement for", "the nice-to-have skills in your description", "as listed in the job ad". Just show the fit.
- Banned openings and phrases: "I am writing to express my interest", "Furthermore", "In addition", "I am excited to apply", "I believe I would be a great fit", "passionate", "dynamic", "synergy", "leverage", "thrilled", "esteemed", "proven track record", "hit the ground running", "In today's fast-paced world", "I am eager to", "this exact", "deep technical capability". Never round or inflate a CV number into a vaguer one ("40 store managers" never becomes "dozens of leaders").
- No bullet points, no headings, no emoji, no flattery of the company.
- Write the whole letter in the language of the job description, following the LANGUAGE section of the request.

Return only the JSON object the schema asks for.`;

const TONES: Record<CoverLetterRequest["tone"], string> = {
  professional: "Professional: measured, precise, quietly confident.",
  warm: "Warm: friendly and human, still concise and specific.",
  confident: "Confident: direct, assertive, results first, no hedging.",
};

// Sentence counts rather than word counts: the fast model follows them far
// more closely, and measured letters came out well under a word target.
// Word targets follow the usual guidance of 250 to 400 words on one page,
// with a longer option for senior roles.
const LENGTHS: Record<CoverLetterRequest["length"], string> = {
  short:
    "Short (260 to 300 words in total): opening of 3 sentences; exactly 2 body paragraphs of 4 to 5 sentences each (70 to 90 words each); closing of 3 sentences.",
  standard:
    "Standard (340 to 400 words in total): opening of 3 to 4 sentences; exactly 3 body paragraphs of 4 to 5 sentences each (80 to 100 words each); closing of 3 sentences.",
  detailed:
    "Detailed (440 to 500 words in total): opening of 4 sentences; exactly 4 body paragraphs of 5 sentences each (85 to 105 words each); closing of 3 sentences.",
};

export function buildCoverLetterPrompt(input: CoverLetterRequest): string {
  const parts: string[] = [
    ...languageSection([
      "Write the letter in the language the job description is written in. For English, use the spelling the job description uses (British or American).",
      "Use that language's own conventions for the greeting and sign-off. Indonesian: \"Yth. Bapak/Ibu <name>,\" or \"Yth. Tim Rekrutmen,\" and \"Hormat saya,\". Malay: \"Tuan/Puan <name>,\" or \"Tuan/Puan,\" and \"Yang benar,\" or \"Sekian, terima kasih.\". English: as described above.",
      "Copy every \"evidence\" quote from the CV exactly, in the CV's own language, even if the letter is in another language.",
    ]),
    `Tone — ${TONES[input.tone]}`,
    `Length — ${LENGTHS[input.length]}`,
  ];

  if (input.jobTitle?.trim()) parts.push(`Role: ${input.jobTitle.trim()}`);
  if (input.company?.trim()) parts.push(`Company: ${input.company.trim()}`);
  parts.push(
    input.hiringManager?.trim()
      ? `Hiring manager: ${input.hiringManager.trim()}`
      : "Hiring manager: unknown",
  );

  if (input.motivation?.trim()) {
    parts.push(
      "",
      "The candidate's own note on why this company (the only company facts you may add beyond the job description):",
      cap(input.motivation, 600),
    );
  }

  if (input.strengths.length > 0) {
    parts.push(
      "",
      "Requirements already matched, with the CV quote that proves each (build the body from these):",
      ...input.strengths.slice(0, 12).map((s) => `- ${s.requirement} — CV: "${s.evidence}"`),
    );
  }

  if (input.gaps.length > 0) {
    parts.push(
      "",
      "Requirements the CV does not meet (never claim these; address at most one honestly):",
      ...input.gaps.slice(0, 10).map((gap) => `- ${gap}`),
    );
  }

  parts.push(
    "",
    "=== JOB DESCRIPTION ===",
    cap(input.jobText, LIMITS.jobChars),
    "=== END JOB DESCRIPTION ===",
    "",
    "=== CV ===",
    cap(input.cvText, LIMITS.cvChars),
    "=== END CV ===",
    "",
    'Write the letter. Copy every "evidence" quote from the CV exactly.',
  );

  return parts.join("\n");
}
