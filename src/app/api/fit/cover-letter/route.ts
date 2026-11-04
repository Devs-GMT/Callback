/**
 * POST /api/fit/cover-letter
 *
 * Writes a cover letter for one job from the candidate's (improved) CV, built
 * from the requirements the analysis already matched with evidence. Every
 * body paragraph must carry a quote that is really in the CV; paragraphs that
 * do not are removed before the letter is returned (see `verifyCoverLetter`).
 *
 * It has its own daily budget so writing letters never eats into the analyses
 * a user has left.
 *
 * Privacy: as with the other AI routes, nothing here logs the CV, the job or
 * the user's note.
 */

import { MODELS, THINKING, AiNotConfiguredError, AiRateLimitedError, AiUpstreamError, generateJson, isAiConfigured } from "@/lib/ai/provider";
import { COVER_LETTER_SYSTEM, buildCoverLetterPrompt } from "@/lib/ai/prompts";
import { COVER_LETTER_JSON_SCHEMA, parseCoverLetterResponse } from "@/lib/ai/schemas";
import { verifyCoverLetter } from "@/lib/analysis/cover-letter";
import { LIMITS } from "@/lib/config";
import { isAllowedOrigin, requestLocale, jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { consume, rateLimitHeaders } from "@/lib/server/rate-limit";
import type { CoverLetterRequest, CoverLetterResponse } from "@/lib/types";
import { fmt } from "@/i18n/config";
import { libMessages } from "@/i18n/lib";

export const maxDuration = 60;

const TONES = ["professional", "warm", "confident"] as const;
const LENGTHS = ["short", "standard", "detailed"] as const;

/**
 * Below this many words the letter reads thin. The fast model sometimes
 * undershoots, so one more attempt is made, time allowing, and the longer of
 * the two verified drafts is kept.
 */
const MIN_WORDS: Record<(typeof LENGTHS)[number], number> = { short: 230, standard: 310, detailed: 400 };
const RETRY_BEFORE_MS = 25_000;

const draftWords = (draft: CoverLetterResponse) =>
  [draft.opening, ...draft.body.map((p) => p.text), draft.closing].join(" ").split(/\s+/).filter(Boolean).length;

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : undefined;
}

function stringList(value: unknown, max: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= maxLength)
    .slice(0, max);
}

function strengthList(value: unknown): CoverLetterRequest["strengths"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        requirement: cleanString(row.requirement, 300) ?? "",
        evidence: cleanString(row.evidence, 400) ?? "",
      };
    })
    .filter((row) => row.requirement && row.evidence)
    .slice(0, 12);
}

export async function POST(request: Request): Promise<Response> {
  const locale = requestLocale(request);
  const api = libMessages(locale).api;
  if (!isAllowedOrigin(request)) {
    return jsonError("bad_request", api.foreignOrigin);
  }

  if (!isAiConfigured()) {
    return jsonError("not_configured", api.letterNotConfigured);
  }

  const body = await readJsonBody<Partial<CoverLetterRequest>>(
    request,
    (LIMITS.cvChars + LIMITS.jobChars) * 2 + 16_000,
  );
  if (!body.ok) return body.response;

  const cvText = typeof body.data.cvText === "string" ? body.data.cvText.trim() : "";
  const jobText = typeof body.data.jobText === "string" ? body.data.jobText.trim() : "";

  if (cvText.length < LIMITS.cvMinChars || jobText.length < LIMITS.jobMinChars) {
    return jsonError("bad_request", api.letterNeedsBoth);
  }
  if (cvText.length > LIMITS.cvChars || jobText.length > LIMITS.jobChars) {
    return jsonError("too_large", api.tooMuchToWrite);
  }

  const limit = await consume(request, "cover-letter", LIMITS.coverLettersPerDay);
  const headers = rateLimitHeaders(limit);
  if (!limit.allowed) {
    return jsonError(
      "rate_limited",
      fmt(api.lettersUsed, { limit: LIMITS.coverLettersPerDay }),
      { retryAfter: limit.resetAfter, headers },
    );
  }

  const payload: CoverLetterRequest = {
    cvText,
    jobText,
    jobTitle: cleanString(body.data.jobTitle, LIMITS.jobTitleChars),
    company: cleanString(body.data.company, 120),
    hiringManager: cleanString(body.data.hiringManager, LIMITS.hiringManagerChars),
    motivation: cleanString(body.data.motivation, LIMITS.motivationChars),
    tone: TONES.includes(body.data.tone as never) ? body.data.tone! : "professional",
    length: LENGTHS.includes(body.data.length as never) ? body.data.length! : "standard",
    strengths: strengthList(body.data.strengths),
    gaps: stringList(body.data.gaps, 10, 300),
  };

  const started = Date.now();
  const attempt = async () => {
    const raw = await generateJson<unknown>({
      model: MODELS.pivot,
      thinking: THINKING.pivot,
      system: COVER_LETTER_SYSTEM,
      prompt: buildCoverLetterPrompt(payload),
      schema: COVER_LETTER_JSON_SCHEMA,
      temperature: 0.6,
    });
    return verifyCoverLetter(parseCoverLetterResponse(raw), cvText).draft;
  };

  try {
    let draft = await attempt();
    if (draftWords(draft) < MIN_WORDS[payload.length] && Date.now() - started < RETRY_BEFORE_MS) {
      const second = await attempt().catch(() => null);
      if (second && second.body.length > 0 && draftWords(second) > draftWords(draft)) draft = second;
    }

    if (draft.opening.length === 0 || draft.body.length === 0) {
      return jsonError(
        "upstream_error",
        api.letterUnbacked,
        { headers },
      );
    }

    const result: CoverLetterResponse = draft;
    return jsonOk(result, headers);
  } catch (error) {
    if (error instanceof AiRateLimitedError) {
      return jsonError(
        "rate_limited",
        api.letterBusy,
        { retryAfter: error.retryAfter ?? 60, headers },
      );
    }
    if (error instanceof AiNotConfiguredError) {
      return jsonError("not_configured", api.letterKey, {
        headers,
      });
    }
    if (error instanceof AiUpstreamError) {
      return jsonError("upstream_error", locale === "en" ? error.message : api.letterFailed, { headers });
    }
    return jsonError("upstream_error", api.letterFailed, {
      headers,
    });
  }
}
