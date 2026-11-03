import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  coverLetterText,
  currentLetterText,
  letterParagraphs,
  quoteInCv,
  verifyCoverLetter,
} from "@/lib/analysis/cover-letter";
import { buildCoverLetterPrompt } from "@/lib/ai/prompts";
import { parseCoverLetterResponse } from "@/lib/ai/schemas";
import type { CoverLetterDraft } from "@/lib/types";

/**
 * The cover letter's no-invention rule, enforced in code: a body paragraph
 * survives only if at least one of its quotes is really in the CV.
 */

const CV = `Alex Taylor
EXPERIENCE
Data Analyst, Acme Retail, 2021 - 2024
- Built weekly Tableau dashboards used by 40 store managers
- Automated monthly reporting in Python, saving 6 hours a month`;

const draft = (body: CoverLetterDraft["body"]): CoverLetterDraft => ({
  greeting: "Dear Hiring Manager,",
  opening: "I'd like to be considered for the Product Analyst role.",
  body,
  closing: "I'd welcome a conversation.",
  signOff: "Kind regards,",
});

describe("verifyCoverLetter", () => {
  it("keeps paragraphs whose quotes are in the CV, ignoring case, spacing and bullets", () => {
    const { draft: result, dropped } = verifyCoverLetter(
      draft([
        {
          text: "At Acme I built the dashboards 40 managers use every week.",
          evidence: ["- built weekly  TABLEAU dashboards used by 40 store managers"],
        },
      ]),
      CV,
    );
    assert.equal(dropped, 0);
    assert.equal(result.body.length, 1);
    assert.deepEqual(result.body[0].evidence, ["built weekly  TABLEAU dashboards used by 40 store managers"]);
  });

  it("drops a paragraph whose only quote was made up", () => {
    const { draft: result, dropped } = verifyCoverLetter(
      draft([
        { text: "I led a team of 12 engineers.", evidence: ["Led a team of 12 engineers"] },
        { text: "I automated reporting.", evidence: ["Automated monthly reporting in Python"] },
      ]),
      CV,
    );
    assert.equal(dropped, 1);
    assert.deepEqual(
      result.body.map((p) => p.text),
      ["I automated reporting."],
    );
  });

  it("drops fabricated quotes but keeps the paragraph when one quote is real", () => {
    const { draft: result } = verifyCoverLetter(
      draft([
        {
          text: "Dashboards and automation.",
          evidence: ["Won the 2023 analytics award", "saving 6 hours a month"],
        },
      ]),
      CV,
    );
    assert.deepEqual(result.body[0].evidence, ["saving 6 hours a month"]);
  });

  it("does not accept a trivially short quote", () => {
    assert.equal(quoteInCv("Data", CV.toLowerCase()), false);
  });
});

describe("letter text", () => {
  const letter = draft([{ text: "Body paragraph.", evidence: ["x"] }]);

  it("assembles greeting to signature with the candidate's name", () => {
    const text = coverLetterText(letter, "Alex Taylor");
    assert.ok(text.startsWith("Dear Hiring Manager,\n\nI'd like"));
    assert.ok(text.endsWith("Kind regards,\nAlex Taylor"));
    assert.equal(letterParagraphs(text).length, 5);
  });

  it("prefers the user's own edit", () => {
    const edited = { ...letter, options: { tone: "warm" as const, length: "short" as const }, createdAt: 0, editedText: "Mine." };
    assert.equal(currentLetterText(edited, "Alex"), "Mine.");
  });
});

describe("parseCoverLetterResponse", () => {
  it("fills a missing greeting and sign-off and caps the body", () => {
    const parsed = parseCoverLetterResponse({
      greeting: "",
      opening: "Hello.",
      body: Array.from({ length: 7 }, () => ({ text: "p", evidence: ["q"] })),
      closing: "Bye.",
    });
    assert.equal(parsed.greeting, "Dear Hiring Manager,");
    assert.equal(parsed.signOff, "Kind regards,");
    assert.equal(parsed.body.length, 4);
  });
});

describe("buildCoverLetterPrompt", () => {
  it("passes the strengths, gaps and the user's own note, and never an empty manager", () => {
    const prompt = buildCoverLetterPrompt({
      cvText: CV,
      jobText: "Product Analyst. SQL, Tableau, stakeholder management.",
      jobTitle: "Product Analyst",
      tone: "confident",
      length: "short",
      motivation: "I use their app every day.",
      strengths: [{ requirement: "Tableau", evidence: "Built weekly Tableau dashboards" }],
      gaps: ["Stakeholder management"],
    });
    assert.match(prompt, /Hiring manager: unknown/);
    assert.match(prompt, /I use their app every day\./);
    assert.match(prompt, /- Tableau — CV: "Built weekly Tableau dashboards"/);
    assert.match(prompt, /- Stakeholder management/);
    assert.match(prompt, /Confident:/);
  });
});
