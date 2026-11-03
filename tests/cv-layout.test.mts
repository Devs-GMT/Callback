import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { layoutCv, layoutText, layoutToText, splitEntry } from "@/lib/analysis/cv-layout";
import { computeAts } from "@/lib/analysis/ats";
import { CV_TEMPLATES, MAX_HEADING_TRACKING } from "@/lib/cv-templates";

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

  it("reads entry lines into title, org and dates", () => {
    const experience = layout.sections.find((section) => section.heading === "EXPERIENCE");
    assert.deepEqual(experience?.lines[0].parts, {
      title: "Data Analyst",
      org: "Acme Retail",
      dates: "2021 – 2024",
    });
    // The line text itself is never rewritten.
    assert.equal(experience?.lines[0].text, "Data Analyst, Acme Retail, 2021 - 2024");
  });

  it("treats a dated line with no bullets as an entry", () => {
    const education = layout.sections.find((section) => section.heading === "EDUCATION");
    assert.equal(education?.lines[0].kind, "entry");
    assert.deepEqual(education?.lines[0].parts, {
      title: "BSc Statistics",
      org: "University of Leeds",
      dates: "2020",
    });
  });

  it("copes with a CV that has no headings at all", () => {
    const result = layoutText("Just one paragraph about me, nothing else.");
    assert.equal(result.name, undefined);
    assert.equal(layoutToText(result), "Just one paragraph about me, nothing else.");
  });
});

describe("layoutCv header", () => {
  it("separates the headline and folds the city into the contact line", () => {
    const result = layoutText(`Alex Taylor
Junior Data Analyst
London, UK
alex@example.com
+44 7700 900123

EXPERIENCE
- Did things`);
    assert.equal(result.headline?.text, "Junior Data Analyst");
    assert.deepEqual(
      result.contact.map((line) => line.text),
      ["London, UK  |  alex@example.com  |  +44 7700 900123"],
    );
    assert.ok(
      layoutToText(result).startsWith(`Alex Taylor
Junior Data Analyst
London, UK`),
    );
  });

  it("does not mistake a city for a headline", () => {
    const result = layoutText(`Alex Taylor
Jakarta Selatan, Indonesia
alex@example.com

SKILLS
SQL`);
    assert.equal(result.headline, undefined);
  });
});

describe("CV templates", () => {
  it("keep heading tracking low enough to extract as one word", () => {
    for (const template of Object.values(CV_TEMPLATES)) {
      assert.ok(template.headingTracking <= MAX_HEADING_TRACKING, template.id);
    }
  });
});

describe("splitEntry", () => {
  const cases: Array<[string, ReturnType<typeof splitEntry>]> = [
    [
      "Senior Engineer | Stripe | Jan 2021 – Present",
      { title: "Senior Engineer", org: "Stripe", dates: "Jan 2021 – Present" },
    ],
    [
      "Product Analyst at Gojek (Mar 2020 - Jun 2022)",
      { title: "Product Analyst", org: "Gojek", dates: "Mar 2020 – Jun 2022" },
    ],
    [
      "Data Analyst — Tokopedia\t01/2019 - 12/2020",
      { title: "Data Analyst", org: "Tokopedia", dates: "01/2019 – 12/2020" },
    ],
    [
      "Staf Pemasaran di PT Maju Jaya, Agustus 2019 - sekarang",
      { title: "Staf Pemasaran", org: "PT Maju Jaya", dates: "Agustus 2019 – sekarang" },
    ],
    ["Freelance Designer   2018 to 2020", { title: "Freelance Designer", dates: "2018 to 2020" }],
    ["Volunteer Teacher", undefined],
  ];

  for (const [input, expected] of cases) {
    it(input, () => assert.deepEqual(splitEntry(input), expected));
  }

  it("leaves prose that ends on a year alone", () => {
    assert.equal(splitEntry("Graduated in 2020")?.dates, undefined);
  });
});
