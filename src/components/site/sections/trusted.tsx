"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActiveBlock } from "@/components/site/use-active-block";
import { TornPaper, TornPhoto } from "@/components/site/torn-photo";
import { EASE_EDITORIAL, Reveal, SplitWords } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

import portraitPhoto from "../../../../public/images/portrait-trust.jpg";

/**
 * Section 5: built to be trusted (PRD section 10).
 *
 * A list of serif headings that brighten as they reach the centre of the
 * viewport, with the active heading's description shown alongside, and a
 * collage in the middle: a monochrome portrait on torn peach paper with a
 * small UI card overlaid.
 *
 * Every description stays in the DOM for screen readers and search engines
 * (the visible one is animated in separately), because a scroll-driven reveal
 * that hides content from assistive technology is not a trust signal.
 */

const TONES = ["yellow", "lilac", "mint", "stone"] as const;

const TONE: Record<(typeof TONES)[number], string> = {
  yellow: "bg-yellow text-yellow-ink",
  lilac: "bg-lilac-soft text-[#5b3d99]",
  mint: "bg-mint text-mint-ink",
  stone: "bg-stone text-[#5c4f47]",
};

export function Trusted() {
  const tr = useI18n().t.site.trusted;
  const PILLARS = tr.pillars.map((pillar, index) => ({
    heading: pillar.heading,
    body: pillar.body,
    card: { label: pillar.cardLabel, text: pillar.cardText, tone: TONES[index] },
  }));
  const { active, register, setActive } = useActiveBlock(PILLARS.length);
  const current = PILLARS[active];

  // overflow-x-clip: the tilted torn-paper frame pokes a few pixels past the
  // edge on phones, which let the whole page wobble sideways. Clip, not
  // hidden, so nothing inside stops being sticky.
  return (
    <section id="who" className="section-light relative overflow-x-clip py-20 md:py-32">
      <div className="shell">
        <Reveal>
          <p className="eyebrow mb-4">{tr.eyebrow}</p>
        </Reveal>
        <SplitWords
          text={tr.title}
          accent={[tr.titleAccent]}
          accentClassName="italic text-[#8a63d2]"
          className="display-2 max-w-[22ch] font-serif text-ink"
        />

        <div className="mt-16 grid gap-14 lg:grid-cols-[1fr_0.9fr_1fr] lg:gap-12">
          {/* ---------- Left: the fading list ---------- */}
          <ol className="flex flex-col">
            {PILLARS.map((pillar, index) => (
              <li
                key={pillar.heading}
                ref={register(index)}
                className="relative border-t border-line first:border-t-0"
              >
                {index === active ? (
                  <motion.span
                    layoutId="trusted-indicator"
                    className="absolute -left-4 top-7 hidden h-8 w-[3px] rounded-full bg-lilac lg:block"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    aria-hidden="true"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-current={index === active}
                  className={cn(
                    "flex w-full items-baseline gap-4 py-6 text-left transition-all duration-500 motion-reduce:transition-none",
                    index === active
                      ? "opacity-100 lg:translate-x-1"
                      : "opacity-30 hover:opacity-70",
                  )}
                >
                  <span className="font-serif text-[13px] tabular-nums text-muted">
                    0{index + 1}
                  </span>
                  <span className="font-serif text-[clamp(1.5rem,1.1rem+1.2vw,2.15rem)] leading-tight text-ink">
                    {pillar.heading}
                  </span>
                </button>

                {/* The body also lives here, visible below the lg breakpoint,
                    where there is no third column to put it in. */}
                <p className="pb-6 text-[13.5px] leading-relaxed text-muted lg:hidden">
                  {pillar.body}
                </p>
              </li>
            ))}
          </ol>

          {/* ---------- Centre: the collage ---------- */}
          <Reveal
            scale={0.94}
            className="relative order-first mx-auto w-full max-w-[340px] lg:order-none lg:max-w-none"
          >
            <TornPaper
              id="trusted-paper"
              seed={31}
              amplitude={0.04}
              className="absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] rotate-[-3deg] text-peach"
            />
            <TornPhoto
              id="trusted-photo"
              src={portraitPhoto}
              alt={tr.photoAlt}
              seed={5}
              className="relative aspect-[4/5] w-full rotate-[2deg]"
              imageClassName="photo-mono object-[66%_40%]"
              sizes="(min-width: 1024px) 380px, 80vw"
            />

            {/* A lilac circle cut-out, the shared collage accent. */}
            <motion.span
              className="absolute -right-5 top-8 size-20 rounded-full bg-lilac mix-blend-multiply"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />

            <div className="absolute -bottom-6 -right-3 left-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
                  className="rounded-[14px] border border-line bg-white p-3.5 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.5)]"
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      "mb-2 inline-block rounded-[4px] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.1em]",
                      TONE[current.card.tone],
                    )}
                  >
                    {current.card.label}
                  </span>
                  <p className="text-[12.5px] leading-relaxed text-ink">{current.card.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>

          {/* ---------- Right: the active description ---------- */}
          <div className="hidden lg:block">
            <div className="sticky top-[34vh]">
              <ul className="sr-only">
                {PILLARS.map((pillar) => (
                  <li key={pillar.heading}>{pillar.body}</li>
                ))}
              </ul>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  aria-hidden="true"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
                >
                  <p className="font-serif text-[22px] leading-snug text-ink">
                    {current.heading}
                  </p>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
                    {current.body}
                  </p>
                  <div className="mt-6 h-px w-full bg-line">
                    <motion.div
                      className="h-px bg-ink"
                      initial={{ width: "0%" }}
                      animate={{ width: `${((active + 1) / PILLARS.length) * 100}%` }}
                      transition={{ duration: 0.8, ease: EASE_EDITORIAL }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
