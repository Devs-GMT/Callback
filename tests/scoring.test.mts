import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ATS_WEIGHTS, computeAts, topFixes } from "@/lib/analysis/ats";
import { MATCH_WEIGHTS, buildMatchReport, gapsFrom, matchTally } from "@/lib/analysis/match";
import { computeKeywordCoverage, cvCoversKeyword } from "@/lib/analysis/keywords";
import { applySuggestions } from "@/lib/analysis/apply";
import type { AnalyzeResponse, CvInput, Suggestion } from "@/lib/types";

/**
 * The scoring engine.
 *
 * These are the numbers the README publishes and the report explains, so they
 * are worth pinning down: a silent change to a weight or to the partial-credit
 * rule would make every stamped before/after comparison meaningless.
 */

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const GOOD_CV = `Alex Taylor
alex.taylor@example.com · +44 7700 900123 · London · linkedin.com/in/alextaylor

Summary
Data analyst with four years of experience in SQL reporting and stakeholder communication.

Experience

Data Analyst, Acme Retail
Mar 2023 - Present
- Built weekly SQL reports for 4 teams, cutting manual reporting by 6 hours a week
- Designed 3 Power BI dashboards used by 40 stakeholders across finance and operations
- Reduced data errors by 32% by automating validation checks

Junior Analyst, Northwind Logistics
Jan 2021 - Feb 2023
- Analysed 12 months of delivery data and identified 240,000 in annual savings
- Automated 5 recurring reports using Python and scheduled queries

Data Intern, Brightwave Media
Jun 2020 - Dec 2020
- Cleaned and consolidated 18 monthly spreadsheets into a single reporting model
- Produced 9 campaign performance summaries read by the marketing leadership team
- Documented 14 recurring queries so the reporting process survived handover

Education

BSc Economics, University of Leeds
Sep 2017 - Jun 2020
- Graduated with first-class honours, dissertation on retail demand forecasting
- Led a student consulting project advising 3 local businesses on pricing

Skills
SQL, Python, Power BI, Excel, data visualisation, stakeholder management,
forecasting, A/B testing, data modelling, requirements gathering

Certifications
Microsoft Certified: Power BI Data Analyst Associate, Mar 2024`;

function cv(overrides: Partial<CvInput> = {}): CvInput {
  return { text: GOOD_CV, source: "paste", warnings: [], ...overrides };
}

function analysis(overrides: Partial<AnalyzeResponse> = {}): AnalyzeResponse {
  return {
    requirements: [],
    matches: [],
    keywords: [],
    redFlags: [],
    seniority: { jobLevel: "mid", cvLevel: "mid", note: "" },
    bulletQuality: { score: 12, detail: "Good bullets.", weakBullets: [] },
    looksLikeCv: true,
    looksLikeJob: true,
    verdict: "Solid.",
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* ATS                                                                        */
/* -------------------------------------------------------------------------- */

describe("computeAts", () => {
  it("has weights that sum to exactly 100", () => {
    const total = Object.values(ATS_WEIGHTS).reduce((sum, w) => sum + w, 0);
    assert.equal(total, 100);
  });

  it("never returns a score outside 0 to 100", () => {
    for (const input of [
      cv(),
      cv({ text: "" }),
      cv({ text: "x" }),
      cv({ warnings: ["two-columns", "tables", "images", "header-footer", "sparse-text"] }),
      cv({ pageCount: 40 }),
    ]) {
      const report = computeAts(input);
      assert.ok(report.score >= 0 && report.score <= 100, `got ${report.score}`);
    }
  });

  it("scores a well-formed CV highly", () => {
    const report = computeAts(cv({ pageCount: 1 }));
    assert.ok(report.score >= 85, `expected >= 85, got ${report.score}`);
  });

  it("reports every item's earned points within its weight", () => {
    const report = computeAts(cv({ pageCount: 1 }));
    for (const item of report.items) {
      assert.ok(
        item.earned >= 0 && item.earned <= item.weight,
        `${item.id}: ${item.earned}/${item.weight}`,
      );
      assert.equal(item.weight, ATS_WEIGHTS[item.id]);
    }
    const summed = report.items.reduce((sum, item) => sum + item.earned, 0);
    assert.equal(report.score, Math.round(summed));
  });

  it("fails the readable check on an image-only PDF", () => {
    const report = computeAts(cv({ text: "Alex Taylor", pageCount: 2 }));
    const readable = report.items.find((item) => item.id === "readable")!;
    assert.equal(readable.state, "fail");
    assert.equal(readable.earned, 0);
    assert.match(readable.fix, /text-based PDF|paste/i);
  });

  it("deducts for each formatting risk and never below zero", () => {
    const clean = computeAts(cv()).items.find((i) => i.id === "formatting")!;
    assert.equal(clean.earned, ATS_WEIGHTS.formatting);
    assert.equal(clean.state, "pass");

    const columns = computeAts(cv({ warnings: ["two-columns"] })).items.find(
      (i) => i.id === "formatting",
    )!;
    assert.equal(columns.earned, ATS_WEIGHTS.formatting - 6);

    const everything = computeAts(
      cv({ warnings: ["two-columns", "tables", "images", "header-footer"] }),
    ).items.find((i) => i.id === "formatting")!;
    assert.equal(everything.earned, 0);
    assert.equal(everything.state, "fail");
  });

  it("fails length on a CV too short to score, whatever its page count", () => {
    // The word-count floor is deliberate and takes precedence: a 1-page CV
    // with 40 words is too thin to assess, and saying "1 page, looks right"
    // would be the wrong answer.
    const shortCv = [
      "Alex Taylor",
      "alex@example.com",
      "Experience",
      "Did some work.",
    ].join("\n");

    const item = computeAts(cv({ text: shortCv, pageCount: 1 })).items.find(
      (i) => i.id === "length",
    )!;
    assert.equal(item.state, "fail");
  });

  it("scores length by page bands", () => {
    const bands: Array<[number, "pass" | "warn" | "fail"]> = [
      [1, "pass"],
      [2, "pass"],
      [3, "warn"],
      [4, "fail"],
      [9, "fail"],
    ];
    for (const [pages, expected] of bands) {
      const item = computeAts(cv({ pageCount: pages })).items.find(
        (i) => i.id === "length",
      )!;
      assert.equal(item.state, expected, `${pages} pages`);
    }
  });

  it("prefers the model's bullet score when one is supplied", () => {
    const withAi = computeAts(cv({ pageCount: 1 }), {
      score: 3,
      detail: "Mostly duty lists.",
      weakBullets: ["Responsible for data"],
    });
    const bullets = withAi.items.find((i) => i.id === "bullets")!;
    assert.equal(bullets.earned, 3);
    assert.equal(bullets.detail, "Mostly duty lists.");
  });

  it("clamps an out-of-range model bullet score into the weight", () => {
    const high = computeAts(cv(), { score: 99, detail: "", weakBullets: [] });
    assert.equal(high.items.find((i) => i.id === "bullets")!.earned, ATS_WEIGHTS.bullets);

    const low = computeAts(cv(), { score: -5, detail: "", weakBullets: [] });
    assert.equal(low.items.find((i) => i.id === "bullets")!.earned, 0);
  });

  it("falls back to rule-based bullet scoring with no model input", () => {
    // Every bullet here opens weakly and carries no number.
    const weak = cv({
      text: GOOD_CV.replace(
        /- Built weekly SQL reports for 4 teams, cutting manual reporting by 6 hours a week/,
        "- Responsible for managing data and reporting",
      ).replace(
        /- Designed 3 Power BI dashboards used by 40 stakeholders across finance and operations/,
        "- Worked on dashboards",
      ),
    });
    const strongScore = computeAts(cv()).items.find((i) => i.id === "bullets")!.earned;
    const weakScore = computeAts(weak).items.find((i) => i.id === "bullets")!.earned;
    assert.ok(weakScore < strongScore, `${weakScore} should be below ${strongScore}`);
  });

  it("orders top fixes by the points available", () => {
    const report = computeAts(
      cv({ text: "Alex Taylor", pageCount: 6, warnings: ["two-columns"] }),
    );
    const fixes = topFixes(report, 3);
    assert.ok(fixes.length > 0);
    for (let i = 1; i < fixes.length; i += 1) {
      const previous = fixes[i - 1].weight - fixes[i - 1].earned;
      const current = fixes[i].weight - fixes[i].earned;
      assert.ok(previous >= current, "fixes should be worst-gap first");
    }
    assert.ok(fixes.every((fix) => fix.state !== "pass"));
  });
});

/* -------------------------------------------------------------------------- */
/* Keywords                                                                   */
/* -------------------------------------------------------------------------- */

describe("keyword coverage", () => {
  it("matches case-insensitively", () => {
    assert.equal(cvCoversKeyword("I use SQL daily", "sql"), true);
    assert.equal(cvCoversKeyword("i use sql daily", "SQL"), true);
  });

  it("treats synonyms as the same keyword", () => {
    assert.equal(cvCoversKeyword("Experience with Postgres", "PostgreSQL"), true);
    assert.equal(cvCoversKeyword("Strong JS skills", "JavaScript"), true);
    assert.equal(cvCoversKeyword("Built in React", "reactjs"), true);
    assert.equal(cvCoversKeyword("Used Power BI", "powerbi"), true);
  });

  it("does not match a keyword inside a longer word", () => {
    // "R" must not match every word containing the letter r.
    assert.equal(cvCoversKeyword("Strong reporting background", "R"), false);
    // "Go" must not match "Google".
    assert.equal(cvCoversKeyword("Used Google Analytics", "golang"), false);
  });

  it("handles keywords containing punctuation", () => {
    assert.equal(cvCoversKeyword("Built services in C#", "C#"), true);
    assert.equal(cvCoversKeyword("Shipped on .NET 8", ".NET"), true);
    assert.equal(cvCoversKeyword("Ran the CI/CD pipeline", "ci/cd"), true);
  });

  it("de-duplicates keywords by canonical form", () => {
    // A job listing both forms must not count the same skill twice.
    const coverage = computeKeywordCoverage("I know JavaScript", ["JS", "JavaScript"]);
    assert.equal(coverage.matched.length + coverage.missing.length, 1);
    assert.equal(coverage.ratio, 1);
  });

  it("computes the ratio over matched and missing", () => {
    const coverage = computeKeywordCoverage("SQL and Python", [
      "SQL",
      "Python",
      "Kubernetes",
      "Terraform",
    ]);
    assert.deepEqual(coverage.matched.sort(), ["Python", "SQL"]);
    assert.deepEqual(coverage.missing.sort(), ["Kubernetes", "Terraform"]);
    assert.equal(coverage.ratio, 0.5);
  });

  it("returns a zero ratio for an empty keyword list", () => {
    const coverage = computeKeywordCoverage(GOOD_CV, []);
    assert.equal(coverage.ratio, 0);
    assert.deepEqual(coverage.matched, []);
  });

  it("ignores blank keywords", () => {
    const coverage = computeKeywordCoverage("SQL", ["SQL", "   ", ""]);
    assert.equal(coverage.matched.length + coverage.missing.length, 1);
  });
});

/* -------------------------------------------------------------------------- */
/* Match                                                                      */
/* -------------------------------------------------------------------------- */

describe("buildMatchReport", () => {
  it("weights must-haves, nice-to-haves and keywords as documented", () => {
    const total =
      MATCH_WEIGHTS.must + MATCH_WEIGHTS.nice + MATCH_WEIGHTS.keywords;
    assert.equal(total, 100);
    assert.equal(MATCH_WEIGHTS.must, 60);
    assert.equal(MATCH_WEIGHTS.nice, 20);
    assert.equal(MATCH_WEIGHTS.keywords, 20);
  });

  it("scores 100 when everything matches with real evidence", () => {
    const report = buildMatchReport(
      analysis({
        requirements: [
          { id: "r1", text: "SQL reporting", type: "must", category: "skill" },
          { id: "r2", text: "Power BI", type: "nice", category: "skill" },
        ],
        matches: [
          {
            requirementId: "r1",
            status: "matched",
            evidence: "Built weekly SQL reports for 4 teams",
            note: "",
          },
          {
            requirementId: "r2",
            status: "matched",
            evidence: "Designed 3 Power BI dashboards",
            note: "",
          },
        ],
        keywords: ["SQL", "Power BI"],
      }),
      GOOD_CV,
      "Analyst role needing SQL",
    );

    assert.equal(report.score, 100);
    assert.deepEqual(matchTally(report), { matched: 2, partial: 0, missing: 0 });
  });

  it("gives a partial match half credit", () => {
    const full = buildMatchReport(
      analysis({
        requirements: [{ id: "r1", text: "SQL", type: "must", category: "skill" }],
        matches: [
          {
            requirementId: "r1",
            status: "matched",
            evidence: "Built weekly SQL reports for 4 teams",
            note: "",
          },
        ],
        keywords: ["SQL"],
      }),
      GOOD_CV,
      "job",
    );

    const partial = buildMatchReport(
      analysis({
        requirements: [{ id: "r1", text: "SQL", type: "must", category: "skill" }],
        matches: [
          {
            requirementId: "r1",
            status: "partial",
            evidence: "Built weekly SQL reports for 4 teams",
            note: "",
          },
        ],
        keywords: ["SQL"],
      }),
      GOOD_CV,
      "job",
    );

    // There are no nice-to-haves, so the weights in play are the must-have's
    // 60 and keywords' 20, totalling 80. Full credit is (60 + 20) / 80 = 100%.
    // Half credit on the must-have is (30 + 20) / 80 = 62.5%, which rounds to 63.
    assert.equal(full.score, 100);
    assert.equal(partial.score, 63);
  });

  it("redistributes the nice-to-have weight when a job has none", () => {
    // With no nice-to-haves, a perfect must-have and keyword result must still
    // reach 100 rather than being capped at 80.
    const report = buildMatchReport(
      analysis({
        requirements: [{ id: "r1", text: "SQL", type: "must", category: "skill" }],
        matches: [
          {
            requirementId: "r1",
            status: "matched",
            evidence: "Built weekly SQL reports for 4 teams",
            note: "",
          },
        ],
        keywords: ["SQL"],
      }),
      GOOD_CV,
      "job",
    );
    assert.equal(report.score, 100);
  });

  it("demotes a match whose quote is not in the CV", () => {
    const report = buildMatchReport(
      analysis({
        requirements: [
          { id: "r1", text: "Kubernetes in production", type: "must", category: "skill" },
        ],
        matches: [
          {
            requirementId: "r1",
            status: "matched",
            // Nothing like this appears in GOOD_CV.
            evidence: "Operated a 60-node Kubernetes cluster across three regions",
            note: "",
          },
        ],
        keywords: [],
      }),
      GOOD_CV,
      "job",
    );

    const match = report.matches[0];
    assert.equal(match.status, "missing");
    assert.equal(match.evidence, "");
    assert.match(match.note, /couldn't find/i);
    assert.equal(report.score, 0);
  });

  it("accepts a quote that differs only in whitespace and case", () => {
    const report = buildMatchReport(
      analysis({
        requirements: [{ id: "r1", text: "SQL", type: "must", category: "skill" }],
        matches: [
          {
            requirementId: "r1",
            status: "matched",
            evidence: "built   weekly SQL REPORTS for 4 teams",
            note: "",
          },
        ],
        keywords: [],
      }),
      GOOD_CV,
      "job",
    );
    assert.equal(report.matches[0].status, "matched");
  });

  it("treats a matched claim with no quote as missing", () => {
    const report = buildMatchReport(
      analysis({
        requirements: [{ id: "r1", text: "SQL", type: "must", category: "skill" }],
        matches: [
          { requirementId: "r1", status: "matched", evidence: "   ", note: "" },
        ],
        keywords: [],
      }),
      GOOD_CV,
      "job",
    );
    assert.equal(report.matches[0].status, "missing");
  });

  it("counts a requirement the model forgot to judge as missing", () => {
    const report = buildMatchReport(
      analysis({
        requirements: [
          { id: "r1", text: "SQL", type: "must", category: "skill" },
          { id: "r2", text: "Kubernetes", type: "must", category: "skill" },
        ],
        matches: [
          {
            requirementId: "r1",
            status: "matched",
            evidence: "Built weekly SQL reports for 4 teams",
            note: "",
          },
        ],
        keywords: [],
      }),
      GOOD_CV,
      "job",
    );
    assert.equal(report.matches.length, 2);
    assert.equal(report.matches[1].status, "missing");
    // One of two must-haves matched. With no nice-to-haves and no keywords,
    // the must-have bucket carries the whole score, so 1/2 is 50%.
    assert.equal(report.score, 50);
  });

  it("flags a seniority gap of two levels as a mismatch", () => {
    const report = buildMatchReport(
      analysis({
        requirements: [{ id: "r1", text: "SQL", type: "must", category: "skill" }],
        matches: [{ requirementId: "r1", status: "missing", evidence: "", note: "" }],
        seniority: { jobLevel: "lead", cvLevel: "junior", note: "" },
      }),
      GOOD_CV,
      "job",
    );
    assert.equal(report.seniority.mismatch, true);
    assert.ok(report.seniority.note.length > 0);
  });

  it("does not treat an adjacent seniority level as a mismatch", () => {
    const report = buildMatchReport(
      analysis({
        requirements: [{ id: "r1", text: "SQL", type: "must", category: "skill" }],
        matches: [{ requirementId: "r1", status: "missing", evidence: "", note: "" }],
        seniority: { jobLevel: "senior", cvLevel: "mid", note: "" },
      }),
      GOOD_CV,
      "job",
    );
    assert.equal(report.seniority.mismatch, false);
  });

  it("lists gaps with missing must-haves first", () => {
    const report = buildMatchReport(
      analysis({
        requirements: [
          { id: "r1", text: "Nice thing", type: "nice", category: "skill" },
          { id: "r2", text: "Must thing", type: "must", category: "skill" },
          { id: "r3", text: "Matched thing", type: "must", category: "skill" },
        ],
        matches: [
          { requirementId: "r1", status: "missing", evidence: "", note: "" },
          { requirementId: "r2", status: "missing", evidence: "", note: "" },
          {
            requirementId: "r3",
            status: "matched",
            evidence: "Built weekly SQL reports for 4 teams",
            note: "",
          },
        ],
      }),
      GOOD_CV,
      "job",
    );

    const gaps = gapsFrom(report);
    assert.equal(gaps.length, 2);
    assert.equal(gaps[0].id, "r2", "the missing must-have comes first");
    assert.equal(gaps[1].id, "r1");
  });
});

/* -------------------------------------------------------------------------- */
/* Applying suggestions                                                       */
/* -------------------------------------------------------------------------- */

describe("applySuggestions", () => {
  const rewrite: Suggestion = {
    id: "s1",
    kind: "rewrite",
    title: "Lead with the SQL work",
    before: "- Built weekly SQL reports for 4 teams, cutting manual reporting by 6 hours a week",
    after: "Built weekly SQL dashboards for 4 stakeholder teams, cutting manual reporting by 6 hours a week",
    keywords: ["SQL dashboards"],
    rationale: "Uses the job's wording.",
  };

  it("changes nothing while a suggestion is pending", () => {
    const result = applySuggestions(GOOD_CV, [rewrite], { s1: "pending" });
    assert.equal(result.text, GOOD_CV.trim());
    assert.ok(result.segments.every((segment) => !segment.changed));
  });

  it("applies an accepted rewrite and marks the line as changed", () => {
    const result = applySuggestions(GOOD_CV, [rewrite], { s1: "accepted" });

    assert.ok(result.text.includes("SQL dashboards for 4 stakeholder teams"));
    assert.ok(!result.text.includes("SQL reports for 4 teams, cutting"));

    const changed = result.segments.filter((segment) => segment.changed);
    assert.equal(changed.length, 1);
    assert.equal(changed[0].suggestionId, "s1");
    assert.ok(changed[0].replaced?.includes("Built weekly SQL reports"));
    assert.equal(result.unapplied.length, 0);
  });

  it("keeps the original bullet marker on a rewritten line", () => {
    const result = applySuggestions(GOOD_CV, [rewrite], { s1: "accepted" });
    const changed = result.segments.find((segment) => segment.changed)!;
    assert.match(changed.text, /^- /, "the bullet marker should survive");
  });

  it("reports an accepted rewrite it cannot anchor", () => {
    const orphan: Suggestion = {
      ...rewrite,
      id: "s9",
      before: "- A line that is nowhere in this CV at all, not even close",
    };
    const result = applySuggestions(GOOD_CV, [orphan], { s9: "accepted" });
    assert.equal(result.unapplied.length, 1);
    assert.equal(result.unapplied[0].id, "s9");
    assert.equal(result.text, GOOD_CV.trim());
  });

  it("never writes an accepted keyword suggestion into the CV", () => {
    // The no-invention rule: accepting this is the user noting the advice, not
    // asking us to put an unsupported claim in their CV.
    const keywords: Suggestion = {
      id: "s2",
      kind: "keywords",
      title: "Add only if true",
      keywords: ["Kubernetes", "Terraform"],
      rationale: "The job asks for these.",
      needsUserConfirmation: true,
    };

    const result = applySuggestions(GOOD_CV, [keywords], { s2: "accepted" });
    assert.equal(result.text, GOOD_CV.trim());
    assert.ok(!result.text.includes("Kubernetes"));
    assert.equal(result.unapplied.length, 0, "not unapplied — simply not applicable");
  });

  it("never writes an accepted gap suggestion into the CV", () => {
    const gap: Suggestion = {
      id: "s3",
      kind: "gap",
      title: "Build a dashboard project",
      rationale: "Closes the visualisation gap.",
    };
    const result = applySuggestions(GOOD_CV, [gap], { s3: "accepted" });
    assert.equal(result.text, GOOD_CV.trim());
  });

  it("removes a line for an accepted cut", () => {
    const cut: Suggestion = {
      id: "s4",
      kind: "cut",
      title: "Drop the unrelated line",
      before: "- Automated 5 recurring reports using Python and scheduled queries",
      rationale: "Not relevant to this job.",
    };
    const result = applySuggestions(GOOD_CV, [cut], { s4: "accepted" });
    assert.ok(!result.text.includes("Automated 5 recurring reports"));
  });

  it("replaces the body under an existing summary heading", () => {
    const summary: Suggestion = {
      id: "s5",
      kind: "summary",
      title: "New summary for this job",
      after: "Analyst who turns SQL into dashboards stakeholders actually use.",
      rationale: "Targets the role.",
    };
    const result = applySuggestions(GOOD_CV, [summary], { s5: "accepted" });

    assert.ok(result.text.includes("turns SQL into dashboards"));
    assert.ok(
      !result.text.includes("Data analyst with four years of experience"),
      "the old summary body should be gone",
    );
    assert.ok(result.text.includes("Summary"), "the heading should remain");
  });

  it("applies several accepted suggestions without clobbering each other", () => {
    const second: Suggestion = {
      id: "s6",
      kind: "rewrite",
      title: "Sharpen the dashboard bullet",
      before: "- Designed 3 Power BI dashboards used by 40 stakeholders across finance and operations",
      after: "Designed 3 Power BI dashboards used daily by 40 stakeholders in finance and operations",
      rationale: "Tighter.",
    };

    const result = applySuggestions(GOOD_CV, [rewrite, second], {
      s1: "accepted",
      s6: "accepted",
    });

    assert.ok(result.text.includes("SQL dashboards for 4 stakeholder teams"));
    assert.ok(result.text.includes("used daily by 40 stakeholders"));
    assert.equal(result.segments.filter((s) => s.changed).length, 2);
    assert.equal(result.unapplied.length, 0);
  });

  it("ignores a dismissed suggestion", () => {
    const result = applySuggestions(GOOD_CV, [rewrite], { s1: "dismissed" });
    assert.equal(result.text, GOOD_CV.trim());
  });

  it("produces text that still scores as a CV", () => {
    // A guard on the whole pipeline: applying suggestions must not destroy the
    // structure the ATS checks look for, or a re-check would score worse for
    // reasons that have nothing to do with the edits.
    const applied = applySuggestions(GOOD_CV, [rewrite], { s1: "accepted" });
    const before = computeAts(cv({ pageCount: 1 }));
    const after = computeAts(cv({ text: applied.text, pageCount: 1 }));
    assert.ok(
      after.score >= before.score - 2,
      `re-check dropped from ${before.score} to ${after.score}`,
    );
  });
});
