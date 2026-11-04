"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, FileText, Briefcase, Gauge, Sparkles } from "lucide-react";
import { useActiveBlock } from "@/components/site/use-active-block";
import { EASE_EDITORIAL, Parallax, Reveal, SplitWords } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

/**
 * Section 6: how it works (PRD section 10).
 *
 * A dark rounded panel with numbered steps on the left, where only the active
 * step is bright, and a stack of white "synced" cards on the right that turn
 * from a loading placeholder into a ticked item as each step becomes active.
 * A pile of paper CV pages drifts up along the bottom edge as you scroll.
 */

export function HowItWorks() {
  const hw = useI18n().t.site.how;
  const STEPS = hw.steps.map((step, index) => ({ ...step, number: `0${index + 1}` }));
  const y = hw.synced;
  const SYNCED = [
    { label: "alex-taylor-cv.pdf", status: y.read, icon: FileText },
    { label: y.job, status: y.read, icon: Briefcase },
    { label: y.report, status: y.ready, icon: Gauge },
    { label: y.improved, status: y.rechecked, icon: Sparkles },
  ];

  const { active, register, setActive } = useActiveBlock(STEPS.length);

  return (
    <section id="how" className="section-light pb-20 pt-2 md:py-28">
      <div className="shell">
        <Reveal
          scale={0.97}
          y={50}
          className="grain relative overflow-hidden rounded-[var(--radius-panel)] bg-espresso px-6 pb-32 pt-14 md:px-12 md:pb-36 md:pt-20"
        >
          <div
            className="glow-lilac pointer-events-none absolute -right-32 -top-32 size-[520px] opacity-30 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* ---------- Left: the steps ---------- */}
            <div>
              <p className="eyebrow eyebrow-on-dark mb-4">{hw.eyebrow}</p>
              <SplitWords
                text={hw.title}
                accent={[hw.titleAccent]}
                className="display-2 max-w-[20ch] font-serif text-white"
              />

              <ol className="mt-12 flex flex-col">
                {STEPS.map((step, index) => (
                  <li
                    key={step.number}
                    ref={register(index)}
                    className="relative border-t border-espresso-line first:border-t-0"
                  >
                    {/* The rule above each step fills as it becomes active. */}
                    <motion.span
                      className="absolute -top-px left-0 h-px bg-lilac"
                      initial={false}
                      animate={{ width: index <= active && index > 0 ? "100%" : "0%" }}
                      transition={{ duration: 0.8, ease: EASE_EDITORIAL }}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      aria-current={index === active}
                      className={cn(
                        "flex w-full items-baseline gap-5 py-5 text-left transition-opacity duration-500 motion-reduce:transition-none",
                        index === active ? "opacity-100" : "opacity-40 hover:opacity-75",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 font-serif text-[15px] tabular-nums transition-colors duration-500",
                          index === active ? "text-lilac" : "text-muted-dark",
                        )}
                      >
                        {step.number}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-serif text-[23px] leading-tight text-white md:text-[27px]">
                          {step.title}
                        </span>
                        <span className="mt-1.5 block max-w-[46ch] text-[13.5px] leading-relaxed text-muted-dark">
                          {step.body}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            {/* ---------- Right: the synced cards ---------- */}
            <div className="relative flex items-center">
              <ul className="flex w-full flex-col gap-3">
                {SYNCED.map((item, index) => {
                  const done = index <= active;
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={item.label}
                      initial={false}
                      animate={{
                        opacity: done ? 1 : 0.45,
                        y: done ? 0 : 6,
                        scale: index === active ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-[14px] bg-white px-4 py-3.5",
                        index === active &&
                          "shadow-[0_24px_60px_-20px_rgba(192,161,247,0.55)] ring-1 ring-lilac/60",
                      )}
                      // Slight horizontal offsets, so the stack looks placed
                      // rather than aligned to a grid.
                      style={{ marginLeft: `${(index % 2) * 18}px` }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-sand text-ink">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        {done ? (
                          <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                            {item.label}
                          </span>
                        ) : (
                          <span className="shimmer h-3 w-32 rounded-full" aria-hidden="true" />
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <AnimatePresence mode="wait" initial={false}>
                          {done ? (
                            <motion.span
                              key="done"
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 420, damping: 18 }}
                              className="flex size-5 items-center justify-center rounded-full bg-mint"
                            >
                              <Check className="size-3 text-mint-ink" aria-hidden="true" />
                            </motion.span>
                          ) : (
                            <motion.span
                              key="pending"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="size-5 animate-spin rounded-full border-2 border-ink/10 border-t-ink/40"
                              aria-hidden="true"
                            />
                          )}
                        </AnimatePresence>
                        <span className="hidden text-[11.5px] text-muted sm:inline">
                          {done ? fmt(y.justNow, { status: item.status }) : y.waiting}
                        </span>
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* ---------- The paper pile along the bottom edge ---------- */}
          <div
            className="pointer-events-none absolute inset-x-0 -bottom-10 flex justify-center"
            aria-hidden="true"
          >
            <Parallax offset={30} className="relative h-36 w-[min(560px,88%)]">
              {[
                { rotate: -7, x: -40, opacity: 0.16 },
                { rotate: 5, x: 30, opacity: 0.26 },
                { rotate: -2.5, x: -8, opacity: 0.4 },
                { rotate: 1.5, x: 10, opacity: 0.85 },
              ].map((sheet, index) => (
                <div
                  key={index}
                  className="absolute inset-x-0 top-0 h-36 rounded-t-[8px] bg-white"
                  style={{
                    transform: `translateX(${sheet.x}px) rotate(${sheet.rotate}deg)`,
                    opacity: sheet.opacity,
                  }}
                >
                  {index === 3 ? (
                    <div className="flex flex-col gap-2 p-6">
                      <span className="h-2.5 w-28 rounded-full bg-espresso/80" />
                      <span className="h-1.5 w-full rounded-full bg-ink/10" />
                      <span className="h-1.5 w-4/5 rounded-full bg-ink/10" />
                      <span className="h-1.5 w-2/3 rounded-full bg-ink/10" />
                    </div>
                  ) : null}
                </div>
              ))}
            </Parallax>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
