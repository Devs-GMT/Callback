/**
 * The ATS score: 0 to 100, mostly rule-based and fully explainable.
 *
 * PRD section 3 fixes both the checks and their weights:
 *
 *   readable    20   text is readable, not an image-only PDF
 *   sections    20   Experience, Education, Skills (+ Summary)
 *   contact     10   email, phone, location, LinkedIn or portfolio
 *   dates       10   consistent and in a standard format
 *   formatting  15   tables, text boxes, 2 columns, images, headers/footers
 *   length      10   1 to 2 pages for most roles
 *   bullets     15   action verbs and quantified results (the model helps)
 *                    ----
 *                    100
 *
 * Every item carries its own pass/warn/fail state and a one-line fix, because
 * the report shows the reasoning rather than just the number.
 */

import type {
  AtsCheckItem,
  AtsReport,
  CheckState,
  CvInput,
  ExtractionWarning,
} from "@/lib/types";
import {
  analyseBullets,
  detectContact,
  detectDates,
  detectSections,
  wordCount,
} from "@/lib/analysis/text";
import { clamp } from "@/lib/utils";
import { fmt, type Locale } from "@/i18n/config";
import { libMessages, type LibMessages } from "@/i18n/lib";

type Msg = LibMessages["ats"];

export const ATS_WEIGHTS = {
  readable: 20,
  sections: 20,
  contact: 10,
  dates: 10,
  formatting: 15,
  length: 10,
  bullets: 15,
} as const;

/** Words per page used to estimate length when no page count is available. */
const WORDS_PER_PAGE = 500;

/** The model's optional read on bullet quality, from /api/fit/analyze. */
export type BulletQualityInput = {
  /** 0 to 15. */
  score: number;
  detail: string;
  weakBullets: string[];
};

function stateFor(earned: number, weight: number): CheckState {
  if (weight === 0) return "pass";
  const ratio = earned / weight;
  if (ratio >= 0.85) return "pass";
  if (ratio >= 0.45) return "warn";
  return "fail";
}

function has(warnings: ExtractionWarning[], w: ExtractionWarning) {
  return warnings.includes(w);
}

/* -------------------------------------------------------------------------- */

function checkReadable(cv: CvInput, m: Msg): AtsCheckItem {
  const r = m.readable;
  const weight = ATS_WEIGHTS.readable;
  const words = wordCount(cv.text);
  const perPage = cv.pageCount ? words / cv.pageCount : words;

  // An image-only (scanned) PDF yields almost no text. PRD section 11 treats
  // this as its own error state and an ATS fail.
  if (words < 60) {
    return {
      id: "readable",
      label: r.label,
      state: "fail",
      earned: 0,
      weight,
      detail: r.scanDetail,
      fix: r.scanFix,
    };
  }

  if (has(cv.warnings, "sparse-text") || perPage < 120) {
    const earned = Math.round(weight * 0.5);
    return {
      id: "readable",
      label: r.label,
      state: "warn",
      earned,
      weight,
      detail: fmt(r.sparseDetail, {
        words,
        pages: cv.pageCount
          ? cv.pageCount > 1
            ? fmt(r.sparsePagesMany, { pages: cv.pageCount })
            : r.sparsePagesOne
          : "",
      }),
      fix: r.sparseFix,
    };
  }

  return {
    id: "readable",
    label: r.label,
    state: "pass",
    earned: weight,
    weight,
    detail: fmt(r.passDetail, { words }),
    fix: m.nothingToFix,
  };
}

function checkSections(cv: CvInput, m: Msg): AtsCheckItem {
  const s = m.sections;
  const weight = ATS_WEIGHTS.sections;
  const found = detectSections(cv.text);
  const core = (["experience", "education", "skills"] as const).filter(
    (k) => found[k],
  );
  // 6 points per core section (18) plus 2 for a summary, totalling 20.
  const earned = clamp(core.length * 6 + (found.summary ? 2 : 0), 0, weight);
  const missing = (["experience", "education", "skills"] as const)
    .filter((k) => !found[k])
    .map((k) => s.names[k]);
  const missingList = missing.join(s.and);

  const detail =
    missing.length === 0
      ? fmt(s.foundAll, { summary: found.summary ? s.foundSummary : "" })
      : fmt(s.missing, { missing: missingList });

  return {
    id: "sections",
    label: s.label,
    state: stateFor(earned, weight),
    earned,
    weight,
    detail,
    fix:
      missing.length > 0
        ? fmt(s.fixMissing, { missing: missingList })
        : found.summary
          ? m.nothingToFix
          : s.fixSummary,
  };
}

function checkContact(cv: CvInput, m: Msg): AtsCheckItem {
  const k = m.contact;
  const weight = ATS_WEIGHTS.contact;
  const c = detectContact(cv.text);
  const earned =
    (c.email ? 3 : 0) + (c.phone ? 3 : 0) + (c.location ? 2 : 0) + (c.web ? 2 : 0);

  const missing: string[] = [];
  if (!c.email) missing.push(k.email);
  if (!c.phone) missing.push(k.phone);
  if (!c.location) missing.push(k.location);
  if (!c.web) missing.push(k.web);

  return {
    id: "contact",
    label: k.label,
    state: stateFor(earned, weight),
    earned,
    weight,
    detail:
      missing.length === 0
        ? k.allThere
        : fmt(k.missing, { missing: missing.join(", ") }),
    fix:
      missing.length === 0
        ? m.nothingToFix
        : fmt(k.fix, { missing: missing.join(", ") }),
  };
}

function checkDates(cv: CvInput, m: Msg): AtsCheckItem {
  const d = m.dates;
  const weight = ATS_WEIGHTS.dates;
  const dates = detectDates(cv.text);

  if (dates.total === 0) {
    return {
      id: "dates",
      label: d.label,
      state: "fail",
      earned: 0,
      weight,
      detail: d.noneDetail,
      fix: d.noneFix,
    };
  }

  if (dates.total < 2) {
    return {
      id: "dates",
      label: d.label,
      state: "warn",
      earned: 4,
      weight,
      detail: d.oneDetail,
      fix: d.oneFix,
    };
  }

  // One dominant format across most tokens is what parsers cope with best.
  const consistent = dates.dominantShare >= 0.8;
  const yearOnly = dates.dominant === "year-only";

  if (consistent && !yearOnly && dates.hasRanges) {
    return {
      id: "dates",
      label: d.label,
      state: "pass",
      earned: weight,
      weight,
      detail: fmt(d.passDetail, { count: dates.total }),
      fix: m.nothingToFix,
    };
  }

  if (consistent && (yearOnly || !dates.hasRanges)) {
    return {
      id: "dates",
      label: d.label,
      state: "warn",
      earned: 7,
      weight,
      detail: yearOnly ? d.yearOnlyDetail : d.noRangesDetail,
      fix: d.rangesFix,
    };
  }

  return {
    id: "dates",
    label: d.label,
    state: "warn",
    earned: 5,
    weight,
    detail: fmt(d.mixedDetail, {
      formats: Object.entries(dates.counts)
        .filter(([, n]) => n > 0)
        .map(([f]) => d.formats[f] ?? f.replace("-", " "))
        .join(", "),
    }),
    fix: d.mixedFix,
  };
}

function checkFormatting(cv: CvInput, m: Msg): AtsCheckItem {
  const f = m.formatting;
  const weight = ATS_WEIGHTS.formatting;
  // Annotated because `ATS_WEIGHTS` is `as const`, which would otherwise infer
  // the literal type 15 here and reject the deductions below.
  let earned: number = weight;
  const problems: string[] = [];
  const fixes: string[] = [];

  if (has(cv.warnings, "two-columns")) {
    earned -= 6;
    problems.push(f.twoColumns);
    fixes.push(f.twoColumnsFix);
  }
  if (has(cv.warnings, "tables")) {
    earned -= 4;
    problems.push(f.tables);
    fixes.push(f.tablesFix);
  }
  if (has(cv.warnings, "images")) {
    earned -= 3;
    problems.push(f.images);
    fixes.push(f.imagesFix);
  }
  if (has(cv.warnings, "header-footer")) {
    earned -= 2;
    problems.push(f.headerFooter);
    fixes.push(f.headerFooterFix);
  }

  earned = clamp(earned, 0, weight);

  return {
    id: "formatting",
    label: f.label,
    state: stateFor(earned, weight),
    earned,
    weight,
    detail:
      problems.length === 0
        ? f.clean
        : fmt(f.found, { problems: problems.join(", ") }),
    fix: fixes.length === 0 ? m.nothingToFix : `${fixes.join("; ")}.`,
  };
}

function checkLength(cv: CvInput, m: Msg): AtsCheckItem {
  const l = m.length;
  const weight = ATS_WEIGHTS.length;
  const words = wordCount(cv.text);
  const pages = cv.pageCount ?? Math.max(1, Math.round(words / WORDS_PER_PAGE));
  const estimated = cv.pageCount === undefined;
  const suffix = estimated ? l.estimated : "";

  if (words < 200) {
    return {
      id: "length",
      label: l.label,
      state: "fail",
      earned: 2,
      weight,
      detail: fmt(l.tooShortDetail, { words }),
      fix: l.tooShortFix,
    };
  }

  if (pages <= 2) {
    return {
      id: "length",
      label: l.label,
      state: "pass",
      earned: weight,
      weight,
      detail: fmt(pages > 1 ? l.passMany : l.passOne, { pages, suffix }),
      fix: m.nothingToFix,
    };
  }

  if (pages === 3) {
    return {
      id: "length",
      label: l.label,
      state: "warn",
      earned: 6,
      weight,
      detail: fmt(l.threeDetail, { suffix }),
      fix: l.threeFix,
    };
  }

  return {
    id: "length",
    label: l.label,
    state: "fail",
    earned: 2,
    weight,
    detail: fmt(l.longDetail, { pages, suffix }),
    fix: l.longFix,
  };
}

function checkBullets(cv: CvInput, m: Msg, ai?: BulletQualityInput): AtsCheckItem {
  const b = m.bullets;
  const weight = ATS_WEIGHTS.bullets;
  const stats = analyseBullets(cv.text);

  if (stats.total === 0) {
    return {
      id: "bullets",
      label: b.label,
      state: "fail",
      earned: 0,
      weight,
      detail: b.noneDetail,
      fix: b.noneFix,
    };
  }

  // The model judges this better than a regex can, so prefer its score when
  // the AI pass succeeded. The rule-based number is the fallback and keeps the
  // ATS check working when the model is rate-limited (PRD section 11).
  let earned: number;
  let detail: string;

  if (ai && Number.isFinite(ai.score)) {
    earned = clamp(Math.round(ai.score), 0, weight);
    detail = ai.detail;
  } else {
    const verbRatio = stats.withActionVerb / stats.total;
    const numberRatio = stats.withNumbers / stats.total;
    // 8 points for strong openers, 7 for quantified results.
    earned = clamp(Math.round(verbRatio * 8 + numberRatio * 7), 0, weight);
    detail = fmt(b.ruleDetail, {
      verbs: stats.withActionVerb,
      total: stats.total,
      numbers: stats.withNumbers,
    });
  }

  const weakCount = ai?.weakBullets.length ?? stats.weak.length;

  return {
    id: "bullets",
    label: b.label,
    state: stateFor(earned, weight),
    earned,
    weight,
    detail,
    fix:
      earned >= weight * 0.85
        ? m.nothingToFix
        : weakCount === 1
          ? b.fixOne
          : fmt(b.fixMany, { count: weakCount }),
  };
}

/* -------------------------------------------------------------------------- */

/**
 * Run all seven checks. Pure and synchronous, so the UI can show the ATS tab
 * immediately after extraction and before the AI call returns.
 */
export function computeAts(
  cv: CvInput,
  ai?: BulletQualityInput,
  locale: Locale = "en",
): AtsReport {
  const m = libMessages(locale).ats;
  const items: AtsCheckItem[] = [
    checkReadable(cv, m),
    checkSections(cv, m),
    checkContact(cv, m),
    checkDates(cv, m),
    checkFormatting(cv, m),
    checkLength(cv, m),
    checkBullets(cv, m, ai),
  ];

  const score = clamp(
    Math.round(items.reduce((sum, item) => sum + item.earned, 0)),
    0,
    100,
  );

  return { score, items };
}

/** The top N fixes, worst gap first — the Overview tab's "top 3 fixes". */
export function topFixes(report: AtsReport, limit = 3): AtsCheckItem[] {
  return report.items
    .filter((item) => item.state !== "pass")
    .sort((a, b) => b.weight - b.earned - (a.weight - a.earned))
    .slice(0, limit);
}
