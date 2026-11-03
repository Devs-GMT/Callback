/**
 * Typed callers for the two AI routes.
 *
 * Every failure becomes an `ApiCallError` carrying the server's own message
 * and its machine-readable code, so the UI can both show sensible wording and
 * branch on the cause — PRD section 11 needs different behaviour for a rate
 * limit, a missing key and a genuine upstream failure.
 */

import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ApiError,
  ApiErrorCode,
  CoverLetterRequest,
  CoverLetterResponse,
  PivotRequest,
  PivotResponse,
} from "@/lib/types";

export class ApiCallError extends Error {
  code: ApiErrorCode | "network";
  retryAfter?: number;

  constructor(
    code: ApiErrorCode | "network",
    message: string,
    retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiCallError";
    this.code = code;
    this.retryAfter = retryAfter;
  }

  /** True when retrying later could plausibly succeed. */
  get retryable(): boolean {
    return (
      this.code === "network" ||
      this.code === "upstream_error" ||
      this.code === "timeout" ||
      this.code === "rate_limited"
    );
  }
}

async function post<TBody, TResult>(
  path: string,
  body: TBody,
  signal?: AbortSignal,
): Promise<TResult> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiCallError(
      "network",
      "We couldn't reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    let payload: ApiError | null = null;
    try {
      payload = (await response.json()) as ApiError;
    } catch {
      // Fall through to a generic message below.
    }
    throw new ApiCallError(
      payload?.code ?? "upstream_error",
      payload?.error ?? "Something went wrong. Please try again.",
      payload?.retryAfter,
    );
  }

  return (await response.json()) as TResult;
}

export function analyzeFit(
  request: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  return post<AnalyzeRequest, AnalyzeResponse>("/api/fit/analyze", request, signal);
}

export function requestCoverLetter(
  request: CoverLetterRequest,
  signal?: AbortSignal,
): Promise<CoverLetterResponse> {
  return post<CoverLetterRequest, CoverLetterResponse>("/api/fit/cover-letter", request, signal);
}

export function requestPivot(
  request: PivotRequest,
  signal?: AbortSignal,
): Promise<PivotResponse> {
  return post<PivotRequest, PivotResponse>("/api/fit/pivot", request, signal);
}
