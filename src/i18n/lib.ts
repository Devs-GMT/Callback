import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { lib as en } from "@/i18n/messages/en/lib";
import { lib as id } from "@/i18n/messages/id/lib";
import { lib as ms } from "@/i18n/messages/ms/lib";

export type LibMessages = typeof en;

const LIB: Record<Locale, LibMessages> = { en, id, ms };

/** Messages for code that knows its locale: route handlers, the scorers. */
export function libMessages(locale: Locale = DEFAULT_LOCALE): LibMessages {
  return LIB[locale] ?? en;
}

/*
 * The browser has one language per page, set by `I18nProvider`. Client-side
 * helpers that throw user-facing errors deep inside an extraction or a wallet
 * call read it from here instead of having a locale threaded through every
 * signature. Server code never uses this: it passes its locale explicitly.
 */
let runtimeLocale: Locale = DEFAULT_LOCALE;

export function setRuntimeLocale(locale: Locale): void {
  runtimeLocale = locale;
}

export function getRuntimeLocale(): Locale {
  return runtimeLocale;
}

/** Messages in the page's language, for client-side helpers. */
export function clientMessages(): LibMessages {
  return LIB[runtimeLocale];
}
