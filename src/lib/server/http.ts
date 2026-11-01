/**
 * Shared helpers for the route handlers: JSON replies, error mapping and the
 * same-origin check that PRD section 4 calls "CORS locked".
 */

import type { ApiError, ApiErrorCode } from "@/lib/types";

export function jsonOk<T>(data: T, headers?: Record<string, string>): Response {
  return Response.json(data, {
    status: 200,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

const STATUS_FOR: Record<ApiErrorCode, number> = {
  bad_request: 400,
  rate_limited: 429,
  upstream_error: 502,
  not_configured: 503,
  blocked_url: 400,
  fetch_failed: 422,
  too_large: 413,
  timeout: 504,
};

export function jsonError(
  code: ApiErrorCode,
  message: string,
  extra?: { retryAfter?: number; headers?: Record<string, string> },
): Response {
  const body: ApiError = { error: message, code };
  if (extra?.retryAfter !== undefined) body.retryAfter = extra.retryAfter;

  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    ...extra?.headers,
  };
  if (code === "rate_limited" && extra?.retryAfter !== undefined) {
    headers["Retry-After"] = String(extra.retryAfter);
  }

  return Response.json(body, { status: STATUS_FOR[code], headers });
}

/**
 * Allow only our own origin to call these routes.
 *
 * The endpoints spend a shared API key, so they are not a public API. A
 * missing Origin header is allowed through because same-origin `fetch` from
 * some browsers, and server-side calls during development, omit it; a present
 * but foreign Origin is rejected.
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const allowed = new Set<string>();

  const host = request.headers.get("host");
  if (host) allowed.add(host);

  for (const candidate of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
  ]) {
    if (!candidate) continue;
    try {
      allowed.add(
        new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`).host,
      );
    } catch {
      // Ignore a malformed env value rather than failing every request.
    }
  }

  if (allowed.has(originHost)) return true;

  // Vercel preview deployments get a generated subdomain per commit, so the
  // exact host is not knowable ahead of time.
  return /\.vercel\.app$/.test(originHost) && process.env.VERCEL === "1";
}

/** Read and size-check a JSON body without trusting Content-Length. */
export async function readJsonBody<T>(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    return {
      ok: false,
      response: jsonError("too_large", "That request is too large."),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: jsonError("bad_request", "We couldn't read that request."),
    };
  }

  if (text.length > maxBytes) {
    return {
      ok: false,
      response: jsonError("too_large", "That request is too large."),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: jsonError("bad_request", "That request wasn't valid JSON."),
    };
  }
}
