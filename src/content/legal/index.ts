import type { Locale } from "@/i18n/config";
import type { LegalContent } from "@/content/legal/types";
import { privacyEn } from "@/content/legal/privacy.en";
import { privacyId } from "@/content/legal/privacy.id";
import { privacyMs } from "@/content/legal/privacy.ms";
import { termsEn } from "@/content/legal/terms.en";
import { termsId } from "@/content/legal/terms.id";
import { termsMs } from "@/content/legal/terms.ms";

/**
 * The legal pages, one module per language. They are written out in full
 * rather than assembled from dictionary strings: legal copy carries emphasis,
 * lists and links mid-sentence, and each language needs its own sentence
 * order around them.
 */
export const LEGAL: Record<"privacy" | "terms", Record<Locale, LegalContent>> = {
  privacy: { en: privacyEn, id: privacyId, ms: privacyMs },
  terms: { en: termsEn, id: termsId, ms: termsMs },
};
