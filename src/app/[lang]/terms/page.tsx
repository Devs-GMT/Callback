import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { LEGAL } from "@/content/legal";
import { getLocale } from "@/i18n/server";
import { canonicalUrl, languageAlternates } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = LEGAL.terms[locale];
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: canonicalUrl("/terms", locale),
      languages: languageAlternates("/terms"),
    },
  };
}

export default async function TermsPage() {
  const content = LEGAL.terms[await getLocale()];
  const { Body } = content;
  return (
    <LegalPage title={content.title} updated={content.updated} intro={content.intro}>
      <Body />
    </LegalPage>
  );
}
