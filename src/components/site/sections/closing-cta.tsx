import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { TornPaper } from "@/components/site/torn-photo";
import { Magnetic, Parallax, Reveal, SplitWords } from "@/components/motion/primitives";
import rotaryPhone from "../../../../public/images/rotary-phone.jpg";
import { getI18n } from "@/i18n/server";

/**
 * Section 10: the closing CTA (PRD section 10).
 *
 * One headline, two buttons, and the object the brand is named for: a rotary
 * phone with its handset lifted, set on torn lilac paper. The photo is shot on
 * white, so a multiply blend drops its background into the sand panel and it
 * reads as a cut-out rather than a rectangle.
 */
export async function ClosingCta() {
  const cl = (await getI18n()).t.site.closing;
  return (
    <section className="section-light pb-24 md:pb-32">
      <div className="shell">
        <Reveal
          scale={0.97}
          y={50}
          className="relative overflow-hidden rounded-[var(--radius-panel)] bg-sand px-6 py-16 md:px-12 md:py-24"
        >
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="text-center lg:text-left">
              <p className="eyebrow mb-5">{cl.eyebrow}</p>

              <SplitWords
                text={cl.title}
                accent={[cl.titleAccent]}
                accentClassName="italic text-[#8a63d2]"
                className="display-1 mx-auto max-w-[16ch] font-serif text-ink lg:mx-0"
              />

              <Reveal delay={0.3}>
                <p className="mx-auto mt-6 max-w-[48ch] text-[15px] leading-relaxed text-muted lg:mx-0">
                  {cl.lede}
                </p>

                <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Magnetic>
                    <ButtonLink href="/app" size="lg" className="group">
                      {cl.cta}
                      <ArrowRight
                        className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </ButtonLink>
                  </Magnetic>
                  <ButtonLink href="/#sample" tone="outline" size="lg">
                    {cl.sample}
                  </ButtonLink>
                </div>

                <p className="mt-6 text-[11.5px] text-muted">
                  {cl.small}
                </p>
              </Reveal>
            </div>

            {/* ---------- The phone collage ---------- */}
            <div className="relative mx-auto aspect-square w-full max-w-[420px]" aria-hidden="true">
              <TornPaper
                id="cta-paper-lilac"
                seed={42}
                amplitude={0.045}
                className="absolute inset-[6%] rotate-[-6deg] text-lilac/70"
              />
              <TornPaper
                id="cta-paper-yellow"
                seed={17}
                className="absolute bottom-[4%] right-0 h-[38%] w-[46%] rotate-[8deg] text-yellow"
              />
              <Parallax offset={36} className="absolute inset-0 mix-blend-multiply">
                <Image
                  src={rotaryPhone}
                  alt=""
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1024px) 420px, 80vw"
                  className="photo-cutout object-contain"
                />
              </Parallax>

              {/* Ring lines around the lifted handset. */}
              <svg
                viewBox="0 0 100 100"
                className="absolute left-[8%] top-[10%] size-[26%] animate-pulse text-ink"
              >
                <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M30 70c-12-12-12-32 0-44" />
                  <path d="M18 80c-18-18-18-46 0-64" />
                </g>
              </svg>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
