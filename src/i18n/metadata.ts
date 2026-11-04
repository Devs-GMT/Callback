import { SITE_URL } from "@/lib/config";
import { LOCALES, LOCALE_TAGS, localizeHref } from "@/i18n/config";

/**
 * `hreflang` alternates for a path, so search engines index each language
 * as its own page and show people the one in their language.
 */
export function languageAlternates(path: string): Record<string, string> {
  const entries = LOCALES.map((locale) => [
    LOCALE_TAGS[locale],
    `${SITE_URL}${localizeHref(path, locale)}`,
  ]);
  return {
    ...Object.fromEntries(entries),
    "x-default": `${SITE_URL}${path}`,
  };
}

/** The canonical URL of a path in one language. */
export function canonicalUrl(path: string, locale: (typeof LOCALES)[number]): string {
  return `${SITE_URL}${localizeHref(path, locale)}`;
}
