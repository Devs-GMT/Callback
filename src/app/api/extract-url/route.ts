/**
 * POST /api/extract-url
 *
 * Reads a public page and returns its main text. Used by two flows from PRD
 * section 2: the "Link" tab for a CV hosted on the web, and the "Job URL" tab
 * for a job post on a career page.
 *
 * All of the hardening lives in `safeFetch`; this handler is the policy layer
 * around it — origin lock, rate limit, and mapping each failure to the wording
 * PRD section 11 asks for.
 */

import { LIMITS } from "@/lib/config";
import { isAllowedOrigin, jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { consume, rateLimitHeaders } from "@/lib/server/rate-limit";
import { extractPage } from "@/lib/server/readability";
import { safeFetch } from "@/lib/server/safe-fetch";

// Runs on the Node.js runtime, which is the default in Next.js 16 and is
// required here because `safeFetch` resolves DNS with node:dns to check
// where a user-supplied URL actually points. Declaring it as a route
// segment config is not allowed alongside cacheComponents.

/** Link reading is cheap, so it gets a looser limit than the AI endpoints. */
const DAILY_LIMIT = 60;

export type ExtractUrlResponse = {
  text: string;
  title?: string;
  company?: string;
  finalUrl: string;
  /** True when the text came from schema.org JobPosting data. */
  structured: boolean;
};

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return jsonError("bad_request", "This endpoint only serves the Callback app.");
  }

  const body = await readJsonBody<{ url?: unknown }>(request, 4096);
  if (!body.ok) return body.response;

  const url = typeof body.data.url === "string" ? body.data.url.trim() : "";
  if (url.length === 0) {
    return jsonError("bad_request", "No link was provided.");
  }
  if (url.length > 2048) {
    return jsonError("bad_request", "That link is too long.");
  }

  const limit = await consume(request, "extract", DAILY_LIMIT);
  const headers = rateLimitHeaders(limit);
  if (!limit.allowed) {
    return jsonError("rate_limited", "You've read a lot of links today. Try again tomorrow.", {
      retryAfter: limit.resetAfter,
      headers,
    });
  }

  const result = await safeFetch(url, {
    timeoutMs: LIMITS.urlTimeoutMs,
    maxBytes: LIMITS.urlBytes,
  });

  if (!result.ok) {
    // PRD section 11: every one of these resolves to "paste the text instead",
    // so the message explains the cause and the UI offers the fallback.
    switch (result.failure.reason) {
      case "bad_url":
        return jsonError(
          "blocked_url",
          "That doesn't look like a public web link. Paste the text instead.",
          { headers },
        );
      case "blocked":
        return jsonError(
          "blocked_url",
          "We can only read public web pages. Paste the text instead.",
          { headers },
        );
      case "dns_failed":
        return jsonError(
          "fetch_failed",
          "We couldn't find that site. Check the link, or paste the text instead.",
          { headers },
        );
      case "timeout":
        return jsonError(
          "timeout",
          "That page took too long to respond. Paste the text instead.",
          { headers },
        );
      case "too_large":
        return jsonError("too_large", "That page is too big to read. Paste the text instead.", {
          headers,
        });
      case "unsupported_type":
        return jsonError(
          "fetch_failed",
          "That link isn't a web page we can read. Paste the text instead.",
          { headers },
        );
      case "http_error":
        return jsonError(
          "fetch_failed",
          result.failure.status === 401 || result.failure.status === 403
            ? "That page needs a login, so we can't read it. Paste the text instead."
            : "We couldn't open that link. Paste the text instead.",
          { headers },
        );
      default:
        return jsonError(
          "fetch_failed",
          "We couldn't read this link. Paste the text instead.",
          { headers },
        );
    }
  }

  const page = extractPage(result.html, result.contentType);
  const text = page.text.trim();

  // A page that renders its content with client-side JavaScript gives us the
  // shell and nothing else. LinkedIn and some job boards behave this way, and
  // PRD section 11 wants that said plainly rather than returning empty text.
  if (text.length < 120) {
    return jsonError(
      "fetch_failed",
      "That page didn't give us any readable text — it may need JavaScript or a login. Paste the text instead.",
      { headers },
    );
  }

  const response: ExtractUrlResponse = {
    text: text.slice(0, LIMITS.cvChars),
    title: page.title,
    company: page.company ?? companyFromBoardUrl(result.finalUrl),
    finalUrl: result.finalUrl,
    structured: page.structured,
  };

  return jsonOk(response, headers);
}

/**
 * Derive the employer from an ATS board URL.
 *
 * The major boards put the company in the first path segment —
 * `job-boards.greenhouse.io/vercel/jobs/123`, `jobs.lever.co/acme/...`. Some
 * of those pages carry no JSON-LD and no `og:site_name`, so the slug is the
 * only place the company name appears. Greenhouse's newer `job-boards` host is
 * exactly that case.
 *
 * Only applied as a fallback, and only for hosts whose URL shape is known, so
 * it cannot invent a company for an arbitrary page.
 */
function companyFromBoardUrl(rawUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }

  const boardHosts = [
    "greenhouse.io",
    "lever.co",
    "workable.com",
    "ashbyhq.com",
    "breezy.hr",
    "recruitee.com",
    "teamtailor.com",
  ];

  const host = url.hostname.toLowerCase();
  if (!boardHosts.some((board) => host === board || host.endsWith(`.${board}`))) {
    return undefined;
  }

  const slug = url.pathname.split("/").filter(Boolean)[0];
  if (!slug || slug.length > 40 || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    return undefined;
  }

  // Path segments that are routing, not a company.
  if (["jobs", "job", "embed", "api", "companies", "search"].includes(slug.toLowerCase())) {
    return undefined;
  }

  // "acme-corp" reads better as "Acme Corp" in the job title field.
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
