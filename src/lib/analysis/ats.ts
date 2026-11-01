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

function checkReadable(cv: CvInput): AtsCheckItem {
  const weight = ATS_WEIGHTS.readable;
  const words = wordCount(cv.text);
  const perPage = cv.pageCount ? words / cv.pageCount : words;

  // An image-only (scanned) PDF yields almost no text. PRD section 11 treats
  // this as its own error state and an ATS fail.
  if (words < 60) {
    return {
      id: "readable",
      label: "Text is readable",
      state: "fail",
      earned: 0,
      weight,
      detail:
        "We could barely read any text — this looks like a scanned or image-only file.",
      fix: "Export your CV as a text-based PDF (File → Export as PDF, not a scan) or paste the text instead.",
    };
  }

  if (has(cv.warnings, "sparse-text") || perPage < 120) {
    const earned = Math.round(weight * 0.5);
    return {
      id: "readable",
      label: "Text is readable",
      state: "warn",
      earned,
      weight,
      detail: `Only ${words} words of text came through${
        cv.pageCount ? ` across ${cv.pageCount} page${cv.pageCount > 1 ? "s" : ""}` : ""
      } — some of your CV may be inside images.`,
      fix: "Check the preview above. If text is missing, re-export as a text-based PDF or paste the text.",
    };
  }

  return {
    id: "readable",
    label: "Text is readable",
    state: "pass",
    earned: weight,
    weight,
    detail: `${words} words extracted cleanly — an ATS will be able to parse this.`,
    fix: "Nothing to fix.",
  };
}

function checkSections(cv: CvInput): AtsCheckItem {
  const weight = ATS_WEIGHTS.sections;
  const found = detectSections(cv.text);
  const core = (["experience", "education", "skills"] as const).filter(
    (k) => found[k],
  );
  // 6 points per core section (18) plus 2 for a summary, totalling 20.
  const earned = clamp(core.length * 6 + (found.summary ? 2 : 0), 0, weight);
  const missing = (["experience", "education", "skills"] as const)
    .filter((k) => !found[k])
    .map((k) => k[0].toUpperCase() + k.slice(1));

  const detail =
    missing.length === 0
      ? `Found Experience, Education and Skills${found.summary ? " and a Summary" : ""}.`
      : `Missing a clear heading for ${missing.join(" and ")}.`;

  return {
    id: "sections",
    label: "Standard sections found",
    state: stateFor(earned, weight),
    earned,
    weight,
    detail,
    fix:
      missing.length > 0
        ? `Add a plain heading for ${missing.join(" and ")} — ATS parsers look for these exact words.`
        : found.summary
          ? "Nothing to fix."
          : 'Add a short "Summary" heading at the top to frame your profile for the role.',
  };
}

function checkContact(cv: CvInput): AtsCheckItem {
  const weight = ATS_WEIGHTS.contact;
  const c = detectContact(cv.text);
  const earned =
    (c.email ? 3 : 0) + (c.phone ? 3 : 0) + (c.location ? 2 : 0) + (c.web ? 2 : 0);

  const missing: string[] = [];
  if (!c.email) missing.push("email");
  if (!c.phone) missing.push("phone");
  if (!c.location) missing.push("city or location");
  if (!c.web) missing.push("LinkedIn or portfolio link");

  return {
    id: "contact",
    label: "Contact details present",
    state: stateFor(earned, weight),
    earned,
    weight,
    detail:
      missing.length === 0
        ? "Email, phone, location and a profile link are all there."
        : `Couldn't find your ${missing.join(", ")}.`,
    fix:
      missing.length === 0
        ? "Nothing to fix."
        : `Add your ${missing.join(", ")} as plain text near the top — not inside a header, footer or image.`,
  };
}

function checkDates(cv: CvInput): AtsCheckItem {
  const weight = ATS_WEIGHTS.dates;
  const dates = detectDates(cv.text);

  if (dates.total === 0) {
    return {
      id: "dates",
      label: "Dates are consistent",
      state: "fail",
      earned: 0,
      weight,
      detail: "No dates found next to your roles.",
      fix: 'Add a start and end date to every role, for example "Mar 2023 – Present".',
    };
  }

  if (dates.total < 2) {
    return {
      id: "dates",
      label: "Dates are consistent",
      state: "warn",
      earned: 4,
      weight,
      detail: "Only one date found — most roles seem to be missing dates.",
      fix: 'Give every role a start and end date in one format, for example "Jan 2022 – Mar 2024".',
    };
  }

  // One dominant format across most tokens is what parsers cope with best.
  const consistent = dates.dominantShare >= 0.8;
  const yearOnly = dates.dominant === "year-only";

  if (consistent && !yearOnly && dates.hasRanges) {
    return {
      id: "dates",
      label: "Dates are consistent",
      state: "pass",
      earned: weight,
      weight,
      detail: `${dates.total} dates, all in one standard format.`,
      fix: "Nothing to fix.",
    };
  }

  if (consistent && (yearOnly || !dates.hasRanges)) {
    return {
      id: "dates",
      label: "Dates are consistent",
      state: "warn",
      earned: 7,
      weight,
      detail: yearOnly
        ? "Dates are years only, so an ATS can't tell how long each role lasted."
        : "Dates are consistent but no date ranges were found.",
      fix: 'Use month and year ranges, for example "Mar 2023 – Jun 2025".',
    };
  }

  return {
    id: "dates",
    label: "Dates are consistent",
    state: "warn",
    earned: 5,
    weight,
    detail: `Mixed date formats found (${Object.entries(dates.counts)
      .filter(([, n]) => n > 0)
      .map(([f]) => f.replace("-", " "))
      .join(", ")}).`,
    fix: 'Pick one format and use it everywhere — "Mar 2023 – Jun 2025" is the safest.',
  };
}

function checkFormatting(cv: CvInput): AtsCheckItem {
  const weight = ATS_WEIGHTS.formatting;
  // Annotated because `ATS_WEIGHTS` is `as const`, which would otherwise infer
  // the literal type 15 here and reject the deductions below.
  let earned: number = weight;
  const problems: string[] = [];
  const fixes: string[] = [];

  if (has(cv.warnings, "two-columns")) {
    earned -= 6;
    problems.push("a two-column layout");
    fixes.push("switch to a single column — columns get read out of order");
  }
  if (has(cv.warnings, "tables")) {
    earned -= 4;
    problems.push("tables");
    fixes.push("replace tables with plain headings and bullet lists");
  }
  if (has(cv.warnings, "images")) {
    earned -= 3;
    problems.push("images");
    fixes.push("remove images, icons and photos — their text is invisible to an ATS");
  }
  if (has(cv.warnings, "header-footer")) {
    earned -= 2;
    problems.push("key details inside a header or footer");
    fixes.push("move contact details into the body of the page");
  }

  earned = clamp(earned, 0, weight);

  return {
    id: "formatting",
    label: "No formatting risks",
    state: stateFor(earned, weight),
    earned,
    weight,
    detail:
      problems.length === 0
        ? "Simple single-column layout with no tables or images — ATS-safe."
        : `Found ${problems.join(", ")}.`,
    fix: fixes.length === 0 ? "Nothing to fix." : `${fixes.join("; ")}.`,
  };
}

function checkLength(cv: CvInput): AtsCheckItem {
  const weight = ATS_WEIGHTS.length;
  const words = wordCount(cv.text);
  const pages = cv.pageCount ?? Math.max(1, Math.round(words / WORDS_PER_PAGE));
  const estimated = cv.pageCount === undefined;
  const suffix = estimated ? " (estimated from the text length)" : "";

  if (words < 200) {
    return {
      id: "length",
      label: "Length is right",
      state: "fail",
      earned: 2,
      weight,
      detail: `Only ${words} words — this is too short to show what you've done.`,
      fix: "Aim for one full page: 3 to 5 bullets per recent role, each with a result.",
    };
  }

  if (pages <= 2) {
    return {
      id: "length",
      label: "Length is right",
      state: "pass",
      earned: weight,
      weight,
      detail: `About ${pages} page${pages > 1 ? "s" : ""}${suffix} — right for most roles.`,
      fix: "Nothing to fix.",
    };
  }

  if (pages === 3) {
    return {
      id: "length",
      label: "Length is right",
      state: "warn",
      earned: 6,
      weight,
      detail: `About 3 pages${suffix} — longer than most recruiters read.`,
      fix: "Cut to 2 pages: drop roles older than 10 years and trim bullets that don't match this job.",
    };
  }

  return {
    id: "length",
    label: "Length is right",
    state: "fail",
    earned: 2,
    weight,
    detail: `About ${pages} pages${suffix} — well over the 1 to 2 pages expected.`,
    fix: "Cut to 2 pages. Keep the last 10 years in detail and compress the rest to one line each.",
  };
}

function checkBullets(cv: CvInput, ai?: BulletQualityInput): AtsCheckItem {
  const weight = ATS_WEIGHTS.bullets;
  const stats = analyseBullets(cv.text);

  if (stats.total === 0) {
    return {
      id: "bullets",
      label: "Bullet quality",
      state: "fail",
      earned: 0,
      weight,
      detail: "No bullet points found — your experience reads as paragraphs.",
      fix: "Turn each role into 3 to 5 bullets that start with a verb and end with a result.",
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
    detail = `${stats.withActionVerb} of ${stats.total} bullets start with an action verb; ${stats.withNumbers} include a number or result.`;
  }

  const weakCount = ai?.weakBullets.length ?? stats.weak.length;

  return {
    id: "bullets",
    label: "Bullet quality",
    state: stateFor(earned, weight),
    earned,
    weight,
    detail,
    fix:
      earned >= weight * 0.85
        ? "Nothing to fix."
        : `Rewrite ${weakCount === 1 ? "the weak bullet" : `the ${weakCount} weaker bullets`} to start with a verb and end with a number — see the "What to pivot" tab.`,
  };
}

/* -------------------------------------------------------------------------- */

/**
 * Run all seven checks. Pure and synchronous, so the UI can show the ATS tab
 * immediately after extraction and before the AI call returns.
 */
export function computeAts(cv: CvInput, ai?: BulletQualityInput): AtsReport {
  const items: AtsCheckItem[] = [
    checkReadable(cv),
    checkSections(cv),
    checkContact(cv),
    checkDates(cv),
    checkFormatting(cv),
    checkLength(cv),
    checkBullets(cv, ai),
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
