"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { setRuntimeLocale } from "@/i18n/lib";
import type { Dictionary } from "@/i18n/messages/en";

type I18nValue = { locale: Locale; t: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Hands the route's dictionary to client components.
 *
 * The root layout loads one language on the server and passes it here, so
 * client components read strings synchronously and never fetch a catalogue.
 */
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  // Idempotent, and needed before any effect or handler runs.
  setRuntimeLocale(locale);
  return (
    <I18nContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>.");
  return value;
}
