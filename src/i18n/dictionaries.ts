import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/messages/en";

/**
 * Dictionary loaders, one chunk per language, so a page only ships the
 * language it renders in.
 */
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("@/i18n/messages/en").then((m) => m.en),
  id: () => import("@/i18n/messages/id").then((m) => m.id),
  ms: () => import("@/i18n/messages/ms").then((m) => m.ms),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}

export type { Dictionary };
