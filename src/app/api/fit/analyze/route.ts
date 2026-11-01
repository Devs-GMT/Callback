/**
 * POST /api/fit/analyze
 *
 * Extracts the job's requirements, judges each one against the CV with an
 * evidence quote, and rates bullet quality. PRD section 3.
 *
 * The handler returns the model's analysis and nothing else: the ATS score and
 * the match percentage are computed in the browser from this payload, because
 * both must be reproducible and the arithmetic is the part a user is entitled
 * to see explained.
 *
 * Privacy (PRD section 3): the CV and job text pass through for the duration
 * of this call and are never stored or logged — note there is no logging of
 * `body` anywhere below, including in the error paths.
 */

import { MODELS, AiNotConfiguredError, AiRateLimitedError, AiUpstreamError, generateJson, isAiConfigured } from "@/lib/ai/provider";
import { ANALYZE_SYSTEM, buildAnalyzePrompt } from "@/lib/ai/prompts";
import { ANALYZE_JSON_SCHEMA, parseAnalyzeResponse } from "@/lib/ai/schemas";
import { LIMITS } from "@/lib/config";
import { isAllowedOrigin, jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { consume, rateLimitHeaders } from "@/lib/server/rate-limit";
import type { AnalyzeRequest, AnalyzeResponse, Seniority } from "@/lib/types";

/** PRD section 2 step 3 budgets 20 to 40 seconds for the analysis. */
export const maxDuration = 60;

const SENIORITIES: Seniority[] = [
  "unknown",
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
];

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return jsonError("bad_request", "This endpoint only serves the Callback app.");
  }

  if (!isAiConfigured()) {
    return jsonError(
      "not_configured",
      "The analysis service isn't configured yet. The ATS check below still works.",
    );
  }

  // Body cap sits just above the combined character caps plus JSON overhead.
  const body = await readJsonBody<Partial<AnalyzeRequest>>(
    request,
    (LIMITS.cvChars + LIMITS.jobChars) * 2,
  );
  if (!body.ok) return body.response;

  const cvText = typeof body.data.cvText === "string" ? body.data.cvText.trim() : "";
  const jobText = typeof body.data.jobText === "string" ? body.data.jobText.trim() : "";

  if (cvText.length < LIMITS.cvMinChars) {
    return jsonError("bad_request", "That CV is too short to analyse.");
  }
  if (jobText.length < LIMITS.jobMinChars) {
    return jsonError(
      "bad_request",
      "This doesn't look like a full job description.",
    );
  }
  if (cvText.length > LIMITS.cvChars || jobText.length > LIMITS.jobChars) {
    return jsonError("too_large", "That's more text than we can analyse at once.");
  }

  const limit = await consume(request, "analyze", LIMITS.analysesPerDay);
  const headers = rateLimitHeaders(limit);
  if (!limit.allowed) {
    return jsonError(
      "rate_limited",
      `You've used all ${LIMITS.analysesPerDay} analyses for today. Your reports are saved in this browser.`,
      { retryAfter: limit.resetAfter, headers },
    );
  }

  const jobTitle =
    typeof body.data.jobTitle === "string"
      ? body.data.jobTitle.trim().slice(0, LIMITS.jobTitleChars)
      : undefined;

  const seniority =
    typeof body.data.seniority === "string" &&
    SENIORITIES.includes(body.data.seniority as Seniority)
      ? (body.data.seniority as Seniority)
      : undefined;

  try {
    const raw = await generateJson<unknown>({
      model: MODELS.analyze,
      system: ANALYZE_SYSTEM,
      prompt: buildAnalyzePrompt({ cvText, jobText, jobTitle, seniority }),
      schema: ANALYZE_JSON_SCHEMA,
      // Extraction and judging should be as repeatable as the model allows.
      temperature: 0,
    });

    const analysis: AnalyzeResponse = parseAnalyzeResponse(raw);

    if (analysis.requirements.length === 0) {
      return jsonError(
        "upstream_error",
        "We couldn't read any requirements from that job description.",
        { headers },
      );
    }

    return jsonOk(analysis, headers);
  } catch (error) {
    if (error instanceof AiRateLimitedError) {
      return jsonError(
        "rate_limited",
        "The analysis service is busy right now. Try again in a minute.",
        { retryAfter: error.retryAfter ?? 60, headers },
      );
    }
    if (error instanceof AiNotConfiguredError) {
      return jsonError(
        "not_configured",
        "The analysis service rejected our key. The ATS check below still works.",
        { headers },
      );
    }
    if (error instanceof AiUpstreamError) {
      return jsonError("upstream_error", error.message, { headers });
    }
    return jsonError("upstream_error", "The analysis failed. Please try again.", {
      headers,
    });
  }
}
