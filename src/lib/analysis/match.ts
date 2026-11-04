/**
 * The job match score.
 *
 * PRD section 3: must-haves 60% + nice-to-haves 20% + keyword coverage 20%,
 * with a seniority mismatch shown as a warning rather than a deduction.
 *
 * The model supplies the requirements and the per-requirement verdicts with an
 * evidence quote; the arithmetic happens here so the number is reproducible
 * and the before/after bar on a re-check compares like with like.
 */

import type {
  AnalyzeResponse,
  MatchReport,
  MatchStatus,
  Requirement,
  RequirementMatch,
  Seniority,
  SeniorityFit,
} from "@/lib/types";
import { computeKeywordCoverage } from "@/lib/analysis/keywords";
import { guessSeniority, seniorityGap } from "@/lib/analysis/text";
import { clamp } from "@/lib/utils";
import { fmt, type Locale } from "@/i18n/config";
import { libMessages, type LibMessages } from "@/i18n/lib";

type Msg = LibMessages["match"];

export const MATCH_WEIGHTS = {
  must: 60,
  nice: 20,
  keywords: 20,
} as const;

/** Credit given per status. A partial match is worth half. */
const STATUS_CREDIT: Record<MatchStatus, number> = {
  matched: 1,
  partial: 0.5,
  missing: 0,
};

/**
 * Enforce the no-quote-no-match rule from PRD section 3 in code rather than
 * trusting the prompt alone: a claimed match whose evidence quote is not
 * actually in the CV is demoted.
 */
function verifyEvidence(
  match: RequirementMatch,
  cvHaystack: string,
  m: Msg,
): RequirementMatch {
  if (match.status === "missing") return { ...match, evidence: "" };

  const quote = match.evidence.trim();
  if (quote.length === 0) {
    return {
      ...match,
      status: "missing",
      evidence: "",
      note: match.note || m.noEvidence,
    };
  }

  // Compare on collapsed whitespace and lowercase: models normalise spacing
  // and casing when quoting, which should not count as a fabricated quote.
  const needle = quote.toLowerCase().replace(/\s+/g, " ");
  if (cvHaystack.includes(needle)) return { ...match, evidence: quote };

  // The quote does not appear verbatim. Accept it as a partial match if most
  // of its distinctive words are present, otherwise demote to missing.
  const words = needle.split(" ").filter((w) => w.length > 3);
  const present = words.filter((w) => cvHaystack.includes(w)).length;
  const share = words.length === 0 ? 0 : present / words.length;

  if (share >= 0.8) return { ...match, status: "partial", evidence: quote };

  return {
    ...match,
    status: "missing",
    evidence: "",
    note: m.notFound,
  };
}

function bucketScore(
  requirements: Requirement[],
  byId: Map<string, RequirementMatch>,
): number | null {
  if (requirements.length === 0) return null;
  const total = requirements.reduce((sum, requirement) => {
    const match = byId.get(requirement.id);
    return sum + (match ? STATUS_CREDIT[match.status] : 0);
  }, 0);
  return total / requirements.length;
}

function buildSeniorityFit(
  reported: AnalyzeResponse["seniority"],
  cvText: string,
  jobText: string,
  m: Msg,
): SeniorityFit {
  // Fall back to the local guess when the model leaves a level unknown.
  const jobLevel: Seniority =
    reported.jobLevel !== "unknown" ? reported.jobLevel : guessSeniority(jobText);
  const cvLevel: Seniority =
    reported.cvLevel !== "unknown" ? reported.cvLevel : guessSeniority(cvText);

  const gap = seniorityGap(jobLevel, cvLevel);
  const mismatch = gap >= 2;

  let note = reported.note?.trim() ?? "";
  if (note.length === 0) {
    if (jobLevel === "unknown" || cvLevel === "unknown") {
      note = m.seniorityUnclear;
    } else if (!mismatch) {
      note = m.seniorityFits;
    } else {
      const jobRank = ["unknown", "intern", "junior", "mid", "senior", "lead"].indexOf(
        jobLevel,
      );
      const cvRank = ["unknown", "intern", "junior", "mid", "senior", "lead"].indexOf(
        cvLevel,
      );
      const levels = { job: m.levels[jobLevel] ?? jobLevel, cv: m.levels[cvLevel] ?? cvLevel };
      note = fmt(cvRank < jobRank ? m.seniorityUnder : m.seniorityOver, levels);
    }
  }

  return { jobLevel, cvLevel, mismatch, note };
}

/**
 * Turn the model's analysis plus the CV text into the final match report.
 */
export function buildMatchReport(
  analysis: AnalyzeResponse,
  cvText: string,
  jobText: string,
  locale: Locale = "en",
): MatchReport {
  const m = libMessages(locale).match;
  const cvHaystack = cvText.toLowerCase().replace(/\s+/g, " ");

  // Keep only matches that point at a real requirement, and verify quotes.
  const requirementIds = new Set(analysis.requirements.map((r) => r.id));
  const verified = analysis.matches
    .filter((match) => requirementIds.has(match.requirementId))
    .map((candidate) => verifyEvidence(candidate, cvHaystack, m));

  const byId = new Map(verified.map((match) => [match.requirementId, match]));

  // Any requirement the model forgot to judge counts as missing rather than
  // silently dropping out of the denominator.
  for (const requirement of analysis.requirements) {
    if (!byId.has(requirement.id)) {
      byId.set(requirement.id, {
        requirementId: requirement.id,
        status: "missing",
        evidence: "",
        note: m.notAddressed,
      });
    }
  }

  const musts = analysis.requirements.filter((r) => r.type === "must");
  const nices = analysis.requirements.filter((r) => r.type === "nice");

  const mustRatio = bucketScore(musts, byId);
  const niceRatio = bucketScore(nices, byId);
  const keywords = computeKeywordCoverage(cvText, analysis.keywords);

  // Redistribute the weight of an empty bucket across the ones that have
  // content, so a job with no nice-to-haves is not capped at 80.
  const parts: Array<{ ratio: number; weight: number }> = [];
  if (mustRatio !== null) parts.push({ ratio: mustRatio, weight: MATCH_WEIGHTS.must });
  if (niceRatio !== null) parts.push({ ratio: niceRatio, weight: MATCH_WEIGHTS.nice });
  // Only weigh keyword coverage when the job actually yielded keywords. An
  // empty list has a ratio of 0, which would otherwise hold the score 20 points
  // below full marks for a job whose keywords simply could not be read.
  if (keywords.matched.length + keywords.missing.length > 0) {
    parts.push({ ratio: keywords.ratio, weight: MATCH_WEIGHTS.keywords });
  }

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const score =
    totalWeight === 0
      ? 0
      : clamp(
          Math.round(
            (parts.reduce((sum, p) => sum + p.ratio * p.weight, 0) / totalWeight) *
              100,
          ),
          0,
          100,
        );

  const seniority = buildSeniorityFit(analysis.seniority, cvText, jobText, m);

  return {
    score,
    requirements: analysis.requirements,
    matches: analysis.requirements.map((r) => byId.get(r.id)!),
    keywords,
    seniority,
    redFlags: analysis.redFlags ?? [],
    verdict: analysis.verdict?.trim() ?? "",
  };
}

/** Requirements that are missing or only partially met, worst first. */
export function gapsFrom(report: MatchReport): Requirement[] {
  const byId = new Map(report.matches.map((m) => [m.requirementId, m]));
  const rank: Record<MatchStatus, number> = { missing: 0, partial: 1, matched: 2 };

  return report.requirements
    .filter((r) => byId.get(r.id)?.status !== "matched")
    .sort((a, b) => {
      // Missing must-haves first, then partial must-haves, then nice-to-haves.
      if (a.type !== b.type) return a.type === "must" ? -1 : 1;
      const sa = byId.get(a.id)?.status ?? "missing";
      const sb = byId.get(b.id)?.status ?? "missing";
      return rank[sa] - rank[sb];
    });
}

/** Counts for the requirements table summary line. */
export function matchTally(report: MatchReport) {
  const tally = { matched: 0, partial: 0, missing: 0 };
  for (const match of report.matches) tally[match.status] += 1;
  return tally;
}
