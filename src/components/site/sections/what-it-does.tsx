"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ButtonLink } from "@/components/ui/button";
import { useActiveBlock } from "@/components/site/use-active-block";
import { CountUp, EASE_EDITORIAL, Reveal, SplitWords, Tilt } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

/**
 * Section 2: sticky-scroll "What it does" (PRD section 10).
 *
 * Four text blocks take turns as the page scrolls, while one floating white
 * product card on the right changes to match. The cards are real UI, rendered
 * with the same tokens the app uses, so what a visitor sees here is what they
 * get — a screenshot would go stale the first time a colour changed.
 *
 * Each card swap is a short 3D turn with a blur, and each card's own bars and
 * numbers animate in as it arrives, so the card reads as the product working
 * rather than a static picture of it.
 *
 * Below 1280px this becomes stacked blocks with each card inline: a sticky
 * two-column scroll narrative needs more height than a tablet in portrait has.
 */

type Block = {
  label: string;
  title: string;
  lines: string;
  href: string;
  card: ReactNode;
};

/* -------------------------------------------------------------------------- */
/* The four product cards                                                     */
/* -------------------------------------------------------------------------- */

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-[14px] bg-white p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-black/5">
      {children}
    </div>
  );
}

/** A bar that fills to `to` once it is on screen. */
function FillBar({
  to,
  className,
  delay = 0.25,
}: {
  to: number;
  className: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={cn("h-full rounded-full", className)}
      initial={{ width: "0%" }}
      whileInView={{ width: `${to}%` }}
      viewport={{ once: true }}
      transition={{ duration: 1.3, delay, ease: EASE_EDITORIAL }}
    />
  );
}

function AtsCard() {
  return (
    <CardShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1.5">ATS check</p>
          <p className="text-[13px] font-medium text-ink">alex-taylor-cv.pdf</p>
        </div>
        <p className="font-serif text-[34px] leading-none text-ink">
          <CountUp to={64} duration={1.3} />
        </p>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]">
        <FillBar to={64} className="bg-[#d9a93a]" />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {[
          <>
            <span className="text-mint-ink" aria-hidden="true">✓</span>
            Experience, Education and Skills found
          </>,
          <>
            <span className="text-mint-ink" aria-hidden="true">✓</span>
            Email, phone and LinkedIn present
          </>,
          <>
            <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-yellow px-2 py-[3px] text-[11px] font-medium text-yellow-ink">
              <span aria-hidden="true">⚠</span>2-column layout
            </span>
            <span className="text-muted">columns get read out of order</span>
          </>,
        ].map((row, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + index * 0.12, duration: 0.6, ease: EASE_EDITORIAL }}
            className="flex items-center gap-2 text-[12px] text-ink"
          >
            {row}
          </motion.li>
        ))}
      </ul>
    </CardShell>
  );
}

function RequirementCard() {
  return (
    <CardShell>
      <p className="eyebrow mb-3">Job match · requirement 4 of 16</p>

      <p className="text-[13.5px] leading-snug text-ink">
        Build and maintain SQL dashboards for non-technical stakeholders
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-[4px] bg-ink/[0.06] px-2 py-[3px] text-[11px] font-medium text-muted">
          Must-have
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, type: "spring", stiffness: 380, damping: 16 }}
          className="inline-flex items-center gap-1.5 rounded-[4px] bg-coral px-2 py-[3px] text-[11px] font-medium text-coral-ink"
        >
          <span aria-hidden="true">✗</span>Missing
        </motion.span>
      </div>

      <p className="mt-3 rounded-[6px] bg-sand px-3 py-2.5 text-[12px] leading-relaxed text-muted">
        Your CV says &ldquo;managed data&rdquo; — no quote supports SQL
        dashboards, so this isn&apos;t counted.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {["SQL", "Tableau", "stakeholders", "Python"].map((keyword, index) => (
          <motion.span
            key={keyword}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 + index * 0.07 }}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              index % 2 === 0 ? "bg-coral/40 text-coral-ink" : "bg-mint text-mint-ink",
            )}
          >
            {keyword}
          </motion.span>
        ))}
      </div>
    </CardShell>
  );
}

function RewriteCard() {
  return (
    <CardShell>
      <p className="eyebrow mb-3">What to pivot · rewrite</p>

      <div className="overflow-hidden rounded-[6px] border border-line">
        <div className="relative border-b border-line bg-coral/20 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.1em] text-coral-ink">
            Before
          </p>
          <p className="relative inline text-[12px] leading-relaxed text-ink">
            Responsible for managing data and reporting
            <motion.span
              className="absolute left-0 top-1/2 h-px w-full origin-left bg-coral-ink/60"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.45, duration: 0.7, ease: EASE_EDITORIAL }}
              aria-hidden="true"
            />
          </p>
        </div>
        <motion.div
          className="bg-mint/25 px-3 py-2.5"
          initial={{ opacity: 0, y: -8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9, duration: 0.7, ease: EASE_EDITORIAL }}
        >
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.1em] text-mint-ink">
            After
          </p>
          <p className="text-[12px] leading-relaxed text-ink">
            Built weekly{" "}
            <mark className="rounded-[2px] bg-lilac-soft px-0.5 text-ink">SQL</mark>{" "}
            reports for 4 teams, cutting manual reporting by 6 hours a week
          </p>
        </motion.div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11.5px] leading-relaxed text-muted">
          Same facts, the job&apos;s language.
        </p>
        <span className="rounded-[4px] bg-espresso px-2.5 py-1 text-[11px] font-medium text-white">
          Accept
        </span>
      </div>
    </CardShell>
  );
}

function RecheckCard() {
  return (
    <CardShell>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Re-check</p>
        <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-mint px-2 py-[3px] text-[11px] font-medium text-mint-ink">
          <span className="relative flex size-1.5">
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-mint-ink" />
            <span className="relative size-1.5 rounded-full bg-mint-ink" />
          </span>
          Re-checked
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {[
          { label: "ATS score", from: 64, to: 88, unit: "" },
          { label: "Job match", from: 58, to: 81, unit: "%" },
        ].map((row, index) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-medium text-ink">{row.label}</span>
              <span className="font-serif text-[18px] text-ink">
                <span className="text-muted">
                  {row.from}
                  {row.unit}
                </span>
                <span className="mx-1.5 text-muted" aria-hidden="true">
                  →
                </span>
                <CountUp
                  from={row.from}
                  to={row.to}
                  delay={0.4 + index * 0.2}
                  suffix={row.unit}
                />
              </span>
            </div>
            <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-ink/25"
                style={{ width: `${row.from}%` }}
              />
              <motion.div
                className="absolute inset-y-0 rounded-full bg-[#4f9c76]"
                style={{ left: `${row.from}%` }}
                initial={{ width: "0%" }}
                whileInView={{ width: `${row.to - row.from}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.4 + index * 0.2, ease: EASE_EDITORIAL }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

/* -------------------------------------------------------------------------- */

const BLOCKS: Block[] = [
  {
    label: "ATS check",
    title: "See what the robot sees",
    lines:
      "Seven weighted checks on whether an applicant tracking system can actually read your CV. Every point is accounted for, with a one-line fix.",
    href: "/app",
    card: <AtsCard />,
  },
  {
    label: "Job match",
    title: "Every requirement, with evidence",
    lines:
      "We pull the job apart into must-haves and nice-to-haves, then check each one against your CV — and quote the line that proves it.",
    href: "/app",
    card: <RequirementCard />,
  },
  {
    label: "What to pivot",
    title: "Your words, re-angled",
    lines:
      "Bullet rewrites in the job's own language, built only from what your CV already says. Keywords you can't back up go in a list you approve.",
    href: "/app",
    card: <RewriteCard />,
  },
  {
    label: "Re-check & export",
    title: "Proof that it worked",
    lines:
      "Accept the changes you agree with, re-check, and watch both scores move. Then export the CV as an ATS-friendly .docx.",
    href: "/app",
    card: <RecheckCard />,
  },
];

export function WhatItDoes() {
  const { active, register } = useActiveBlock(BLOCKS.length);

  return (
    <section id="features" className="section-dark relative overflow-clip pb-20 pt-12 md:py-32">
      <div
        className="glow-lilac pointer-events-none absolute -left-60 top-1/3 size-[620px] opacity-25 blur-3xl"
        aria-hidden="true"
      />

      <div className="shell relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <p className="eyebrow eyebrow-on-dark mb-4">What it does</p>
            </Reveal>
            <SplitWords
              text="Callback works your application end-to-end, from CV to apply."
              accent={["end-to-end,"]}
              className="display-2 max-w-[18ch] font-serif text-white"
            />
          </div>
          <Reveal delay={0.3} className="hidden xl:block">
            <p className="font-serif text-[15px] text-muted-dark">
              <span className="text-white">0{active + 1}</span> / 0{BLOCKS.length}
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-12 xl:grid-cols-2 xl:gap-20">
          {/* ---------- Left: the four text blocks ---------- */}
          <div className="relative flex flex-col gap-14 xl:gap-0 xl:pl-10">
            {/* Progress rail, desktop only. */}
            <div
              className="absolute bottom-24 left-0 top-24 hidden w-px bg-espresso-line xl:block"
              aria-hidden="true"
            >
              <motion.div
                className="w-px bg-lilac"
                animate={{ height: `${((active + 1) / BLOCKS.length) * 100}%` }}
                transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
              />
            </div>

            {BLOCKS.map((block, index) => (
              <div
                key={block.label}
                ref={register(index)}
                className={cn(
                  "relative transition-opacity duration-500 xl:py-28",
                  index === active ? "xl:opacity-100" : "xl:opacity-30",
                )}
              >
                <span
                  className={cn(
                    "absolute -left-10 top-[7.6rem] hidden size-2 -translate-x-1/2 rounded-full transition-colors duration-500 xl:block",
                    index <= active ? "bg-lilac" : "bg-espresso-line",
                  )}
                  aria-hidden="true"
                />
                <Reveal y={20}>
                  <p className="eyebrow eyebrow-on-dark mb-3">
                    <span className="mr-2 font-serif text-[13px] normal-case tracking-normal text-lilac">
                      0{index + 1}
                    </span>
                    {block.label}
                  </p>
                  <h3 className="font-serif text-[28px] leading-tight text-white md:text-[34px]">
                    {block.title}
                  </h3>
                  <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-muted-dark">
                    {block.lines}
                  </p>
                  <ButtonLink
                    href={block.href}
                    tone="outline"
                    on="dark"
                    size="sm"
                    className="mt-6"
                  >
                    Learn more
                  </ButtonLink>
                </Reveal>

                {/* The matching card, inline below each block, on anything
                    narrower than the two-column layout. */}
                <Reveal y={36} scale={0.97} className="mt-8 max-w-[440px] xl:hidden">
                  {block.card}
                </Reveal>
              </div>
            ))}
          </div>

          {/* ---------- Right: one sticky card that swaps ---------- */}
          <div className="hidden xl:block">
            <div className="sticky top-[18vh] flex h-[64vh] items-center justify-center">
              <div className="relative w-full max-w-[440px] [perspective:1200px]">
                {/* Paper sheets behind the card, so it sits on a pile. */}
                <div
                  className="absolute inset-0 translate-x-5 translate-y-5 rotate-[4deg] rounded-[14px] bg-white/[0.06]"
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-0 -translate-x-3 translate-y-2.5 -rotate-[3deg] rounded-[14px] bg-lilac/20"
                  aria-hidden="true"
                />

                <Tilt max={5}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={active}
                      initial={{ opacity: 0, rotateX: -18, y: 40, filter: "blur(8px)" }}
                      animate={{ opacity: 1, rotateX: 0, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, rotateX: 14, y: -30, filter: "blur(6px)" }}
                      transition={{ duration: 0.55, ease: EASE_EDITORIAL }}
                      className="relative"
                    >
                      {BLOCKS[active].card}
                    </motion.div>
                  </AnimatePresence>
                </Tilt>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
