import { ButtonLink } from "@/components/ui/button";
import { TornPaper, TornPhoto } from "@/components/site/torn-photo";
import { CountUp, Parallax, Reveal, SplitWords } from "@/components/motion/primitives";
import personaPhoto from "../../../../public/images/persona-alex.jpg";

/**
 * Section 4: the sample report story (PRD section 10).
 *
 * This sits where a customer testimonial normally would, and the PRD is
 * explicit that it must read as a sample rather than a real customer. So Alex
 * is labelled as a sample persona in the attribution, in a tag, and in the
 * photo caption — the photograph is a stock image illustrating the persona,
 * not a person who used the product.
 *
 * That honesty is the point. A product that promises never to invent your
 * experience cannot open with an invented customer.
 */
export function SampleStory() {
  return (
    <section id="sample" className="section-light relative overflow-hidden py-20 md:py-32">
      <div className="shell grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        {/* ---------- The quote ---------- */}
        <div>
          <Reveal>
            <p className="eyebrow mb-6">A sample report</p>
          </Reveal>

          <blockquote>
            <span
              className="pointer-events-none -mb-6 block select-none font-serif text-[120px] leading-none text-lilac"
              aria-hidden="true"
            >
              &ldquo;
            </span>
            <SplitWords
              as="p"
              text="My CV said ‘managed data’. The job asked for ‘SQL dashboards for stakeholders’. Callback showed me the gap — and how to say what I'd actually done."
              stagger={0.025}
              accent={["gap"]}
              accentClassName="italic text-[#8a63d2]"
              className="font-serif text-[clamp(1.5rem,1.05rem+1.9vw,2.4rem)] leading-[1.28] text-ink"
            />

            <Reveal delay={0.4}>
              <footer className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-script text-[34px] leading-none text-ink">Alex</span>
                <span className="rounded-[4px] bg-stone px-2 py-[3px] text-[11px] font-medium text-[#5c4f47]">
                  Sample persona
                </span>
                <cite className="text-[12.5px] not-italic text-muted">
                  Junior Data Analyst · not a real customer
                </cite>
              </footer>
            </Reveal>
          </blockquote>

          <Reveal delay={0.2} className="mt-9 rounded-[18px] bg-sand p-6">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <p className="eyebrow mb-1.5">Before</p>
                <p className="font-serif text-[34px] leading-none text-muted">
                  58<span className="text-[17px]">%</span>
                </p>
              </div>
              <span className="pb-1 font-serif text-[24px] text-muted" aria-hidden="true">
                →
              </span>
              <div>
                <p className="eyebrow mb-1.5">After three rewrites</p>
                <p className="font-serif text-[34px] leading-none text-ink">
                  <CountUp
                    from={58}
                    to={81}
                    delay={0.3}
                    suffix={<span className="text-[17px] text-muted">%</span>}
                  />
                </p>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
              Alex accepted three bullet rewrites and a new summary, then
              re-checked. No new experience was added — the same facts, said in
              the job&apos;s language.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <ButtonLink href="/app" tone="outline" size="lg" className="mt-8">
              Open the sample report
            </ButtonLink>
          </Reveal>
        </div>

        {/* ---------- The persona collage ---------- */}
        <Reveal scale={0.94} y={40} className="relative mx-auto w-full max-w-[460px]">
          {/* Layered torn paper behind the photo. */}
          <TornPaper
            id="persona-paper-lilac"
            seed={21}
            className="absolute -left-6 -top-6 h-[88%] w-[78%] rotate-[-5deg] text-lilac"
          />
          <TornPaper
            id="persona-paper-peach"
            seed={8}
            className="absolute -bottom-5 -right-5 h-[70%] w-[82%] rotate-[4deg] text-peach"
          />

          <Parallax offset={22}>
            <TornPhoto
              id="persona-photo"
              src={personaPhoto}
              alt="Stock photo illustrating Alex, the sample persona, working at a laptop"
              seed={14}
              amplitude={0.016}
              className="relative aspect-[4/5] w-full rotate-[1.5deg]"
              imageClassName="photo-warm object-[72%_50%]"
              sizes="(min-width: 1024px) 460px, 90vw"
            />
          </Parallax>

          {/* Tape strips holding the photo on the page. */}
          <span
            className="absolute -top-2 left-1/2 h-7 w-24 -translate-x-1/2 rotate-[-4deg] bg-[#f7e6b0]/80 shadow-sm"
            aria-hidden="true"
          />

          {/* The evidence card, overlapping the photo's lower edge. */}
          <Reveal
            delay={0.5}
            y={24}
            className="absolute -bottom-8 -left-4 right-10 sm:-left-10"
          >
            <div className="animate-float-slow rounded-[14px] border border-line bg-white p-4 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.5)]">
              <p className="eyebrow mb-1.5">Evidence from the CV</p>
              <p className="text-[13px] italic leading-relaxed text-ink">
                &ldquo;Built weekly SQL reports for 4 teams&rdquo;{" "}
                <span className="not-italic text-mint-ink" aria-hidden="true">
                  ✓
                </span>
              </p>
            </div>
          </Reveal>

          <Reveal
            delay={0.7}
            className="absolute -right-3 top-10 sm:-right-8"
          >
            <div
              className="animate-float-slower rounded-full bg-espresso px-3.5 py-2 text-[11.5px] font-medium text-white shadow-lg"
              style={{ ["--float-rotate" as string]: "3deg" }}
            >
              Match 81% ✦
            </div>
          </Reveal>
        </Reveal>
      </div>
    </section>
  );
}
