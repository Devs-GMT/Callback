/**
 * The languages Callback speaks.
 *
 * English is the default and keeps the unprefixed URLs (`/`, `/app`), so
 * every link shared before the site was translated still works. Indonesian
 * and Malay live under their own prefix (`/id/app`, `/ms/app`). `proxy.ts`
 * rewrites unprefixed requests onto the `[lang]` segment internally.
 *
 * This module is imported by the proxy, the server and the client, so it
 * holds plain data and pure functions only.
 */

export const LOCALES = ["en", "id", "ms"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** The cookie that remembers a language picked in the switcher. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Each language named in itself, as the switcher shows it. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
};

/** The short code the switcher shows on narrow screens. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  id: "ID",
  ms: "MS",
};

/** BCP 47 tags for `Intl` formatting and `hreflang`. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  id: "id-ID",
  ms: "ms-MY",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}

/** The locale a pathname is under, from its first segment. */
export function localeOfPath(pathname: string): Locale {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/** A pathname with any locale prefix removed: `/id/app` → `/app`. */
export function stripLocale(pathname: string): string {
  const first = pathname.split("/")[1];
  if (!isLocale(first)) return pathname || "/";
  const rest = pathname.slice(first.length + 1);
  return rest === "" ? "/" : rest;
}

/**
 * An internal href in the given locale: `/app` → `/id/app`, `/#faq` →
 * `/id#faq`. External links, mailto links and in-page anchors pass through.
 */
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const path = href.replace(/[?#].*$/, "");
  const tail = href.slice(path.length);
  const bare = stripLocale(path);
  if (locale === DEFAULT_LOCALE) return `${bare}${tail}`;
  return `/${locale}${bare === "/" ? "" : bare}${tail}`;
}

/** Fill `{name}` placeholders in a message. */
export function fmt(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
