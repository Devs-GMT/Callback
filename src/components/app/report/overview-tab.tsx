"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { EASE_EDITORIAL } from "@/components/motion/primitives";
import { Card, Eyebrow } from "@/components/ui/card";
import { BeforeAfterBar, Gauge } from "@/components/ui/gauge";
import { CheckGlyph, MatchTag, Tag } from "@/components/ui/tag";
import { topFixes } from "@/lib/analysis/ats";
import { matchTally } from "@/lib/analysis/match";
import type { Report } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

/** Cards on the overview arrive one after another. */
const list = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_EDITORIAL } },
};

/**
 * The Overview tab (PRD section 2 step 4): two gauges, a one-paragraph
 * verdict, and the top three fixes.
 *
 * On a re-check this is also where the before/after bars live, so the first
 * thing a returning user sees is whether the changes they accepted actually
 * moved the numbers.
 */
export function OverviewTab({
  report,
  onGoToTab,
}: {
  report: Report;
  onGoToTab: (tab: "ats" | "match" | "pivot") => void;
}) {
  const fixes = topFixes(report.ats, 3);
  const tally = matchTally(report.match);
  const o = useI18n().t.report.overview;
  const hasMatch = report.match.requirements.length > 0;
  const previous = report.previousScores;

  return (
    <motion.div className="flex flex-col gap-5" variants={list} initial="hidden" animate="shown">
      {/* ---------- Scores ---------- */}
      <motion.div variants={item}>
      <Card className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:justify-start sm:gap-12">
          <Gauge
            value={report.ats.score}
            label={o.atsScore}
            caption={previous ? fmt(o.was, { value: previous.ats }) : o.outOf}
          />
          {hasMatch ? (
            <Gauge
              value={report.match.score}
              label={o.jobMatch}
              unit="%"
              caption={previous ? fmt(o.was, { value: `${previous.match}%` }) : o.againstJob}
            />
          ) : (
            <div className="max-w-[260px]">
              <Eyebrow className="mb-2">{o.jobMatch}</Eyebrow>
              <p className="text-[13px] leading-relaxed text-muted">
                {o.noMatch}
              </p>
            </div>
          )}
        </div>

        {previous ? (
          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <BeforeAfterBar
              label={o.atsScore}
              before={previous.ats}
              after={report.ats.score}
            />
            <BeforeAfterBar
              label={o.jobMatch}
              before={previous.match}
              after={report.match.score}
              unit="%"
            />
          </div>
        ) : null}
      </Card>
      </motion.div>

      {/* ---------- Verdict ---------- */}
      {report.match.verdict ? (
        <motion.div variants={item}>
          <Card surface="espresso" className="grain relative overflow-hidden px-6 py-6">
            <span
              className="pointer-events-none absolute -top-6 right-4 select-none font-serif text-[140px] leading-none text-lilac/25"
              aria-hidden="true"
            >
              &rdquo;
            </span>
            <Eyebrow on="dark" className="relative mb-3">
              {o.verdict}
            </Eyebrow>
            <p className="relative max-w-[60ch] font-serif text-[18px] leading-[1.45] text-white sm:text-[21px]">
              {report.match.verdict}
            </p>
          </Card>
        </motion.div>
      ) : null}

      {/* ---------- Requirement tally ---------- */}
      {hasMatch ? (
        <motion.div variants={item}>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">{o.requirements}</Eyebrow>
              <p className="text-[13px] leading-relaxed text-muted">
                {fmt(o.requirementsRead, { count: report.match.requirements.length })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToTab("match")}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-ink transition-colors hover:text-muted md:min-h-0"
            >
              {o.seeTable}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Proportions at a glance. */}
          <div className="mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {[
              { count: tally.matched, className: "bg-[#4f9c76]" },
              { count: tally.partial, className: "bg-[#d9a93a]" },
              { count: tally.missing, className: "bg-[#cc6a53]" },
            ].map((segment, index) => (
              <motion.span
                key={index}
                className={segment.className}
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: segment.count }}
                transition={{ duration: 1.1, delay: 0.3 + index * 0.12, ease: EASE_EDITORIAL }}
                style={{ flexBasis: 0 }}
              />
            ))}
          </div>

          {/* Each tag keeps its count beside it, so a wrap never strands a number. */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {(["matched", "partial", "missing"] as const).map((status) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <MatchTag status={status} />
                <span className="text-[12.5px] tabular-nums text-muted">
                  {tally[status]}
                </span>
              </span>
            ))}
          </div>

          {report.match.seniority.mismatch ? (
            <p className="mt-4 rounded-[4px] bg-yellow/50 px-3 py-2.5 text-[12px] leading-relaxed text-yellow-ink">
              <span className="font-medium">{o.seniority}</span>
              {report.match.seniority.note}
            </p>
          ) : null}

          {report.match.redFlags.length > 0 ? (
            <div className="mt-4">
              <Eyebrow className="mb-2">{o.watchOut}</Eyebrow>
              <ul className="flex flex-col gap-1.5">
                {report.match.redFlags.map((flag, index) => (
                  <li
                    key={`${flag.kind}-${index}`}
                    className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink"
                  >
                    <Tag tone="coral" className="mt-px shrink-0">
                      {o.flagKinds[flag.kind] ?? flag.kind}
                    </Tag>
                    <span>{flag.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
        </motion.div>
      ) : null}

      {/* ---------- Top fixes ---------- */}
      <motion.div variants={item}>
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow className="mb-2">
              {fixes.length === 0 ? o.nothingToFix : fmt(o.topFixes, { count: fixes.length })}
            </Eyebrow>
            <p className="text-[13px] leading-relaxed text-muted">
              {fixes.length === 0
                ? o.allPassed
                : o.mostMove}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGoToTab(fixes.length === 0 ? "pivot" : "ats")}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-ink transition-colors hover:text-muted md:min-h-0"
          >
            {fixes.length === 0 ? o.toPivot : o.allChecks}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        {fixes.length > 0 ? (
          <ol className="mt-4 flex flex-col divide-y divide-line">
            {fixes.map((fix) => (
              <li key={fix.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <CheckGlyph state={fix.state} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{fix.label}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                    {fix.fix}
                  </p>
                </div>
                <span className="ml-auto shrink-0 text-[11.5px] tabular-nums text-muted">
                  +{fix.weight - fix.earned}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </Card>
      </motion.div>
    </motion.div>
  );
}
