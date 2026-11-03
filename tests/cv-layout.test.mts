import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { layoutCv, layoutText, layoutToText } from "@/lib/analysis/cv-layout";
import { computeAts } from "@/lib/analysis/ats";

/**
 * The improved-CV layout.
 *
 * It restructures but must never drop or reword content, and the tidy text it
 * produces has to score at least as well on the ATS check as what went in.
 */

const MESSY_CV = `Jane Doe
jane@example.com
+44 7700 900123
linkedin.com/in/janedoe

Analyst who turns messy data into decisions.

Experience
Data Analyst, Acme Retail, 2021 - 2024
- Built weekly Tableau dashboards used by 40 store managers
* Automated monthly reporting in Python, saving 6 hours a month


Education:
BSc Statistics, University of Leeds, 2020
Skills: SQL, Python, Tableau, Excel`;

describe("layoutCv", () => {
  const layout = layoutText(MESSY_CV);

  it("reads the name and joins contact details into one line", () => {
    assert.equal(layout.name?.text, "Jane Doe");
    assert.deepEqual(
      layout.contact.map((line) => line.text),
      ["jane@example.com  |  +44 7700 900123  |  linkedin.com/in/janedoe"],
    );
  });

  it("gives an unlabelled opening paragraph a Profile heading", () => {
    assert.equal(layout.sections[0].heading, "PROFILE");
    assert.equal(layout.sections[0].lines[0].text, "Analyst who turns messy data into decisions.");
  });

  it("upper-cases headings and splits inline ones", () => {
    assert.deepEqual(
      layout.sections.map((section) => section.heading),
      ["PROFILE", "EXPERIENCE", "EDUCATION", "SKILLS"],
    );
    const skills = layout.sections.find((section) => section.heading === "SKILLS");
    assert.equal(skills?.lines[0].text, "SQL, Python, Tableau, Excel");
  });

  it("marks role lines as entries and unifies bullets", () => {
    const experience = layout.sections.find((section) => section.heading === "EXPERIENCE");
    assert.deepEqual(
      experience?.lines.map((line) => line.kind),
      ["entry", "bullet", "bullet"],
    );
    assert.ok(experience?.lines.every((line) => !/^[-*•]/.test(line.text)));
  });

  it("keeps every word of the original", () => {
    const words = (text: string) =>
      text.toLowerCase().match(/[\p{L}\p{N}@.+/-]+/gu)?.filter((w) => !/^[-*•|]+$/.test(w)) ?? [];
    const before = new Set(words(MESSY_CV.replace(/:/g, " ")));
    const after = new Set(words(layoutToText(layout)));
    for (const word of before) assert.ok(after.has(word), `lost "${word}"`);
  });

  it("collapses blank runs and separates sections with one blank line", () => {
    const text = layoutToText(layout);
    assert.ok(!/\n{3,}/.test(text));
    assert.match(text, /\n\nEXPERIENCE\nData Analyst/);
    assert.match(text, /\n• Built weekly Tableau/);
  });

  it("does not score worse on the ATS check than the original", () => {
    const original = computeAts({ text: MESSY_CV, warnings: [], source: "paste" });
    const tidy = computeAts({ text: layoutToText(layout), warnings: [], source: "paste" });
    assert.ok(tidy.score >= original.score, `${tidy.score} < ${original.score}`);
  });

  it("carries the changed flag through", () => {
    const result = layoutCv([
      { text: "Jane Doe", changed: false },
      { text: "", changed: false },
      { text: "EXPERIENCE", changed: false },
      { text: "- Rewritten bullet", changed: true, replaced: "- Old bullet" },
    ]);
    const bullet = result.sections[0].lines[0];
    assert.equal(bullet.changed, true);
    assert.equal(bullet.replaced, "- Old bullet");
  });

  it("copes with a CV that has no headings at all", () => {
    const result = layoutText("Just one paragraph about me, nothing else.");
    assert.equal(result.name, undefined);
    assert.equal(layoutToText(result), "Just one paragraph about me, nothing else.");
  });
});
