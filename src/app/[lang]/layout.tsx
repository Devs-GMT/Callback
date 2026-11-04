import type { Metadata, Viewport } from "next";
import { Caveat, Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { notFound } from "next/navigation";
import { MotionProvider } from "@/components/motion/primitives";
import { I18nProvider } from "@/i18n/client";
import { LOCALES, LOCALE_TAGS, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getI18n } from "@/i18n/server";
import { languageAlternates } from "@/i18n/metadata";

/* PRD §9 type direction: refined serif headlines, small clean sans for body
   and UI, a handwritten script reserved for small touches (the signature in
   §10 §4 and "Follow us" in §13). */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

/** Every language is prerendered; Cache Components needs at least one value. */
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const m = t.meta;
  return {
    title: {
      default: m.siteTitle,
      template: "%s · Callback",
    },
    description: m.siteDescription,
    applicationName: "Callback",
    keywords: m.keywords,
    alternates: { languages: languageAlternates("/") },
    openGraph: {
      title: m.siteTitle,
      description: m.shareDescription,
      siteName: "Callback",
      type: "website",
      locale: LOCALE_TAGS[locale].replace("-", "_"),
    },
    twitter: {
      card: "summary_large_image",
      title: m.siteTitle,
      description: m.shareDescription,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFCFC" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1009" },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = await getDictionary(lang);

  return (
    <html
      lang={lang}
      className={`${newsreader.variable} ${inter.variable} ${caveat.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-cream text-ink">
        <I18nProvider locale={lang} dictionary={dictionary}>
          <MotionProvider>{children}</MotionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
