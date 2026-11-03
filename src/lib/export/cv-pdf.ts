/**
 * Exporting the improved CV as a PDF, in the chosen template.
 *
 * Written with jsPDF's text API, like the report PDF, so the file holds real
 * text an ATS can parse rather than a screenshot. The fonts (Inter and
 * Newsreader, both OFL) are embedded so the download looks the same as the
 * preview on any machine; they are fetched from /fonts/cv only when someone
 * actually exports, and the built-in Helvetica and Times stand in if that
 * fetch fails, so a download never breaks over a font.
 *
 * `CvPdfWriter` is exported because the cover letter uses the same header and
 * type, so the two documents match when sent together.
 */

import type { CvLayout, CvLine } from "@/lib/analysis/cv-layout";
import {
  CV_HAIRLINE,
  CV_INK,
  CV_MUTED,
  CV_PAGE,
  hexToRgb,
  resolveCvStyle,
  type CvStyle,
  type FontFamily,
  type ResolvedCvStyle,
} from "@/lib/cv-templates";

type Doc = import("jspdf").jsPDF;
type Weight = "normal" | "bold" | "italic";

const FONT_FILES: Record<FontFamily, Record<Weight, string>> = {
  sans: { normal: "Inter-Regular.ttf", bold: "Inter-SemiBold.ttf", italic: "Inter-Italic.ttf" },
  serif: {
    normal: "Newsreader-Regular.ttf",
    bold: "Newsreader-SemiBold.ttf",
    italic: "Newsreader-Italic.ttf",
  },
};

const EMBEDDED: Record<FontFamily, string> = { sans: "CvSans", serif: "CvSerif" };
const BUILT_IN: Record<FontFamily, string> = { sans: "helvetica", serif: "times" };

/** Base64 font files, fetched once per page load. */
let fontData: Promise<Record<string, string> | null> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Chunked: spreading a 400 KB array into one call overflows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function loadFontData(): Promise<Record<string, string> | null> {
  fontData ??= (async () => {
    try {
      const files = Object.values(FONT_FILES).flatMap((weights) => Object.values(weights));
      const entries = await Promise.all(
        files.map(async (file) => {
          const response = await fetch(`/fonts/cv/${file}`);
          if (!response.ok) throw new Error(`font ${file}: ${response.status}`);
          return [file, toBase64(await response.arrayBuffer())] as const;
        }),
      );
      return Object.fromEntries(entries);
    } catch {
      fontData = null; // Let the next export try again.
      return null;
    }
  })();
  return fontData;
}

/** Create an A4 document with the CV fonts registered. */
export async function createCvDoc(title: string): Promise<{ doc: Doc; embedded: boolean }> {
  const [{ jsPDF }, fonts] = await Promise.all([import("jspdf"), loadFontData()]);
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setProperties({ title, creator: "Callback" });

  if (fonts) {
    for (const family of Object.keys(FONT_FILES) as FontFamily[]) {
      for (const [weight, file] of Object.entries(FONT_FILES[family])) {
        doc.addFileToVFS(file, fonts[file]);
        doc.addFont(file, EMBEDDED[family], weight);
      }
    }
  }
  return { doc, embedded: fonts !== null };
}

/**
 * A flow layout over jsPDF: a cursor that moves down the page and starts a
 * new one when the next block will not fit.
 */
export class CvPdfWriter {
  private y: number;
  private readonly width: number;
  private readonly s: ResolvedCvStyle;
  /** True until the first block of a section, which takes no top gap. */
  private sectionStart = true;

  constructor(
    private readonly doc: Doc,
    style: CvStyle,
    private readonly embedded: boolean,
  ) {
    this.s = resolveCvStyle(style);
    this.y = this.s.margin.y;
    this.width = CV_PAGE.width - this.s.margin.x * 2;
    doc.setLineHeightFactor(this.s.space.line);
  }

  private get x(): number {
    return this.s.margin.x;
  }

  private font(family: FontFamily, weight: Weight, size: number, colour: string): void {
    this.doc.setFont(this.embedded ? EMBEDDED[family] : BUILT_IN[family], weight);
    this.doc.setFontSize(size);
    this.doc.setTextColor(...hexToRgb(colour));
  }

  private lineHeight(size: number): number {
    return size * this.s.space.line;
  }

  /**
   * Make room for `height` points and return the top of that room. `keep` is
   * extra space that must also fit, so a heading is never left alone at the
   * foot of a page without the first line under it.
   */
  private reserve(height: number, keep = 0): number {
    if (this.y + height + keep > CV_PAGE.height - this.s.margin.y && this.y > this.s.margin.y) {
      this.doc.addPage();
      this.y = this.s.margin.y;
    }
    const top = this.y;
    this.y += height;
    return top;
  }

  private wrap(text: string, width: number): string[] {
    return this.doc.splitTextToSize(text, width) as string[];
  }

  private draw(lines: string | string[], x: number, top: number, align: "left" | "right" | "center" = "left") {
    this.doc.text(lines, x, top, { baseline: "top", align });
  }

  gap(points: number): void {
    this.y += points;
  }

  /** Name, headline, then contact lines, left or centred per template. */
  header(name: string | undefined, headline: string | undefined, lines: string[]): void {
    const s = this.s;
    const centre = s.header === "center";
    const x = centre ? CV_PAGE.width / 2 : this.x;
    const align = centre ? "center" : "left";

    if (name) {
      this.font(s.font.name, s.nameBold ? "bold" : "normal", s.size.name, s.nameInAccent ? s.accent : CV_INK);
      const wrapped = this.wrap(name, this.width);
      const height = wrapped.length * s.size.name * 1.12;
      this.doc.setLineHeightFactor(1.12);
      this.draw(wrapped, x, this.reserve(height), align);
      this.doc.setLineHeightFactor(s.space.line);
      this.gap(s.size.name * 0.28);
    }

    if (headline) {
      const size = s.size.body + 1.5;
      this.font(s.font.body, "bold", size, s.accent);
      const wrapped = this.wrap(headline, this.width);
      this.draw(wrapped, x, this.reserve(wrapped.length * this.lineHeight(size)), align);
      this.gap(3);
    }

    for (const line of lines) {
      this.font(s.font.body, "normal", s.size.small, CV_MUTED);
      const wrapped = this.wrap(line, this.width);
      this.draw(wrapped, x, this.reserve(wrapped.length * this.lineHeight(s.size.small)), align);
    }

    // A hairline closes the header off from the first section.
    this.gap(s.space.section * 0.55);
    this.doc.setDrawColor(...hexToRgb(CV_HAIRLINE));
    this.doc.setLineWidth(0.6);
    this.doc.line(this.x, this.y, this.x + this.width, this.y);
    this.gap(s.space.section * 0.15);
  }

  heading(text: string): void {
    const s = this.s;
    this.gap(s.space.section);
    const size = s.size.heading;
    const ruleGap = s.heading === "accent" ? 0 : 4.5;
    const top = this.reserve(size * 1.2 + ruleGap + s.space.afterHeading, this.lineHeight(s.size.body) * 2);

    const colour = s.heading === "rule" ? CV_INK : s.accent;
    this.font(s.font.heading, "bold", size, colour);
    this.doc.text(text, this.x, top, { baseline: "top", charSpace: s.headingTracking * size });

    const ruleY = top + size * 1.2 + 2;
    if (s.heading === "rule") {
      this.doc.setDrawColor(...hexToRgb(s.accent));
      this.doc.setLineWidth(0.7);
      this.doc.line(this.x, ruleY, this.x + this.width, ruleY);
    } else if (s.heading === "accent-rule") {
      this.doc.setFillColor(...hexToRgb(s.accent));
      this.doc.rect(this.x, ruleY, 22, 1.3, "F");
    }
    this.sectionStart = true;
  }

  private beforeBlock(points: number): void {
    if (!this.sectionStart) this.gap(points);
    this.sectionStart = false;
  }

  /** Role and organisation on the left, dates pushed to the right margin. */
  entry(line: CvLine): void {
    const s = this.s;
    this.beforeBlock(s.space.entry);
    const size = s.size.body;
    const lh = this.lineHeight(size);
    const parts = line.parts;

    if (!parts) {
      this.font(s.font.body, "bold", size, CV_INK);
      const wrapped = this.wrap(line.text, this.width);
      this.draw(wrapped, this.x, this.reserve(wrapped.length * lh, lh));
      return;
    }

    let datesWidth = 0;
    if (parts.dates) {
      this.font(s.font.body, "normal", s.size.small, CV_MUTED);
      datesWidth = this.doc.getTextWidth(parts.dates) + 12;
    }
    const room = this.width - datesWidth;

    this.font(s.font.body, "bold", size, CV_INK);
    const titleWidth = this.doc.getTextWidth(parts.title);
    const org = parts.org ? `, ${parts.org}` : "";
    this.font(s.font.body, "normal", size, CV_INK);
    const orgWidth = org ? this.doc.getTextWidth(org) : 0;

    if (titleWidth + orgWidth <= room) {
      const top = this.reserve(lh, lh);
      this.font(s.font.body, "bold", size, CV_INK);
      this.draw(parts.title, this.x, top);
      if (org) {
        this.font(s.font.body, "normal", size, CV_INK);
        this.draw(org, this.x + titleWidth, top);
      }
      this.drawDates(parts.dates, top, size);
      return;
    }

    // Too long for one line: title first (with the dates), organisation under.
    this.font(s.font.body, "bold", size, CV_INK);
    const titleLines = this.wrap(parts.title, room);
    const orgLines = parts.org ? this.wrap(parts.org, this.width) : [];
    const top = this.reserve((titleLines.length + orgLines.length) * lh, lh);
    this.draw(titleLines, this.x, top);
    this.drawDates(parts.dates, top, size);
    if (orgLines.length > 0) {
      this.font(s.font.body, "normal", size, CV_INK);
      this.draw(orgLines, this.x, top + titleLines.length * lh);
    }
  }

  private drawDates(dates: string | undefined, top: number, bodySize: number): void {
    if (!dates) return;
    this.font(this.s.font.body, "normal", this.s.size.small, CV_MUTED);
    // Nudge down so the smaller dates share the role's baseline.
    this.draw(dates, this.x + this.width, top + (bodySize - this.s.size.small) * 0.8, "right");
  }

  bullet(text: string): void {
    const s = this.s;
    this.beforeBlock(s.space.item);
    const indent = s.size.body * 1.15;
    this.font(s.font.body, "normal", s.size.body, CV_INK);
    const wrapped = this.wrap(text, this.width - indent);
    const top = this.reserve(wrapped.length * this.lineHeight(s.size.body));
    this.draw("•", this.x + 1.5, top);
    this.draw(wrapped, this.x + indent, top);
  }

  paragraph(text: string, options: { gap?: number; bold?: boolean } = {}): void {
    const s = this.s;
    this.beforeBlock(options.gap ?? s.space.item);
    this.font(s.font.body, options.bold ? "bold" : "normal", s.size.body, CV_INK);
    const wrapped = this.wrap(text, this.width);
    this.draw(wrapped, this.x, this.reserve(wrapped.length * this.lineHeight(s.size.body)));
  }

  /** A small muted line, such as the date on a letter. */
  small(text: string, options: { gap?: number } = {}): void {
    const s = this.s;
    this.beforeBlock(options.gap ?? s.space.item);
    this.font(s.font.body, "normal", s.size.small, CV_MUTED);
    const wrapped = this.wrap(text, this.width);
    this.draw(wrapped, this.x, this.reserve(wrapped.length * this.lineHeight(s.size.small)));
  }

  /** Lines of a CV section, in order. */
  lines(lines: CvLine[]): void {
    for (const line of lines) {
      if (line.kind === "gap") this.gap(this.s.space.entry * 0.5);
      else if (line.kind === "entry") this.entry(line);
      else if (line.kind === "bullet") this.bullet(line.text);
      else this.paragraph(line.text);
    }
  }
}

export async function buildCvPdf(
  layout: CvLayout,
  style: CvStyle,
  options: { title?: string } = {},
): Promise<Blob> {
  const title = layout.name ? `${layout.name.text} — CV` : (options.title ?? "CV");
  const { doc, embedded } = await createCvDoc(title);
  const writer = new CvPdfWriter(doc, style, embedded);

  writer.header(
    layout.name?.text,
    layout.headline?.text,
    layout.contact.map((line) => line.text),
  );
  for (const section of layout.sections) {
    writer.heading(section.heading);
    writer.lines(section.lines);
  }
  return doc.output("blob");
}
