import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  stripLocale,
  type Locale,
} from "@/i18n/config";

/**
 * Locale routing.
 *
 * Every page lives under `app/[lang]`, but English keeps the unprefixed URLs:
 *
 *   /app        → rewritten to /en/app (the URL does not change)
 *   /en/app     → redirected to /app, so English has one canonical URL
 *   /id/app     → served as is
 *
 * A first-time visitor whose browser prefers Indonesian or Malay is sent to
 * that prefix once. After that the switcher's cookie decides, so someone who
 * picks English on an Indonesian browser is not bounced back.
 */

function preferredLocale(request: NextRequest): Locale | null {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;

  const header = request.headers.get("accept-language");
  if (!header) return null;

  // "id-ID,id;q=0.9,en;q=0.8" → ordered by quality.
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    // Indonesian browsers sometimes still send the legacy "in" code.
    if (base === "in") return "id";
    if (isLocale(base)) return base;
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];

  // /en/... → /... : English is served without a prefix.
  if (first === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = stripLocale(pathname);
    return NextResponse.redirect(url, 308);
  }

  if (isLocale(first)) return NextResponse.next();

  const preferred = preferredLocale(request);
  if (preferred && preferred !== DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals and files with an
    // extension (images, fonts, the favicon, robots.txt).
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
