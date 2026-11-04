/**
 * POST /api/fit/pivot
 *
 * Writes the "What to pivot" suggestions: bullet rewrites, a tailored summary,
 * keywords to add only if true, reordering, cuts and gaps. PRD section 3.
 *
 * This is a separate call from /api/fit/analyze on purpose. The analysis is
 * cheap, repeatable extraction; the rewriting is the expensive creative part
 * and uses the stronger model. Splitting them means a rate-limited or failed
 * pivot still leaves the user with a complete report (PRD section 11), and a
 * re-check does not pay for suggestions it will not use.
 *
 * Privacy: as with the analyse route, nothing here logs the CV or job text.
 */

import { MODELS, THINKING, AiNotConfiguredError, AiRateLimitedError, AiUpstreamError, generateJson, isAiConfigured } from "@/lib/ai/provider";
import { PIVOT_SYSTEM, buildPivotPrompt } from "@/lib/ai/prompts";
import { PIVOT_JSON_SCHEMA, parsePivotResponse } from "@/lib/ai/schemas";
import { LIMITS } from "@/lib/config";
import { isAllowedOrigin, requestLocale, jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { consume, rateLimitHeaders } from "@/lib/server/rate-limit";
import type { PivotRequest, PivotResponse } from "@/lib/types";
import { fmt } from "@/i18n/config";
import { libMessages } from "@/i18n/lib";

export const maxDuration = 60;

function stringList(value: unknown, max: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= maxLength)
    .slice(0, max);
}

export async function POST(request: Request): Promise<Response> {
  const locale = requestLocale(request);
  const api = libMessages(locale).api;
  if (!isAllowedOrigin(request)) {
    return jsonError("bad_request", api.foreignOrigin);
  }

  if (!isAiConfigured()) {
    return jsonError("not_configured", api.pivotNotConfigured);
  }

  const body = await readJsonBody<Partial<PivotRequest>>(
    request,
    (LIMITS.cvChars + LIMITS.jobChars) * 2,
  );
  if (!body.ok) return body.response;

  const cvText = typeof body.data.cvText === "string" ? body.data.cvText.trim() : "";
  const jobText = typeof body.data.jobText === "string" ? body.data.jobText.trim() : "";

  if (cvText.length < LIMITS.cvMinChars || jobText.length < LIMITS.jobMinChars) {
    return jsonError("bad_request", api.pivotNeedsBoth);
  }
  if (cvText.length > LIMITS.cvChars || jobText.length > LIMITS.jobChars) {
    return jsonError("too_large", api.tooMuchToWrite);
  }

  // Shares the analyse budget: a report is one analysis plus one pivot, so
  // counting them in the same bucket keeps the daily number honest.
  const limit = await consume(request, "analyze", LIMITS.analysesPerDay);
  const headers = rateLimitHeaders(limit);
  if (!limit.allowed) {
    return jsonError(
      "rate_limited",
      fmt(api.analysesUsedPivot, { limit: LIMITS.analysesPerDay }),
      { retryAfter: limit.resetAfter, headers },
    );
  }

  const payload: PivotRequest = {
    cvText,
    jobText,
    jobTitle:
      typeof body.data.jobTitle === "string"
        ? body.data.jobTitle.trim().slice(0, LIMITS.jobTitleChars)
        : undefined,
    gaps: stringList(body.data.gaps, 20, 300),
    missingKeywords: stringList(body.data.missingKeywords, 30, 48),
  };

  try {
    const raw = await generateJson<unknown>({
      model: MODELS.pivot,
      thinking: THINKING.pivot,
      system: PIVOT_SYSTEM,
      prompt: buildPivotPrompt(payload, locale),
      schema: PIVOT_JSON_SCHEMA,
      // Enough latitude to write well, not enough to drift from the CV's facts.
      temperature: 0.4,
    });

    const result: PivotResponse = parsePivotResponse(raw);

    if (result.suggestions.length === 0) {
      return jsonError(
        "upstream_error",
        api.pivotUnusable,
        { headers },
      );
    }

    return jsonOk(result, headers);
  } catch (error) {
    if (error instanceof AiRateLimitedError) {
      return jsonError(
        "rate_limited",
        api.pivotBusy,
        { retryAfter: error.retryAfter ?? 60, headers },
      );
    }
    if (error instanceof AiNotConfiguredError) {
      return jsonError("not_configured", api.pivotKey, {
        headers,
      });
    }
    if (error instanceof AiUpstreamError) {
      return jsonError("upstream_error", locale === "en" ? error.message : api.pivotFailed, { headers });
    }
    return jsonError("upstream_error", api.pivotFailed, {
      headers,
    });
  }
}
