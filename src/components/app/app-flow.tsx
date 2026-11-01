"use client";

import { useCallback, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CvCard } from "@/components/app/cv-card";
import { JobCard } from "@/components/app/job-card";
import { Analysing } from "@/components/app/analysing";
import { ReportView } from "@/components/app/report/report-view";
import { SharedProof } from "@/components/app/shared-proof";
import { useAnalysis } from "@/components/app/use-analysis";
import { loadReport, saveReportAndNotify } from "@/lib/store/local";
import { LIMITS } from "@/lib/config";
import type { CvInput, JobInput, Report } from "@/lib/types";
import { EASE_EDITORIAL, Magnetic } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

/** Each phase of the flow fades up as it replaces the previous one. */
function Phase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** CV → Job → Report, lit up as the inputs arrive. */
function Stepper({ cvDone, jobDone }: { cvDone: boolean; jobDone: boolean }) {
  const steps = [
    { label: "Your CV", done: cvDone },
    { label: "The job", done: jobDone },
    { label: "Your report", done: false },
  ];
  const activeIndex = !cvDone ? 0 : !jobDone ? 1 : 2;

  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors duration-500",
              step.done
                ? "border-mint bg-mint text-mint-ink"
                : index === activeIndex
                  ? "border-espresso bg-espresso text-white"
                  : "border-line bg-white text-muted",
            )}
            aria-current={index === activeIndex ? "step" : undefined}
          >
            <span className="flex size-4 items-center justify-center">
              {step.done ? (
                <motion.span
                  initial={{ scale: 0, rotate: -60 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                >
                  <Check className="size-3.5" aria-hidden="true" />
                </motion.span>
              ) : (
                <span className="font-serif text-[12px]">{index + 1}</span>
              )}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </span>
          {index < steps.length - 1 ? (
            <span className="relative h-px w-6 overflow-hidden bg-line sm:w-10" aria-hidden="true">
              <motion.span
                className="absolute inset-y-0 left-0 bg-mint-ink"
                initial={false}
                animate={{ width: step.done ? "100%" : "0%" }}
                transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
              />
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * The app's single flow: add a CV, add a job, read the report, re-check.
 *
 * Kept as one client component holding the whole flow rather than four routes.
 * The CV text, the job text and the report all live in memory together, and
 * the re-check loop reads and writes all three — splitting them across routes
 * would mean serialising a CV through the URL or a store for no benefit, since
 * none of these states is one a user would want to link to or reload into.
 *
 * The one state that *is* linkable is a stamped report, which arrives as
 * `?report=<id>` and is read from the chain rather than from local state.
 */
export function AppFlow() {
  const searchParams = useSearchParams();
  const sharedReportId = searchParams.get("report");

  const analysis = useAnalysis();

  const [cv, setCv] = useState<CvInput | null>(null);
  const [job, setJob] = useState<JobInput | null>(null);

  /**
   * The report is derived from the analysis state rather than mirrored into
   * local state by an effect. Edits the user makes on top of it — accepting a
   * suggestion, changing the improved CV — are held separately and matched by
   * id, so a fresh analysis supersedes them cleanly instead of merging into a
   * previous report.
   */
  const analysed =
    analysis.state.phase === "done" || analysis.state.phase === "partial"
      ? analysis.state.report
      : null;

  const problem =
    analysis.state.phase === "partial" ? analysis.state.problem : null;

  const [edits, setEdits] = useState<Report | null>(null);

  const report =
    edits && analysed && edits.id === analysed.id ? edits : analysed;

  const recheckBusy = analysis.state.phase === "running";

  const updateReport = useCallback((next: Report) => {
    setEdits(next);
    saveReportAndNotify(next);
  }, []);

  /**
   * Re-check: score the improved CV as a new report that points back at this
   * one, so the before/after bar and the on-chain `improvedFrom` link both
   * have something to compare against.
   */
  const recheck = useCallback(
    (cvText: string) => {
      if (!report || !job) return;

      void analysis.run({
        cv: {
          // Carry the original extraction warnings across: a two-column PDF is
          // still two columns after a bullet rewrite, and dropping the warning
          // would quietly inflate the formatting score on the re-check.
          ...(cv ?? { source: "paste", warnings: [] }),
          text: cvText,
        },
        job,
        improvedFrom: {
          id: report.id,
          ats: report.ats.score,
          match: report.match.score,
        },
      });
    },
    [analysis, cv, job, report],
  );

  const retryMatch = useCallback(() => {
    if (!report || !cv || !job) return;
    void analysis.retryMatch(report, cv, job);
  }, [analysis, cv, job, report]);

  /* ------------------------------------------------------------------ */
  /* A shared proof link takes priority over the local flow             */
  /* ------------------------------------------------------------------ */

  if (sharedReportId) {
    return (
      <Phase className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-10">
        <SharedProof id={sharedReportId} />
      </Phase>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Analysing                                                          */
  /* ------------------------------------------------------------------ */

  if (analysis.state.phase === "running") {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 md:py-16 lg:px-10">
        <Analysing
          step={analysis.state.step}
          onCancel={analysis.cancel}
          isRecheck={Boolean(analysed)}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Report                                                             */
  /* ------------------------------------------------------------------ */

  if (report) {
    const parent = report.improvedFromId ? loadReport(report.improvedFromId) : null;

    return (
      <Phase
        key={report.id}
        className="mx-auto w-full max-w-[1340px] px-4 py-8 sm:px-6 lg:px-10"
      >
        <ReportView
          report={report}
          onUpdate={updateReport}
          onRecheck={recheck}
          recheckBusy={recheckBusy}
          problem={problem}
          onRetryMatch={cv && job ? retryMatch : undefined}
          parentOnChainId={parent?.stamp?.onChainId}
        />

        <div className="mt-8 border-t border-line pt-6">
          <Button
            tone="ghost"
            size="sm"
            onClick={() => {
              setEdits(null);
              setCv(null);
              setJob(null);
              analysis.setState({ phase: "idle" });
            }}
          >
            Start a new check
          </Button>
        </div>
      </Phase>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Start screen                                                       */
  /* ------------------------------------------------------------------ */

  const ready =
    cv !== null &&
    job !== null &&
    cv.text.length >= LIMITS.cvMinChars &&
    job.text.length >= LIMITS.jobMinChars;

  const errorPhase = analysis.state.phase === "error" ? analysis.state : null;

  return (
    <Phase className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 md:py-12 lg:px-10">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow className="mb-3">New check</Eyebrow>
          <h1 className="font-serif text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.05] tracking-[-0.02em] text-ink">
            Add your CV and <span className="italic text-[#8a63d2]">the job</span>.
          </h1>
          <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-muted">
            You&apos;ll get an ATS score, a job match percentage with evidence from
            your own CV, and exactly what to change.
          </p>
        </div>
        <Stepper cvDone={cv !== null} jobDone={job !== null} />
      </header>

      {/* PRD section 7: the two input cards sit side by side on the start
          screen from 1280px, and stack below that. */}
      <div className="grid gap-5 xl:grid-cols-2">
        {[
          <CvCard key="cv" value={cv} onChange={setCv} onClear={() => setCv(null)} />,
          <JobCard key="job" value={job} onChange={setJob} onClear={() => setJob(null)} />,
        ].map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 + index * 0.1, ease: EASE_EDITORIAL }}
            className="[&>*]:h-full [&>*]:shadow-[0_24px_50px_-40px_rgba(28,16,9,0.45)]"
          >
            {card}
          </motion.div>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Magnetic strength={ready ? 0.2 : 0}>
          <span className="relative inline-flex">
            {ready ? (
              <span
                className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-[4px] bg-lilac/60"
                aria-hidden="true"
              />
            ) : null}
            <Button
              size="lg"
              disabled={!ready}
              className={cn(
                "group relative",
                ready && "shadow-[0_14px_34px_-12px_rgba(33,9,0,0.6)]",
              )}
              onClick={() => {
                if (!cv || !job) return;
                void analysis.run({ cv, job });
              }}
            >
              Check my CV
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          </span>
        </Magnetic>

        {!ready ? (
          <p className="text-[12.5px] text-muted">
            {cv === null && job === null
              ? "Add your CV and a job to start."
              : cv === null
                ? "Add your CV to start."
                : "Add the job to start."}
          </p>
        ) : null}
      </div>

      {errorPhase ? (
        <p
          role="alert"
          className="mt-5 rounded-[4px] bg-coral/35 px-3 py-2.5 text-[12.5px] leading-relaxed text-coral-ink"
        >
          {errorPhase.message}
        </p>
      ) : null}

      <Card surface="sand" className="mt-10 flex items-start gap-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-ink ring-1 ring-line">
          <ShieldCheck className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[12.5px] font-medium text-ink">
            Your CV stays yours
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Files are read in your browser. Your CV and the job are sent to our
            server only for the AI check, and are never stored or logged. Reports
            are saved in this browser only — you can delete them all from{" "}
            <a
              href="/app/applications"
              className="underline decoration-line underline-offset-2 hover:decoration-ink"
            >
              My applications
            </a>
            .
          </p>
        </div>
      </Card>
    </Phase>
  );
}
