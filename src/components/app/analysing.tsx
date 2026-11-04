"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ANALYSIS_STEPS, type AnalysisStepId } from "@/components/app/use-analysis";
import { useI18n } from "@/i18n/client";
import { clientMessages } from "@/i18n/lib";
import { EASE_EDITORIAL } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

/**
 * Step 3 of PRD section 2: the progress screen while the analysis runs.
 *
 * This screen holds the user's attention for 20 to 40 seconds, so it shows
 * the work rather than a spinner: a CV page being scanned, with the things the
 * current step looks for appearing on it. The illustration is decorative; the
 * real progress is the step list, which is announced through one `aria-live`
 * region so a screen reader hears each step once.
 *
 * Cancelling is offered because the request can genuinely hang on a slow
 * model, and a user who wants to fix their input should not have to reload.
 */


/** Chips that appear on the page as each step runs. */
const MARKS: Record<string, Array<{ text: string; tone: string; x: string; y: string }>> = {};
const MARK_SETS = [
  [{ text: "Experience ✓", tone: "bg-mint text-mint-ink", x: "58%", y: "16%" }],
  [{ text: "Must-have: SQL", tone: "bg-lilac-soft text-[#5b3d99]", x: "-6%", y: "34%" }],
  [{ text: "2-column ⚠", tone: "bg-yellow text-yellow-ink", x: "54%", y: "48%" }],
  [{ text: "Matched 9/14", tone: "bg-mint text-mint-ink", x: "-4%", y: "64%" }],
  [{ text: "3 rewrites ✦", tone: "bg-espresso text-white", x: "50%", y: "80%" }],
];
ANALYSIS_STEPS.forEach((step, index) => {
  MARKS[step.id] = MARK_SETS[index] ?? [];
});

function ScanningPage({ currentIndex }: { currentIndex: number }) {
  const labels = useI18n().t.app.analysing.marks;
  const visible = ANALYSIS_STEPS.slice(0, currentIndex + 1).flatMap((step, index) =>
    MARKS[step.id].map((mark) => ({ ...mark, text: labels[index] ?? mark.text })),
  );

  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-[260px]" aria-hidden="true">
      {/* Pages behind. */}
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-[3deg] rounded-[10px] bg-stone" />
      <div className="absolute inset-0 -translate-x-2 translate-y-1.5 -rotate-[2deg] rounded-[10px] bg-lilac/40" />

      {/* The page being read. */}
      <div className="relative h-full overflow-hidden rounded-[10px] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(28,16,9,0.45)] ring-1 ring-line">
        <span className="block h-3 w-24 rounded-full bg-espresso/85" />
        <span className="mt-2 block h-1.5 w-32 rounded-full bg-ink/15" />
        {[0, 1, 2].map((block) => (
          <div key={block} className="mt-5 flex flex-col gap-1.5">
            <span className="block h-2 w-16 rounded-full bg-ink/40" />
            {[92, 78, 86, 64].map((width, line) => (
              <motion.span
                key={line}
                className="block h-1.5 rounded-full bg-ink/10"
                style={{ width: `${width - block * 6}%` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  delay: (block * 4 + line) * 0.12,
                }}
              />
            ))}
          </div>
        ))}

        {/* The scan beam. */}
        <div className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-10">
          <div className="h-full bg-gradient-to-b from-transparent via-lilac/35 to-transparent" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-lilac" />
        </div>
      </div>

      {/* Findings pinned onto the page. */}
      <AnimatePresence>
        {visible.map((mark) => (
          <motion.span
            key={mark.text}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            className={cn(
              "absolute whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium shadow-[0_10px_24px_-12px_rgba(28,16,9,0.5)]",
              mark.tone,
            )}
            style={{ left: mark.x, top: mark.y }}
          >
            {mark.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Analysing({
  step,
  onCancel,
  isRecheck,
}: {
  step: AnalysisStepId;
  onCancel: () => void;
  isRecheck?: boolean;
}) {
  const { t } = useI18n();
  const a = t.app.analysing;
  const TIPS = a.tips;
  const stepLabel = (id: AnalysisStepId) => clientMessages().analysis.steps[id];
  const currentIndex = ANALYSIS_STEPS.findIndex((candidate) => candidate.id === step);
  const progress = ((currentIndex + 0.5) / ANALYSIS_STEPS.length) * 100;
  const reduce = useReducedMotion();

  const [seconds, setSeconds] = useState(0);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setTip((value) => (value + 1) % TIPS.length), 5000);
    return () => clearInterval(timer);
  }, [reduce, TIPS.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
    >
      <Card bare className="mx-auto max-w-[860px] overflow-hidden">
        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          {/* ---------- The illustration ---------- */}
          <div className="paper-dots relative flex items-center justify-center bg-sand px-10 py-10 md:py-14">
            <ScanningPage currentIndex={currentIndex} />
          </div>

          {/* ---------- The steps ---------- */}
          <div className="flex flex-col p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>{isRecheck ? a.rechecking : a.analysing}</Eyebrow>
              <span className="font-mono text-[11.5px] tabular-nums text-muted">
                {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
            </div>
            <h1 className="mt-2 font-serif text-[26px] leading-snug text-ink">
              {isRecheck ? a.recheckTitle : a.title}
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {a.duration}
            </p>

            {/* Overall progress. */}
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-ink/[0.07]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-lilac to-espresso"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.9, ease: EASE_EDITORIAL }}
              />
            </div>

            <ol className="mt-5 flex flex-col gap-1">
              {ANALYSIS_STEPS.map((candidate, index) => {
                const done = index < currentIndex;
                const active = index === currentIndex;

                return (
                  <li
                    key={candidate.id}
                    className="relative flex items-center gap-3 rounded-[10px] px-3 py-2.5"
                  >
                    {active ? (
                      <motion.span
                        layoutId="analysing-active"
                        className="absolute inset-0 rounded-[10px] bg-sand"
                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="relative flex size-5 shrink-0 items-center justify-center">
                      {done ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          className="flex size-5 items-center justify-center rounded-full bg-mint"
                        >
                          <Check className="size-3 text-mint-ink" aria-hidden="true" />
                        </motion.span>
                      ) : active ? (
                        <span
                          className="size-4 animate-spin rounded-full border-2 border-ink/15 border-t-espresso motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="size-1.5 rounded-full bg-ink/20" aria-hidden="true" />
                      )}
                    </span>

                    <span
                      className={cn(
                        "relative text-[13.5px] transition-colors",
                        done && "text-muted line-through decoration-ink/20",
                        active && "font-medium text-ink",
                        !done && !active && "text-muted/70",
                      )}
                    >
                      {stepLabel(candidate.id)}
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* One live region for the whole list. */}
            <p aria-live="polite" className="sr-only">
              {ANALYSIS_STEPS[currentIndex] ? stepLabel(ANALYSIS_STEPS[currentIndex].id) : a.working}
            </p>

            <div className="mt-5 min-h-[44px] rounded-[10px] border border-dashed border-line px-3.5 py-2.5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={tip}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  className="text-[12px] leading-relaxed text-muted"
                >
                  <span className="font-medium text-ink">{a.tip}</span>
                  {TIPS[tip]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 md:mt-6">
              <p className="text-[11.5px] leading-relaxed text-muted">
                {a.privacy}
              </p>
              <Button tone="ghost" size="sm" onClick={onCancel} className="shrink-0">
                {a.cancel}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
