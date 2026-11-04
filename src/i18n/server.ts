import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

/**
 * The locale of the current route, read from the `[lang]` root segment.
 *
 * Read through `next/root-params` rather than passed down as a prop, so any
 * server component can ask for it, and cached work keys on it automatically.
 */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The locale and its dictionary, for server components. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: await getDictionary(locale) };
}
