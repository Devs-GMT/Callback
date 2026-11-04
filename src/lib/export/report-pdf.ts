/**
 * Exporting the report as a PDF.
 *
 * The PRD suggests html2pdf.js, which screenshots the DOM with html2canvas and
 * drops the image into a PDF. That produces a file whose text cannot be
 * selected, searched or read by a screen reader, runs to several megabytes for
 * a long report, and routinely mangles web fonts and CSS colour functions.
 *
 * Writing the PDF directly with jsPDF's text API instead gives real vector
 * text: selectable, searchable, a fraction of the size, and identical on every
 * machine because the layout is computed here rather than captured from a
 * browser. The trade is that the layout is hand-built below rather than
 * inherited from the page's CSS.
 *
 * No CV content goes into this file beyond what the user is already looking
 * at — it is their own report, downloaded locally, and nothing is uploaded.
 */

import type { Report } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { fmt } from "@/i18n/config";
import { clientMessages } from "@/i18n/lib";

/* A4 in points, which is jsPDF's default unit for the "a4" format. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { x: 48, top: 56, bottom: 56 };
const CONTENT_WIDTH = PAGE.width - MARGIN.x * 2;

/** Espresso, muted grey and the three status colours, as RGB triples. */
const INK: [number, number, number] = [23, 18, 16];
const MUTED: [number, number, number] = [116, 107, 104];
const MINT: [number, number, number] = [43, 99, 71];
const AMBER: [number, number, number] = [116, 87, 15];
const CORAL: [number, number, number] = [140, 56, 40];
const RULE: [number, number, number] = [231, 226, 223];

type Doc = import("jspdf").jsPDF;

/**
 * A tiny layout cursor.
 *
 * jsPDF has no concept of flow, so page breaks and vertical rhythm have to be
 * tracked by hand. Wrapping that here keeps the report-building code below
 * readable instead of threading a `y` variable through every call.
 */
class Layout {
  private y = MARGIN.top;

  constructor(private doc: Doc) {}

  /** Make room for `height` points, starting a new page if needed. */
  private reserve(height: number): number {
    if (this.y + height > PAGE.height - MARGIN.bottom) {
      this.doc.addPage();
      this.y = MARGIN.top;
    }
    const top = this.y;
    this.y += height;
    return top;
  }

  gap(points: number): void {
    this.y += points;
  }

  rule(): void {
    const top = this.reserve(12);
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN.x, top + 5, PAGE.width - MARGIN.x, top + 5);
  }

  /** A small uppercase label, matching the report's eyebrow style. */
  eyebrow(text: string): void {
    const top = this.reserve(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...MUTED);
    this.doc.text(text.toUpperCase(), MARGIN.x, top + 9, { charSpace: 1.1 });
  }

  heading(text: string, size = 15): void {
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    const lineHeight = size * 1.25;
    const top = this.reserve(lines.length * lineHeight + 4);
    this.doc.setFont("times", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...INK);
    this.doc.text(lines, MARGIN.x, top + size);
  }

  body(
    text: string,
    options: { colour?: [number, number, number]; size?: number; indent?: number } = {},
  ): void {
    const size = options.size ?? 9.5;
    const indent = options.indent ?? 0;
    const width = CONTENT_WIDTH - indent;
    const lines = this.doc.splitTextToSize(text, width) as string[];
    const lineHeight = size * 1.5;
    const top = this.reserve(lines.length * lineHeight + 2);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(options.colour ?? INK));
    this.doc.text(lines, MARGIN.x + indent, top + size);
  }

  /** A checklist or requirement row: glyph, label, then a detail line. */
  row(
    glyph: string,
    glyphColour: [number, number, number],
    label: string,
    detail: string,
    trailing?: string,
  ): void {
    const labelLines = this.doc.splitTextToSize(
      label,
      CONTENT_WIDTH - 20 - (trailing ? 46 : 0),
    ) as string[];
    const detailLines = this.doc.splitTextToSize(detail, CONTENT_WIDTH - 20) as string[];
    const height = labelLines.length * 13 + detailLines.length * 12 + 8;
    const top = this.reserve(height);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...glyphColour);
    this.doc.text(glyph, MARGIN.x, top + 9);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...INK);
    this.doc.text(labelLines, MARGIN.x + 16, top + 9);

    if (trailing) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(...MUTED);
      this.doc.text(trailing, PAGE.width - MARGIN.x, top + 9, { align: "right" });
    }

    if (detailLines.length > 0) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(...MUTED);
      this.doc.text(detailLines, MARGIN.x + 16, top + 9 + labelLines.length * 13);
    }
  }

  /** A big number with a caption, used for the two scores. */
  score(value: string, caption: string, x: number): void {
    const top = this.y;
    this.doc.setFont("times", "normal");
    this.doc.setFontSize(34);
    this.doc.setTextColor(...INK);
    this.doc.text(value, x, top + 28);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...MUTED);
    this.doc.text(caption, x, top + 42);
  }

  endScores(): void {
    this.y += 56;
  }
}

function statusColour(status: "matched" | "partial" | "missing") {
  if (status === "matched") return MINT;
  if (status === "partial") return AMBER;
  return CORAL;
}

function statusGlyph(status: "matched" | "partial" | "missing") {
  if (status === "matched") return "+";
  if (status === "partial") return "~";
  return "-";
}

/**
 * Build the report PDF.
 *
 * Glyphs are plain ASCII rather than ✓ / ◐ / ✗ because jsPDF's built-in fonts
 * are WinAnsi-encoded and would render those as mojibake; embedding a Unicode
 * font would add hundreds of kilobytes to every download for three symbols.
 */
export async function buildReportPdf(report: Report): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const t = clientMessages().pdf;

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setProperties({
    title: fmt(t.title, { job: report.jobTitle }),
    creator: "Callback",
    subject: t.subject,
  });

  const layout = new Layout(doc);

  /* ---------------- header ---------------- */

  layout.eyebrow(t.eyebrow);
  layout.heading(report.jobTitle || t.untitled, 20);
  layout.body(
    [report.company, formatDate(report.createdAt)].filter(Boolean).join(" · "),
    { colour: MUTED },
  );
  layout.rule();

  /* ---------------- scores ---------------- */

  const hasMatch = report.match.requirements.length > 0;

  layout.eyebrow(t.scores);
  layout.score(String(report.ats.score), t.atsScore, MARGIN.x);
  if (hasMatch) {
    layout.score(`${report.match.score}%`, t.jobMatch, MARGIN.x + 150);
  }
  if (report.previousScores) {
    layout.score(
      `${report.previousScores.ats} → ${report.ats.score}`,
      t.after,
      MARGIN.x + 300,
    );
  }
  layout.endScores();

  if (report.match.verdict) {
    layout.eyebrow(t.verdict);
    layout.body(report.match.verdict, { size: 10.5 });
    layout.gap(6);
  }

  layout.rule();

  /* ---------------- ATS ---------------- */

  layout.eyebrow(fmt(t.atsHeading, { score: report.ats.score }));
  layout.gap(2);

  for (const item of report.ats.items) {
    const colour =
      item.state === "pass" ? MINT : item.state === "warn" ? AMBER : CORAL;
    const glyph = item.state === "pass" ? "+" : item.state === "warn" ? "!" : "-";
    layout.row(
      glyph,
      colour,
      item.label,
      item.state === "pass" ? item.detail : `${item.detail} ${t.fix} ${item.fix}`,
      `${item.earned}/${item.weight}`,
    );
  }

  /* ---------------- match ---------------- */

  if (hasMatch) {
    layout.rule();
    layout.eyebrow(fmt(t.matchHeading, { score: report.match.score }));
    layout.gap(2);

    const byId = new Map(report.match.matches.map((m) => [m.requirementId, m]));

    for (const requirement of report.match.requirements) {
      const match = byId.get(requirement.id);
      const status = match?.status ?? "missing";
      const detail = match?.evidence
        ? fmt(t.yourCv, { quote: match.evidence })
        : match?.note || t.notAddressed;

      layout.row(
        statusGlyph(status),
        statusColour(status),
        requirement.text,
        detail,
        requirement.type === "must" ? t.mustHave : t.niceToHave,
      );
    }

    if (report.match.keywords.missing.length > 0) {
      layout.gap(6);
      layout.eyebrow(t.keywordsMissing);
      layout.body(report.match.keywords.missing.join(" · "), { colour: MUTED });
    }

    if (report.match.redFlags.length > 0) {
      layout.gap(6);
      layout.eyebrow(t.watchOut);
      for (const flag of report.match.redFlags) {
        layout.body(`- ${flag.text}`, { colour: CORAL, indent: 4 });
      }
    }
  }

  /* ---------------- suggestions ---------------- */

  const accepted = report.suggestions.filter(
    (suggestion) => report.decisions[suggestion.id] === "accepted",
  );

  if (accepted.length > 0) {
    layout.rule();
    layout.eyebrow(fmt(t.accepted, { count: accepted.length }));
    layout.gap(2);

    for (const suggestion of accepted) {
      layout.body(suggestion.title, { size: 9.5 });
      if (suggestion.before) {
        layout.body(`${t.before} ${suggestion.before}`, { colour: CORAL, indent: 12, size: 8.5 });
      }
      if (suggestion.after) {
        layout.body(`${t.afterLabel} ${suggestion.after}`, { colour: MINT, indent: 12, size: 8.5 });
      }
      layout.gap(4);
    }
  }

  /* ---------------- footer on every page ---------------- */

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      t.footer,
      MARGIN.x,
      PAGE.height - 30,
    );
    doc.text(`${page} / ${pageCount}`, PAGE.width - MARGIN.x, PAGE.height - 30, {
      align: "right",
    });
  }

  return doc.output("blob");
}

export function reportPdfFilename(report: Report): string {
  const slug = (report.jobTitle || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `callback-report-${slug || "report"}.pdf`;
}
