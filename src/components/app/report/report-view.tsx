"use client";

import { useCallback, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel, useTabs } from "@/components/ui/tabs";
import { Gauge } from "@/components/ui/gauge";
import { Tag } from "@/components/ui/tag";
import { OverviewTab } from "@/components/app/report/overview-tab";
import { AtsTab } from "@/components/app/report/ats-tab";
import { MatchTab } from "@/components/app/report/match-tab";
import { PivotTab } from "@/components/app/report/pivot-tab";
import { ImprovedCvTab } from "@/components/app/report/improved-cv-tab";
import { CoverLetterTab } from "@/components/app/report/cover-letter-tab";
import { StampPanel } from "@/components/app/report/stamp-panel";
import { topFixes } from "@/lib/analysis/ats";
import { countApplied } from "@/lib/analysis/apply";
import { formatDate } from "@/lib/utils";
import type { CoverLetter, Report, StampInfo, SuggestionDecision } from "@/lib/types";

/**
 * The report, across its tabs (PRD section 2 step 4, plus the cover letter).
 *
 * The three-way responsive behaviour from PRD sections 7 and 8 is the main
 * structural job here:
 *
 *  - from 1280px: two columns, with the scores, top fixes and actions in a
 *    sticky right-hand panel;
 *  - 768 to 1279px: one column, the panel's content folded in above the tabs;
 *  - below 768px: one column, plus a fixed bottom bar carrying the two scores
 *    and Re-check, since the panel is then too far up the page to reach.
 *
 * All three render the same components; only the placement changes.
 */

export type ReportTab = "overview" | "ats" | "match" | "pivot" | "cv" | "letter";

export function ReportView({
  report,
  onUpdate,
  onRecheck,
  recheckBusy,
  problem,
  onRetryMatch,
  parentOnChainId,
}: {
  report: Report;
  onUpdate: (report: Report) => void;
  onRecheck: (cvText: string) => void;
  recheckBusy: boolean;
  /** Set when the AI pass failed, per PRD section 11. */
  problem?: string | null;
  onRetryMatch?: () => void;
  parentOnChainId?: number;
}) {
  const tabs = useTabs<ReportTab>("overview");

  const acceptedCount = countApplied(report.suggestions, report.decisions);
  const fixes = topFixes(report.ats, 3);
  const hasMatch = report.match.requirements.length > 0;

  const decide = useCallback(
    (id: string, decision: SuggestionDecision) => {
      onUpdate({ ...report, decisions: { ...report.decisions, [id]: decision } });
    },
    [onUpdate, report],
  );

  const setImprovedText = useCallback(
    (text: string) => {
      onUpdate({ ...report, improvedCvText: text });
    },
    [onUpdate, report],
  );

  const setHiddenSections = useCallback(
    (hiddenSections: string[]) => onUpdate({ ...report, hiddenSections }),
    [onUpdate, report],
  );

  const setCoverLetter = useCallback(
    (coverLetter: CoverLetter) => onUpdate({ ...report, coverLetter }),
    [onUpdate, report],
  );

  const onStamped = useCallback(
    (stamp: StampInfo) => onUpdate({ ...report, stamp }),
    [onUpdate, report],
  );

  const tabItems = useMemo(
    () => [
      { id: "overview" as const, label: "Overview" },
      { id: "ats" as const, label: "ATS check" },
      {
        id: "match" as const,
        label: "Job match",
        badge: hasMatch ? undefined : <Tag tone="yellow">!</Tag>,
      },
      {
        id: "pivot" as const,
        label: "What to pivot",
        badge:
          report.suggestions.length > 0 ? (
            <span className="text-[11px] tabular-nums text-muted">
              {acceptedCount}/{report.suggestions.length}
            </span>
          ) : undefined,
      },
      { id: "cv" as const, label: "Improved CV" },
      { id: "letter" as const, label: "Cover letter" },
    ],
    [acceptedCount, hasMatch, report.suggestions.length],
  );

  /* ------------------------------------------------------------------ */
  /* The side panel's content, reused in the stacked layout             */
  /* ------------------------------------------------------------------ */

  const panel = (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Gauge value={report.ats.score} label="ATS" size={108} />
          {hasMatch ? (
            <Gauge value={report.match.score} label="Match" unit="%" size={108} />
          ) : null}
        </div>

        {fixes.length > 0 ? (
          <div className="border-t border-line pt-4">
            <Eyebrow className="mb-2.5">Top fixes</Eyebrow>
            <ul className="flex flex-col gap-2">
              {fixes.map((fix) => (
                <li key={fix.id} className="flex items-baseline justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => tabs.setValue("ats")}
                    className="text-left text-[12.5px] leading-snug text-ink underline decoration-line underline-offset-2 transition-colors hover:decoration-ink"
                  >
                    {fix.label}
                  </button>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-muted">
                    +{fix.weight - fix.earned}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.suggestions.length > 0 ? (
          <div className="border-t border-line pt-4">
            <Button
              tone={acceptedCount > 0 ? "primary" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => tabs.setValue(acceptedCount > 0 ? "cv" : "pivot")}
            >
              {acceptedCount > 0
                ? `See your improved CV (${acceptedCount})`
                : `Review ${report.suggestions.length} suggestions`}
            </Button>
          </div>
        ) : null}
      </Card>

      <StampPanel
        report={report}
        parentOnChainId={parentOnChainId}
        onStamped={onStamped}
      />
    </div>
  );

  /* ------------------------------------------------------------------ */

  return (
    <div className="pb-24 md:pb-0">
      {/* ---------- Header ---------- */}
      <header className="mb-5">
        <Eyebrow className="mb-2">
          {report.improvedFromId ? "Re-check" : "Report"} ·{" "}
          {formatDate(report.createdAt)}
        </Eyebrow>
        <h1 className="display-3 font-serif text-ink">
          {report.jobTitle || "Untitled role"}
        </h1>
        {report.company ? (
          <p className="mt-1 text-[13px] text-muted">{report.company}</p>
        ) : null}
      </header>

      {problem ? (
        <Card surface="sand" className="mb-5 flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink">
            {problem}
          </p>
          {onRetryMatch ? (
            <Button tone="outline" size="sm" onClick={onRetryMatch}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Retry
            </Button>
          ) : null}
        </Card>
      ) : null}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          {/* Tablet: the panel is stacked above the tabs rather than beside
              them, which is PRD section 8's "sticky panel becomes a score bar
              at the top". Phones skip it: the bottom bar already carries the
              scores and Re-check, and Overview shows the gauges and top fixes,
              so stacking it here only pushed the tabs a screen and a half
              down. Export and stamp follow the tab content instead. */}
          <div className="mb-6 hidden md:block xl:hidden">{panel}</div>

          <Tabs
            items={tabItems}
            value={tabs.value}
            onChange={tabs.setValue}
            idBase={tabs.idBase}
            label="Report sections"
            className="mb-5"
          />

          {tabs.value === "overview" ? (
            <TabPanel id="overview" idBase={tabs.idBase}>
              <OverviewTab report={report} onGoToTab={tabs.setValue} />
            </TabPanel>
          ) : null}

          {tabs.value === "ats" ? (
            <TabPanel id="ats" idBase={tabs.idBase}>
              <AtsTab report={report.ats} />
            </TabPanel>
          ) : null}

          {tabs.value === "match" ? (
            <TabPanel id="match" idBase={tabs.idBase}>
              {hasMatch ? (
                <MatchTab report={report.match} />
              ) : (
                <Card surface="sand" className="text-center">
                  <p className="font-serif text-[18px] text-ink">
                    The job match didn&apos;t run
                  </p>
                  <p className="mx-auto mt-2 max-w-[44ch] text-[12.5px] leading-relaxed text-muted">
                    {problem ??
                      "Your ATS check is complete and scored. The job match needs the AI service, which wasn't available."}
                  </p>
                  {onRetryMatch ? (
                    <Button tone="outline" size="sm" className="mt-4" onClick={onRetryMatch}>
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                      Try the match again
                    </Button>
                  ) : null}
                </Card>
              )}
            </TabPanel>
          ) : null}

          {tabs.value === "pivot" ? (
            <TabPanel id="pivot" idBase={tabs.idBase}>
              <PivotTab
                suggestions={report.suggestions}
                decisions={report.decisions}
                onDecide={decide}
                problem={problem}
              />
            </TabPanel>
          ) : null}

          {tabs.value === "cv" ? (
            <TabPanel id="cv" idBase={tabs.idBase}>
              <ImprovedCvTab
                report={report}
                onRecheck={onRecheck}
                recheckBusy={recheckBusy}
                onTextChange={setImprovedText}
                onHiddenChange={setHiddenSections}
              />
            </TabPanel>
          ) : null}

          {tabs.value === "letter" ? (
            <TabPanel id="letter" idBase={tabs.idBase}>
              <CoverLetterTab report={report} onChange={setCoverLetter} />
            </TabPanel>
          ) : null}

          <div className="mt-8 md:hidden">
            <StampPanel
              report={report}
              parentOnChainId={parentOnChainId}
              onStamped={onStamped}
            />
          </div>
        </div>

        {/* ---------- Sticky panel, desktop only (PRD section 7) ---------- */}
        <aside className="hidden w-[300px] shrink-0 xl:block">
          <div className="sticky top-6">{panel}</div>
        </aside>
      </div>

      {/* ---------- Mobile score bar (PRD section 8) ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <dl className="flex items-center gap-4">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
                ATS
              </dt>
              <dd className="font-serif text-[18px] tabular-nums text-ink">
                {report.ats.score}
              </dd>
            </div>
            {hasMatch ? (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
                  Match
                </dt>
                <dd className="font-serif text-[18px] tabular-nums text-ink">
                  {report.match.score}%
                </dd>
              </div>
            ) : null}
          </dl>

          <Button
            size="sm"
            onClick={() => {
              tabs.setValue("cv");
              onRecheck(report.improvedCvText || report.cvText);
            }}
            disabled={recheckBusy}
          >
            <RefreshCw
              className={recheckBusy ? "size-3.5 animate-spin motion-reduce:animate-none" : "size-3.5"}
              aria-hidden="true"
            />
            {recheckBusy ? "Re-checking" : "Re-check"}
          </Button>
        </div>
      </div>
    </div>
  );
}
