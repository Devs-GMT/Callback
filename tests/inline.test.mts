import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  contactRuns,
  insertLink,
  parseInline,
  stripInline,
  toggleBullets,
  toggleMarker,
} from "@/lib/analysis/inline";
import {
  addSection,
  layoutText,
  moveSection,
  renameSection,
  toggleHeading,
  withoutSections,
} from "@/lib/analysis/cv-layout";
import { sectionKeyOf } from "@/lib/analysis/text";

describe("parseInline", () => {
  it("reads bold, italic and links, and leaves the rest as text", () => {
    assert.deepEqual(parseInline("Built **10+ APIs** in *Go* — [demo](https://velora.app)"), [
      { text: "Built " },
      { text: "10+ APIs", bold: true },
      { text: " in " },
      { text: "Go", italic: true },
      { text: " — " },
      { text: "demo", href: "https://velora.app" },
    ]);
  });

  it("does not read arithmetic or a lone star as italic", () => {
    assert.deepEqual(parseInline("5 * 3 = 15"), [{ text: "5 * 3 = 15" }]);
  });

  it("drops unsafe link targets but keeps the label", () => {
    assert.equal(parseInline("[site](javascript:void)")[0].href, undefined);
    assert.equal(parseInline("[site](github.com/jane)")[0].href, "https://github.com/jane");
  });

  it("strips to what an ATS should read", () => {
    assert.equal(stripInline("**Go** and *SQL*, see [my site](https://jane.dev)"), "Go and SQL, see my site");
  });
});

describe("contactRuns", () => {
  it("links emails and web addresses but not phone numbers or places", () => {
    const runs = contactRuns("Yogyakarta, Indonesia  •  087802473448  •  bayu@example.com  •  github.com/bayu");
    const links = runs.filter((run) => run.href).map((run) => [run.text.trim(), run.href]);
    assert.deepEqual(links, [
      ["bayu@example.com", "mailto:bayu@example.com"],
      ["github.com/bayu", "https://github.com/bayu"],
    ]);
  });
});

describe("editor commands", () => {
  it("wraps a selection in bold and unwraps it again", () => {
    const value = "Built REST APIs";
    const on = toggleMarker(value, 6, 15, "**");
    assert.equal(on.value, "Built **REST APIs**");
    assert.equal(on.value.slice(on.start, on.end), "REST APIs");
    const off = toggleMarker(on.value, on.start, on.end, "**");
    assert.equal(off.value, value);
  });

  it("keeps markers off the spaces around a selection", () => {
    assert.equal(toggleMarker("a word here", 1, 7, "*").value, "a *word* here");
  });

  it("turns a selection into a link", () => {
    assert.equal(insertLink("See my site", 7, 11, "https://jane.dev").value, "See my [site](https://jane.dev)");
  });

  it("bullets and un-bullets every selected line", () => {
    const on = toggleBullets("Go\nSQL\nPython", 0, 6);
    assert.equal(on.value, "• Go\n• SQL\nPython");
    assert.equal(toggleBullets(on.value, 0, 8).value, "Go\nSQL\nPython");
  });
});

describe("formatting and the layout", () => {
  it("still finds a bold heading and keeps markers on the line", () => {
    const layout = layoutText("Jane Doe\njane@example.com\n**SKILLS**\nExpert in **Go**");
    assert.equal(layout.sections[0].heading, "SKILLS");
    assert.equal(layout.sections[0].lines[0].text, "Expert in **Go**");
  });
});

describe("section edits", () => {
  const CV = `Jane Doe
jane@example.com

EXPERIENCE
Engineer | Acme | 2021 - 2024
• Built the billing service

SKILLS
Go, SQL

EDUCATION
BSc Computer Science, 2020`;

  it("moves a section and keeps the header first", () => {
    const moved = moveSection(CV, 2, 0);
    assert.deepEqual(layoutText(moved).sections.map((s) => s.heading), ["EDUCATION", "EXPERIENCE", "SKILLS"]);
    assert.ok(moved.startsWith("Jane Doe\njane@example.com"));
  });

  it("renames a heading so it still reads as one", () => {
    const renamed = renameSection(CV, 1, "Technical skills:");
    assert.deepEqual(layoutText(renamed).sections.map((s) => s.heading), ["EXPERIENCE", "TECHNICAL SKILLS", "EDUCATION"]);
    assert.equal(renameSection(CV, 1, "x"), CV, "too short to be a heading");
  });

  it("leaves hidden sections out of the layout", () => {
    const layout = withoutSections(layoutText(CV), ["SKILLS"]);
    assert.deepEqual(layout.sections.map((s) => s.heading), ["EXPERIENCE", "EDUCATION"]);
  });
});

describe("new sections", () => {
  const CV = "Jane Doe\njane@example.com\n\nEXPERIENCE\nEngineer | Acme | 2021 - 2024\n• Built things";

  it("adds a section at the end with its skeleton selected", () => {
    const added = addSection(CV, "Projects", "Project name | Tools | 2025");
    assert.ok(added);
    assert.equal(added.value.slice(added.start, added.end), "Project name | Tools | 2025");
    assert.deepEqual(layoutText(added.value).sections.map((s) => s.heading), ["EXPERIENCE", "PROJECTS"]);
  });

  it("turns the line under the cursor into a heading, and back", () => {
    const value = `${CV}\nVolunteering\nTaught kids to code | Code Club | 2023`;
    const at = value.indexOf("Volunteering") + 3;
    const on = toggleHeading(value, at);
    assert.ok(on);
    assert.deepEqual(layoutText(on.value).sections.map((s) => s.heading), ["EXPERIENCE", "VOLUNTEERING"]);
    const off = toggleHeading(on.value, on.start);
    assert.ok(off?.value.includes("\nVolunteering\n"));
  });

  it("refuses to make a long sentence a heading", () => {
    assert.equal(toggleHeading("Built a billing service used by forty thousand customers every month", 3), undefined);
  });

  it("files English and Indonesian headings for the ATS", () => {
    assert.equal(sectionKeyOf("PROFESSIONAL EXPERIENCE"), "experience");
    assert.equal(sectionKeyOf("PENGALAMAN KERJA"), "experience");
    assert.equal(sectionKeyOf("PENDIDIKAN"), "education");
    assert.equal(sectionKeyOf("KEAHLIAN"), "skills");
    assert.equal(sectionKeyOf("RINGKASAN"), "summary");
    assert.equal(sectionKeyOf("PROJECTS"), undefined);
  });

  it("reads Indonesian headings as sections in the layout", () => {
    const layout = layoutText("Budi Santoso\nbudi@example.com\nPENGALAMAN KERJA\n• Membangun API\nORGANISASI\n• Ketua himpunan");
    assert.deepEqual(layout.sections.map((s) => s.heading), ["PENGALAMAN KERJA", "ORGANISASI"]);
  });
});
