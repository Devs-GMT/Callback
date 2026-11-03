"use client";

import { useCallback, useRef, useState } from "react";
import { analyzeFit, ApiCallError, requestPivot } from "@/lib/api/client";
import { computeAts } from "@/lib/analysis/ats";
import { stripInline } from "@/lib/analysis/inline";
import { buildMatchReport, gapsFrom } from "@/lib/analysis/match";
import { saveReportAndNotify } from "@/lib/store/local";
import { localId } from "@/lib/utils";
import type {
  CvInput,
  JobInput,
  MatchReport,
  Report,
  Suggestion,
  SuggestionDecision,
} from "@/lib/types";

/** The CV as the checks and the model see it: formatting markers removed. */
const plainCv = (cv: CvInput): CvInput => ({ ...cv, text: stripInline(cv.text) });

/**
 * Running an analysis end to end.
 *
 * PRD section 2 step 3 names the five progress steps, and section 11 requires
 * that an AI failure still leaves the user with something: "show the
 * rule-based ATS check anyway + [Retry] for the match". That shapes the state
 * machine here — `partial` is a first-class outcome, not an error.
 *
 * The suggestions call is treated as separately failable from the analysis.
 * A report with scores and no rewrites is useful; losing the scores because
 * the rewriting model was busy would not be.
 */

export const ANALYSIS_STEPS = [
  { id: "cv", label: "Reading your CV" },
  { id: "job", label: "Reading the job" },
  { id: "ats", label: "Checking ATS" },
  { id: "match", label: "Matching skills" },
  { id: "pivot", label: "Writing suggestions" },
] as const;

export type AnalysisStepId = (typeof ANALYSIS_STEPS)[number]["id"];

export type AnalysisState =
  | { phase: "idle" }
  | { phase: "running"; step: AnalysisStepId }
  | { phase: "done"; report: Report }
  /** Scores from the rule engine only; the AI match or pivot did not land. */
  | { phase: "partial"; report: Report; problem: string; retryable: boolean }
  | { phase: "error"; message: string; retryable: boolean };

/** An empty match report, so the report shape stays valid without the AI. */
function emptyMatch(): MatchReport {
  return {
    score: 0,
    requirements: [],
    matches: [],
    keywords: { matched: [], missing: [], ratio: 0 },
    seniority: {
      jobLevel: "unknown",
      cvLevel: "unknown",
      mismatch: false,
      note: "",
    },
    redFlags: [],
    verdict: "",
  };
}

export type RunOptions = {
  cv: CvInput;
  job: JobInput;
  /** Set on a re-check, to record the before/after link. */
  improvedFrom?: { id: string; ats: number; match: number };
};

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ phase: "idle" });
  }, []);

  const run = useCallback(async (options: RunOptions) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { cv, job, improvedFrom } = options;
    const jobTitle = job.title?.trim() || "Untitled role";
    const company = job.company?.trim() || "";

    // The first three steps are real but near-instant: the text is already
    // extracted, and the rule-based ATS pass is pure local computation. Three
    // back-to-back setState calls would be batched into one render and the
    // user would never see them, so they are paced out deliberately. Short
    // enough to stay honest about the work, long enough to be readable.
    const reveal = (step: AnalysisStepId) =>
      new Promise<void>((resolve) => {
        setState({ phase: "running", step });
        setTimeout(resolve, 260);
      });

    await reveal("cv");
    if (controller.signal.aborted) return;
    await reveal("job");
    if (controller.signal.aborted) return;
    await reveal("ats");
    if (controller.signal.aborted) return;

    // Needs nothing from the network, so it is ready before the model is asked
    // anything. This is what makes the `partial` outcome possible.
    const ruleBasedAts = computeAts(plainCv(cv));

    const baseReport = (
      overrides: Partial<Report> = {},
    ): Report => ({
      id: localId(),
      createdAt: Date.now(),
      jobTitle,
      company,
      ats: ruleBasedAts,
      match: emptyMatch(),
      suggestions: [],
      decisions: {},
      cvText: cv.text,
      improvedCvText: cv.text,
      jobText: job.text,
      improvedFromId: improvedFrom?.id,
      previousScores: improvedFrom
        ? { ats: improvedFrom.ats, match: improvedFrom.match }
        : undefined,
      status: "not-applied",
      warnings: cv.warnings,
      ...overrides,
    });

    /* ---------------- the match ---------------- */

    setState({ phase: "running", step: "match" });

    let analysis;
    try {
      analysis = await analyzeFit(
        {
          cvText: stripInline(cv.text),
          jobText: job.text,
          jobTitle: job.title,
          seniority: job.seniority,
        },
        controller.signal,
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;

      const report = baseReport();
      saveReportAndNotify(report);

      const apiError = error instanceof ApiCallError ? error : null;
      setState({
        phase: "partial",
        report,
        problem:
          apiError?.message ??
          "We couldn't run the job match. Your ATS check is below.",
        retryable: apiError?.retryable ?? true,
      });
      return;
    }

    // Recompute the ATS score now the model has judged bullet quality, which
    // is the one check PRD section 3 marks as AI-assisted.
    const ats = computeAts(plainCv(cv), analysis.bulletQuality);
    const match = buildMatchReport(analysis, stripInline(cv.text), job.text);

    /* ---------------- the suggestions ---------------- */

    setState({ phase: "running", step: "pivot" });

    let suggestions: Suggestion[] = [];
    let pivotProblem: string | null = null;
    let pivotRetryable = true;

    try {
      const pivot = await requestPivot(
        {
          cvText: stripInline(cv.text),
          jobText: job.text,
          jobTitle: job.title,
          gaps: gapsFrom(match).map(
            (requirement) =>
              `${requirement.type === "must" ? "Must-have" : "Nice-to-have"}: ${requirement.text}`,
          ),
          missingKeywords: match.keywords.missing,
        },
        controller.signal,
      );
      suggestions = pivot.suggestions;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const apiError = error instanceof ApiCallError ? error : null;
      pivotProblem =
        apiError?.message ?? "We couldn't write the suggestions this time.";
      pivotRetryable = apiError?.retryable ?? true;
    }

    const decisions: Record<string, SuggestionDecision> = {};
    for (const suggestion of suggestions) decisions[suggestion.id] = "pending";

    const report = baseReport({ ats, match, suggestions, decisions });
    saveReportAndNotify(report);

    if (pivotProblem) {
      setState({
        phase: "partial",
        report,
        problem: pivotProblem,
        retryable: pivotRetryable,
      });
    } else {
      setState({ phase: "done", report });
    }
  }, []);

  /**
   * Retry just the match on a report that has only the rule-based checks.
   * Cheaper and less disruptive than re-running the whole analysis.
   */
  const retryMatch = useCallback(
    async (report: Report, cv: CvInput, job: JobInput) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ phase: "running", step: "match" });

      try {
        const analysis = await analyzeFit(
          {
            cvText: stripInline(cv.text),
            jobText: job.text,
            jobTitle: job.title,
            seniority: job.seniority,
          },
          controller.signal,
        );

        const ats = computeAts(plainCv(cv), analysis.bulletQuality);
        const match = buildMatchReport(analysis, stripInline(cv.text), job.text);

        setState({ phase: "running", step: "pivot" });

        let suggestions: Suggestion[] = [];
        try {
          const pivot = await requestPivot(
            {
              cvText: stripInline(cv.text),
              jobText: job.text,
              jobTitle: job.title,
              gaps: gapsFrom(match).map((requirement) => requirement.text),
              missingKeywords: match.keywords.missing,
            },
            controller.signal,
          );
          suggestions = pivot.suggestions;
        } catch {
          // A report with scores and no rewrites is still worth keeping.
        }

        const decisions: Record<string, SuggestionDecision> = {};
        for (const suggestion of suggestions) decisions[suggestion.id] = "pending";

        const updated: Report = { ...report, ats, match, suggestions, decisions };
        saveReportAndNotify(updated);
        setState({ phase: "done", report: updated });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        const apiError = error instanceof ApiCallError ? error : null;
        setState({
          phase: "partial",
          report,
          problem: apiError?.message ?? "The job match failed again.",
          retryable: apiError?.retryable ?? true,
        });
      }
    },
    [],
  );

  return { state, run, retryMatch, cancel, setState };
}
