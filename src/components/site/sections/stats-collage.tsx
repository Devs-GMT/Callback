"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CollageBust,
  CollageClock,
  CollageKey,
  CollageMagnifier,
  CollagePaperPlane,
  CollageRetroPhone,
} from "@/components/site/collage";
import { fetchStats } from "@/lib/chain/wallet";
import { IS_CONTRACT_DEPLOYED } from "@/lib/config";
import { formatCount, cn } from "@/lib/utils";
import {
  EASE_EDITORIAL,
  Reveal,
  SplitWords,
} from "@/components/motion/primitives";

/**
 * Section 3: stats and the collage carousel (PRD section 10).
 *
 * The brief asks for "one big rotating real stat". Real is the operative word,
 * so the only numbers here are ones that can be checked: the stamped-report
 * and re-check totals read live from the contract, and two facts about the
 * product itself that anyone can verify by using it.
 *
 * Deliberately no "94% of users got more interviews" figure. There is no study
 * behind a number like that, and inventing one on a page whose entire pitch is
 * "we never invent anything" would undercut the product.
 */

type Stat = { value: string; label: string; note: string };

const COLLAGE_CARDS: Array<{
  art: ReactNode;
  title: string;
  line: string;
}> = [
  {
    art: <CollageMagnifier />,
    title: "Get past the ATS",
    line: "Seven weighted checks on what the parser can actually read.",
  },
  {
    art: <CollagePaperPlane />,
    title: "Send better applications",
    line: "One CV, re-angled per job, instead of the same file forty times.",
  },
  {
    art: <CollageKey />,
    title: "Unlock the right keywords",
    line: "The terms this job scans for, and which ones you already have.",
  },
  {
    art: <CollageRetroPhone />,
    title: "Get the callback",
    line: "Track every application until one of them rings.",
  },
  {
    art: <CollageClock />,
    title: "Save hours per application",
    line: "Forty seconds of checking beats an evening of guessing.",
  },
  {
    art: <CollageBust />,
    title: "Keep your own voice",
    line: "Rewrites use your facts and your words — never a template.",
  },
];

export function StatsCollage() {
  const [stats, setStats] = useState<Stat[]>([
    {
      value: "7",
      label: "weighted ATS checks",
      note: "Readability, sections, contact, dates, formatting, length, bullets.",
    },
    {
      value: "3",
      label: "ways to add a CV",
      note: "Upload a PDF or Word file, paste the text, or give a public link.",
    },
  ]);
  const [statIndex, setStatIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const scrollCards = (direction: 1 | -1) => {
    const list = listRef.current;
    const card = list?.firstElementChild as HTMLElement | null;
    if (!list || !card) return;
    list.scrollBy({ left: direction * (card.offsetWidth + 16), behavior: "smooth" });
  };

  // Prepend the on-chain totals when the contract is live, so the first stat a
  // visitor sees is one they can verify on the explorer.
  useEffect(() => {
    if (!IS_CONTRACT_DEPLOYED) return;
    let cancelled = false;

    void fetchStats().then((result) => {
      if (cancelled || !result) return;
      // A "0" leads with nothing to show, so a total only appears once it has
      // something in it.
      const live: Stat[] = [];
      if (result.reports > 0) {
        live.push({
          value: formatCount(result.reports),
          label: "reports stamped on BOT Chain",
          note: "Every one verifiable on the explorer, with no personal data on-chain.",
        });
      }
      if (result.rechecks > 0) {
        live.push({
          value: formatCount(result.rechecks),
          label: "re-checks recorded",
          note: "A re-check links to the report it improved on, so progress is provable.",
        });
      }
      if (live.length > 0) setStats((current) => [...live, ...current]);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Rotate the stat on a timer, pausing for anyone who asked for less motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setStatIndex((index) => (index + 1) % stats.length),
      5200,
    );
    return () => clearInterval(timer);
  }, [stats.length]);

  const stat = stats[Math.min(statIndex, stats.length - 1)];

  return (
    <section className="section-light relative overflow-hidden py-20 md:py-32">
      {/* `minmax(0, …)` on mobile too: without it the single column grows to
          the carousel's full width (six cards, ~1,700px), the section clips
          it, and the reveals never see enough of themselves to fire —
          leaving a blank band where the stat and the cards should be. */}
      <div className="shell grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        {/* ---------- Left: headline and the rotating stat ---------- */}
        <div>
          <Reveal>
            <p className="eyebrow mb-4">Why it matters</p>
          </Reveal>
          <SplitWords
            text="The rules of applying, rewritten."
            accent={["rewritten."]}
            accentClassName="italic text-[#8a63d2]"
            className="display-2 max-w-[18ch] font-serif text-ink"
          />

          <Reveal delay={0.2} className="relative mt-10 min-h-[190px]">
            <span className="sr-only" aria-live="polite">
              {stat.value} {stat.label}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stat.label}
                aria-hidden="true"
                initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
                transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
              >
                <p className="font-serif text-[clamp(4rem,2rem+7vw,7rem)] leading-[0.9] tabular-nums text-ink">
                  {stat.value}
                </p>
                <p className="mt-3 text-[14px] font-medium text-ink">{stat.label}</p>
                <p className="mt-2 max-w-[40ch] text-[12.5px] leading-relaxed text-muted">
                  {stat.note}
                </p>
              </motion.div>
            </AnimatePresence>
          </Reveal>

          {/* Dot pager. Real buttons, so the rotation is controllable rather
              than something that only happens to you. */}
          <div className="mt-7 flex items-center gap-2">
            {stats.map((candidate, index) => (
              <button
                key={candidate.label}
                type="button"
                onClick={() => setStatIndex(index)}
                aria-label={`Show: ${candidate.label}`}
                aria-current={index === statIndex}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === statIndex
                    ? "w-7 bg-ink"
                    : "w-1.5 bg-ink/20 hover:bg-ink/40",
                )}
              />
            ))}
          </div>
        </div>

        {/* ---------- Right: the collage carousel ---------- */}
        <Reveal delay={0.15} x={40} y={0} className="min-w-0">
          {/* A scroll-snap row rather than a transform carousel: it is
              swipeable on touch, scrollable with a trackpad, keyboard
              reachable, and needs no JS to be usable at all. */}
          <ul
            ref={listRef}
            className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-6 pt-2"
            onScroll={(event) => {
              const list = event.currentTarget;
              const card = list.firstElementChild as HTMLElement | null;
              if (!card) return;
              const width = card.offsetWidth + 16;
              setCardIndex(Math.round(list.scrollLeft / width));
            }}
          >
            {COLLAGE_CARDS.map((card) => (
              <li
                key={card.title}
                className="w-[260px] shrink-0 snap-start sm:w-[286px]"
              >
                <article className="group flex h-full flex-col rounded-[18px] bg-sand p-5 transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:bg-[#f3efec] hover:shadow-[0_24px_50px_-30px_rgba(28,16,9,0.45)]">
                  <div className="mx-auto aspect-square w-full max-w-[190px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:rotate-[-4deg] group-hover:scale-[1.06]">
                    {card.art}
                  </div>
                  <h3 className="mt-5 font-serif text-[19px] leading-snug text-ink">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                    {card.line}
                  </p>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center gap-2">
              {COLLAGE_CARDS.map((card, index) => (
                <span
                  key={card.title}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === cardIndex ? "w-7 bg-ink" : "w-1.5 bg-ink/20",
                  )}
                  aria-hidden="true"
                />
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {([-1, 1] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => scrollCards(direction)}
                  aria-label={direction === -1 ? "Previous card" : "Next card"}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-ink/15 text-ink transition-all duration-300 hover:border-ink hover:bg-ink hover:text-white md:size-10"
                >
                  {direction === -1 ? (
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="size-4" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
