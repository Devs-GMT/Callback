import type { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Hero } from "@/components/site/sections/hero";
import { WhatItDoes } from "@/components/site/sections/what-it-does";
import { StatsCollage } from "@/components/site/sections/stats-collage";
import { SampleStory } from "@/components/site/sections/sample-story";
import { Trusted } from "@/components/site/sections/trusted";
import { HowItWorks } from "@/components/site/sections/how-it-works";
import { Tracker } from "@/components/site/sections/tracker";
import { Integrations } from "@/components/site/sections/integrations";
import { Faq } from "@/components/site/sections/faq";
import { ClosingCta } from "@/components/site/sections/closing-cta";
import { SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Callback — Get the callback",
  description:
    "Upload your CV, paste a job, and see your ATS score, your match and exactly what to change. Free, no account, and your CV is never stored.",
  alternates: { canonical: SITE_URL },
};

/**
 * The marketing site (PRD section 10), in the order the brief specifies.
 *
 * The sections alternate espresso and near-white deliberately: hero and "what
 * it does" are dark, the middle of the page opens up into light, and the two
 * dark rounded panels (how it works, integrations) sit inside light sections
 * rather than becoming full-width dark bands. That rhythm is what stops a
 * ten-section page reading as ten slabs.
 */
export default function HomePage() {
  return (
    <>
      <Navbar />

      <main id="main">
        {/* 1 */} <Hero />
        {/* 2 */} <WhatItDoes />
        {/* 3 */} <StatsCollage />
        {/* 4 */} <SampleStory />
        {/* 5 */} <Trusted />
        {/* 6 */} <HowItWorks />
        {/* 7 */} <Tracker />
        {/* 8 */} <Integrations />
        {/* 9 */} <Faq />
        {/* 10 */} <ClosingCta />
      </main>

      <SiteFooter />
    </>
  );
}
