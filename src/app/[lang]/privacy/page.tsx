import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { LEGAL } from "@/content/legal";
import { getLocale } from "@/i18n/server";
import { canonicalUrl, languageAlternates } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = LEGAL.privacy[locale];
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: canonicalUrl("/privacy", locale),
      languages: languageAlternates("/privacy"),
    },
  };
}

export default async function PrivacyPage() {
  const content = LEGAL.privacy[await getLocale()];
  const { Body } = content;
  return (
    <LegalPage title={content.title} updated={content.updated} intro={content.intro}>
      <Body />
    </LegalPage>
  );
}
