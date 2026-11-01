import { ACTIVE_CHAIN, LIMITS } from "@/lib/config";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/motion/primitives";

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

const QUESTIONS = [
  {
    question: "Is it free?",
    answer:
      `Yes. There is a fair-use cap of ${LIMITS.analysesPerDay} analyses per day so one person can't exhaust the AI quota for everyone. Nothing is behind a payment, and there is no account to create.`,
  },
  {
    question: "Is my CV stored?",
    answer:
      "No. Files are parsed in your browser, so the file itself never leaves your device. The text is sent to our server for the AI check and is not stored or logged — it exists for the length of that one request. Your reports are saved in your browser only, and there is a button that deletes all of them.",
  },
  {
    question: "Why can't it read my LinkedIn job link?",
    answer:
      "LinkedIn and some job boards block automated reading of their pages, so there is nothing to fetch. Open the posting, copy the description, and paste it in — the analysis is identical. Company career pages, including Greenhouse, Lever, Workable and Ashby, read fine from a URL.",
  },
  {
    question: "Will it make things up?",
    answer:
      "No, and this is enforced rather than promised. A requirement only counts as matched if the model quotes the line in your CV that supports it, and we check that quote actually appears in your CV before counting it. Rewrites rephrase facts you already have. A keyword your CV does not support is never written in for you — it goes in an “add only if true” list for you to decide on.",
  },
  {
    question: "What is an ATS?",
    answer:
      "An applicant tracking system: the software most employers use to receive and filter applications. It turns your CV into text and searches it. That is why layout matters — a two-column CV gets read across the columns, so “Skills: SQL” and “Acme Corp” can end up on the same line as nonsense.",
  },
  {
    question: "What goes on BOT Chain?",
    answer:
      `Only if you choose to stamp a report: a hash of the report, a salted hash of your CV text, your two scores, the job title, the id of the earlier report it improved on, and a timestamp. No name, no email, no CV content. The CV hash is salted with a random value kept only in your browser, so nobody can confirm a guessed CV against it. The contract runs on ${ACTIVE_CHAIN.name}, chain ${ACTIVE_CHAIN.chainId}, and has no admin, no token and no payments.`,
  },
  {
    question: "Do I need a wallet?",
    answer:
      "Only to stamp. The CV check, the job match, the suggestions, the re-check, the exports and your application history all work with no wallet installed.",
  },
  {
    question: "Does it work in languages other than English?",
    answer:
      "The scoring is tuned for English and gives its best results there. Other languages will still produce a report, but treat the bullet-quality and keyword parts as rough.",
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className="section-light pb-20 md:pb-32">
      <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <p className="eyebrow mb-4">FAQ</p>
          </Reveal>
          <SplitWords
            text="The questions worth asking."
            accent={["worth"]}
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
