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
import { isAllowedOrigin, jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { consume, rateLimitHeaders } from "@/lib/server/rate-limit";
import type { CoverLetterRequest, CoverLetterResponse } from "@/lib/types";

export const maxDuration = 60;

const TONES = ["professional", "warm", "confident"] as const;
const LENGTHS = ["short", "standard"] as const;

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
  if (!isAllowedOrigin(request)) {
    return jsonError("bad_request", "This endpoint only serves the Callback app.");
  }

  if (!isAiConfigured()) {
    return jsonError("not_configured", "The cover letter service isn't configured yet.");
  }

  const body = await readJsonBody<Partial<CoverLetterRequest>>(
    request,
    (LIMITS.cvChars + LIMITS.jobChars) * 2 + 16_000,
  );
  if (!body.ok) return body.response;

  const cvText = typeof body.data.cvText === "string" ? body.data.cvText.trim() : "";
  const jobText = typeof body.data.jobText === "string" ? body.data.jobText.trim() : "";

  if (cvText.length < LIMITS.cvMinChars || jobText.length < LIMITS.jobMinChars) {
    return jsonError("bad_request", "We need both the CV and the job to write a cover letter.");
  }
  if (cvText.length > LIMITS.cvChars || jobText.length > LIMITS.jobChars) {
    return jsonError("too_large", "That's more text than we can work with at once.");
  }

  const limit = await consume(request, "cover-letter", LIMITS.coverLettersPerDay);
  const headers = rateLimitHeaders(limit);
  if (!limit.allowed) {
    return jsonError(
      "rate_limited",
      `You've written all ${LIMITS.coverLettersPerDay} cover letters for today. Any letter you have is saved in this browser.`,
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

  try {
    const raw = await generateJson<unknown>({
      model: MODELS.pivot,
      thinking: THINKING.pivot,
      system: COVER_LETTER_SYSTEM,
      prompt: buildCoverLetterPrompt(payload),
      schema: COVER_LETTER_JSON_SCHEMA,
      temperature: 0.6,
    });

    const { draft } = verifyCoverLetter(parseCoverLetterResponse(raw), cvText);

    if (draft.opening.length === 0 || draft.body.length === 0) {
      return jsonError(
        "upstream_error",
        "We couldn't write a letter we could back up with your CV. Try again.",
        { headers },
      );
    }

    const result: CoverLetterResponse = draft;
    return jsonOk(result, headers);
  } catch (error) {
    if (error instanceof AiRateLimitedError) {
      return jsonError(
        "rate_limited",
        "The cover letter service is busy right now. Try again in a minute.",
        { retryAfter: error.retryAfter ?? 60, headers },
      );
    }
    if (error instanceof AiNotConfiguredError) {
      return jsonError("not_configured", "The cover letter service rejected our key.", {
        headers,
      });
    }
    if (error instanceof AiUpstreamError) {
      return jsonError("upstream_error", error.message, { headers });
    }
    return jsonError("upstream_error", "Writing the letter failed. Please try again.", {
      headers,
    });
  }
}
