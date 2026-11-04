import { ACTIVE_CHAIN, LIMITS } from "@/lib/config";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/motion/primitives";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";

/**
 * Section 9: the FAQ (PRD section 10).
 *
 * Built on native `<details>` elements. An accordion is one of the few UI
 * patterns the platform already does correctly — keyboard operable, announced
 * properly, findable by the browser's own in-page search, and open by default
 * if JavaScript never runs. Reimplementing it with state and ARIA would be
 * strictly worse here.
 *
 * The answers are the ones PRD section 10 lists, written to actually answer
 * rather than to reassure.
 */



export async function Faq() {
  const fq = (await getI18n()).t.site.faq;
  const values = {
    limit: LIMITS.analysesPerDay,
    chain: ACTIVE_CHAIN.name,
    chainId: ACTIVE_CHAIN.chainId,
  };
  const QUESTIONS = fq.items.map((item) => ({
    question: item.question,
    answer: fmt(item.answer, values),
  }));
  return (
    <section id="faq" className="section-light pb-20 md:pb-32">
      <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <p className="eyebrow mb-4">{fq.eyebrow}</p>
          </Reveal>
          <SplitWords
            text={fq.title}
            accent={[fq.titleAccent]}
            accentClassName="italic text-[#8a63d2]"
            className="display-2 max-w-[18ch] font-serif text-ink"
          />
        </div>

        <Stagger gap={0.06} className="border-t border-line">
          {QUESTIONS.map((item) => (
            <StaggerItem key={item.question} y={16}>
            <details className="faq-item group border-b border-line">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left">
                <span className="font-serif text-[18px] leading-snug text-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5 md:text-[21px]">
                  {item.question}
                </span>

                {/* A plus that becomes a minus. Drawn with two bars so there
                    is no icon dependency and no font fallback to go wrong. */}
                <span
                  className="relative mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-all duration-500 group-hover:border-ink/40 group-open:rotate-180 group-open:border-espresso group-open:bg-espresso group-open:text-white"
                  aria-hidden="true"
                >
                  <span className="relative size-3.5">
                  <span className="absolute left-0 top-1/2 h-[1.5px] w-3.5 -translate-y-1/2 bg-current" />
                  <span className="absolute left-1/2 top-0 h-3.5 w-[1.5px] -translate-x-1/2 bg-current transition-transform duration-300 group-open:scale-y-0 motion-reduce:transition-none" />
                  </span>
                </span>
              </summary>

              <p className="max-w-[72ch] pb-6 text-[13.5px] leading-relaxed text-muted">
                {item.answer}
              </p>
            </details>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
