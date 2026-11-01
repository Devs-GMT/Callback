import type { ReactNode } from "react";
import Link from "next/link";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";

/**
 * Shell for the privacy and terms pages.
 *
 * They are linked from the footer, so they have to exist — a legal link that
 * 404s is worse than no link. The content is written to match what the app
 * actually does rather than to cover every eventuality: a privacy policy that
 * claims more data collection than the product performs is as misleading as
 * one that claims less.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <Navbar surface="light" />

      <main id="main" className="section-light pb-24 pt-16">
        <div className="shell max-w-[760px]">
          <p className="eyebrow mb-4">{updated}</p>
          <h1 className="display-2 font-serif text-ink">{title}</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">{intro}</p>

          <div className="mt-12 flex flex-col gap-10">{children}</div>

          <p className="mt-14 border-t border-line pt-6 text-[12.5px] text-muted">
            Questions about any of this?{" "}
            <Link
              href="/#faq"
              className="underline decoration-line underline-offset-2 transition-colors hover:decoration-ink"
            >
              The FAQ
            </Link>{" "}
            covers the same ground in plainer language.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/** One titled block of legal copy. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-serif text-[22px] leading-snug text-ink">{heading}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[13.5px] leading-relaxed text-muted [&_a]:text-ink [&_a]:underline [&_a]:decoration-line [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}
