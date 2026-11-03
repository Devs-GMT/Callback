/**
 * Exporting the improved CV as a .docx, in the chosen template.
 *
 * PRD section 2 step 4 asks for a "simple ATS-friendly layout". Every template
 * keeps to that: no columns, no tables, no text boxes, no images, no headers
 * and no footers — the five things the ATS formatting check penalises. A
 * single column of styled paragraphs is the most machine-readable thing Word
 * can hold, so the export scores full marks on formatting if re-imported.
 *
 * Templates map onto Word with what Word does natively: paragraph borders for
 * divider rules, a right-aligned tab stop for dates, real list bullets. Fonts
 * are ones every copy of Word has (Calibri, Georgia) rather than embedded
 * files, because an ATS reads the text, not the typeface, and an embedded
 * font only makes the file larger.
 */

import { orgPrefix, type CvLayout, type CvLine } from "@/lib/analysis/cv-layout";
import { contactRuns, parseInline, stripInline, type InlineRun } from "@/lib/analysis/inline";
import {
  CV_HAIRLINE,
  headerRule,
  headlineColour,
  type HeaderLine,
  CV_INK,
  CV_MUTED,
  CV_PAGE,
  resolveCvStyle,
  type CvStyle,
  type FontFamily,
  type ResolvedCvStyle,
} from "@/lib/cv-templates";

export type CvDocxOptions = {
  /** Used for the document title when the CV has no name line. */
  title?: string;
};

const WORD_FONT: Record<FontFamily, string> = { sans: "Calibri", serif: "Georgia" };

/**
 * Calibri sets noticeably smaller than Inter at the same nominal size, so
 * sans text is scaled up to keep the page looking like the preview.
 */
const WORD_SCALE: Record<FontFamily, number> = { sans: 1.08, serif: 1 };

type Docx = typeof import("docx");
type Paragraph = InstanceType<Docx["Paragraph"]>;

/** Points to half-points (font sizes) and twentieths (spacing, margins). */
const half = (pt: number) => Math.round(pt * 2);
const twip = (pt: number) => Math.round(pt * 20);
const hex = (colour: string) => colour.replace("#", "");

/** Paragraph builders shared by the CV and the cover letter. */
export function docxBlocks(docx: Docx, s: ResolvedCvStyle) {
  const { Paragraph, TextRun, ExternalHyperlink, AlignmentType, BorderStyle, TabStopType, HeadingLevel } = docx;
  const contentWidth = twip(CV_PAGE.width - s.margin.x * 2);
  const size = (family: FontFamily, pt: number) => half(pt * WORD_SCALE[family]);
  const line = Math.round(240 * s.space.line * 0.92);
  const align = s.header === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  const run = (text: string, family: FontFamily, pt: number, extra: Record<string, unknown> = {}) =>
    new TextRun({ text, font: WORD_FONT[family], size: size(family, pt), color: hex(CV_INK), ...extra });

  /** Formatted text as Word runs: bold, italics and real hyperlinks. */
  const rich = (text: string | InlineRun[], family: FontFamily, pt: number, extra: Record<string, unknown> = {}) =>
    (typeof text === "string" ? parseInline(text) : text).map((piece) => {
      const textRun = run(piece.text, family, pt, {
        ...extra,
        ...(piece.bold ? { bold: true } : {}),
        ...(piece.italic ? { italics: true } : {}),
      });
      return piece.href ? new ExternalHyperlink({ link: piece.href, children: [textRun] }) : textRun;
    });

  return {
    contentWidth,

    header(name: string | undefined, headline: string | undefined, lines: HeaderLine[]): Paragraph[] {
      type Block = {
        runs: Array<InstanceType<Docx["TextRun"]> | InstanceType<Docx["ExternalHyperlink"]>>;
        after: number;
        title?: boolean;
      };
      const blocks: Block[] = [];
      if (name) {
        blocks.push({
          title: true,
          after: twip(s.size.name * 0.25),
          runs: [
            run(s.caps ? stripInline(name).toUpperCase() : stripInline(name), s.font.name, s.size.name, {
              bold: s.nameBold,
              color: hex(s.nameInAccent ? s.accent : CV_INK),
            }),
          ],
        });
      }
      if (headline) {
        blocks.push({
          after: twip(3),
          runs: [
            ...rich(
              parseInline(headline).map((piece) => (s.caps ? { ...piece, text: piece.text.toUpperCase() } : piece)),
              s.font.body,
              s.size.body + 1.5,
              { bold: true, color: hex(headlineColour(s)) },
            ),
          ],
        });
      }
      for (const line of lines) {
        blocks.push({
          after: 0,
          runs: rich(contactRuns(line.text), s.font.body, s.size.small, { color: hex(line.links ? s.accent : CV_MUTED) }),
        });
      }

      // A hairline under the last header line closes it off from the first
      // section, as in the preview and the PDF, unless headings are ruled.
      const ruled = headerRule(s);
      return blocks.map((block, index) => {
        const last = index === blocks.length - 1;
        return new Paragraph({
          heading: block.title ? HeadingLevel.TITLE : undefined,
          alignment: align,
          spacing: {
            after: last ? twip(s.space.section * (ruled ? 0.15 : 0.2)) : block.after,
            line: block.title ? 240 : line,
          },
          border: last && ruled
            ? {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: hex(CV_HAIRLINE),
                  space: Math.round(s.space.section * 0.55),
                },
              }
            : undefined,
          children: block.runs,
        });
      });
    },

    heading(text: string): Paragraph {
      const colour = s.heading === "rule" ? CV_INK : s.accent;
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        keepNext: true,
        spacing: { before: twip(s.space.section), after: twip(s.space.afterHeading) },
        border:
          s.heading === "accent"
            ? undefined
            : {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: s.heading === "rule" ? 6 : 10,
                  color: hex(s.accent),
                  space: 2,
                },
              },
        children: [
          run(text, s.font.heading, s.size.heading, {
            bold: true,
            color: hex(colour),
            characterSpacing: twip(s.headingTracking * s.size.heading),
          }),
        ],
      });
    },

    entry(item: CvLine, first: boolean): Paragraph {
      const parts = item.parts;
      const children = parts
        ? [
            run(stripInline(parts.title), s.font.body, s.size.body, { bold: true }),
            ...(parts.org ? [run(`${orgPrefix(parts)}${stripInline(parts.org)}`, s.font.body, s.size.body)] : []),
            ...(parts.dates
              ? [run(`\t${parts.dates}`, s.font.body, s.size.small, { color: hex(CV_MUTED) })]
              : []),
          ]
        : [run(stripInline(item.text), s.font.body, s.size.body, { bold: true })];
      return new Paragraph({
        keepNext: true,
        tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
        spacing: { before: first ? 0 : twip(s.space.entry), after: twip(s.space.item), line },
        children,
      });
    },

    bullet(text: string): Paragraph {
      return new Paragraph({
        // A real Word list rather than a literal bullet character, which is
        // what a parser expects to find.
        bullet: { level: 0 },
        spacing: { after: twip(s.space.item), line },
        children: rich(text, s.font.body, s.size.body),
      });
    },

    paragraph(text: string, after = s.space.item, bold = false): Paragraph {
      return new Paragraph({
        spacing: { after: twip(after), line },
        children: rich(text, s.font.body, s.size.body, bold ? { bold } : {}),
      });
    },

    subtitle(text: string): Paragraph {
      return new Paragraph({
        keepNext: true,
        spacing: { after: twip(s.space.item), line },
        children: rich(text, s.font.body, s.size.body, { italics: true, color: hex(CV_MUTED) }),
      });
    },

    small(text: string, after = s.space.item): Paragraph {
      return new Paragraph({
        spacing: { after: twip(after), line },
        children: rich(text, s.font.body, s.size.small, { color: hex(CV_MUTED) }),
      });
    },

    gap(): Paragraph {
      return new Paragraph({ text: "", spacing: { after: twip(s.space.entry * 0.5), line: 120 } });
    },
  };
}

/** A one-section Word document with the template's page margins. */
export function docxDocument(
  docx: Docx,
  s: ResolvedCvStyle,
  title: string,
  description: string,
  children: Paragraph[],
) {
  return new docx.Document({
    creator: "Callback",
    title,
    description,
    styles: {
      default: {
        document: {
          run: { font: WORD_FONT[s.font.body], size: half(s.size.body * WORD_SCALE[s.font.body]) },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: twip(CV_PAGE.width), height: twip(CV_PAGE.height) },
            // Single column, no header or footer defined.
            margin: {
              top: twip(s.margin.y),
              bottom: twip(s.margin.y),
              left: twip(s.margin.x),
              right: twip(s.margin.x),
            },
          },
        },
        children,
      },
    ],
  });
}

/**
 * Build the .docx and hand it back as a Blob.
 *
 * `docx` is imported dynamically: it is a sizeable dependency that only
 * matters the moment someone clicks download, and it has no business in the
 * initial bundle of a page most visitors will only read.
 */
export async function buildCvDocx(
  layout: CvLayout,
  style: CvStyle,
  options: CvDocxOptions = {},
): Promise<Blob> {
  const docx = await import("docx");
  const s = resolveCvStyle(style);
  const blocks = docxBlocks(docx, s);

  const children: Paragraph[] = blocks.header(
    layout.name?.text,
    layout.headline?.text,
    layout.contact,
  );

  for (const section of layout.sections) {
    children.push(blocks.heading(section.heading));
    section.lines.forEach((line, index) => {
      if (line.kind === "gap") children.push(blocks.gap());
      else if (line.kind === "entry") children.push(blocks.entry(line, index === 0));
      else if (line.kind === "bullet") children.push(blocks.bullet(line.text));
      else if (line.kind === "subtitle") children.push(blocks.subtitle(line.text));
      else children.push(blocks.paragraph(line.text));
    });
  }

  const title = layout.name ? `${stripInline(layout.name.text)} — CV` : (options.title ?? "CV");
  const document = docxDocument(docx, s, title, "Improved CV exported from Callback", children);
  return docx.Packer.toBlob(document);
}

/** Trigger a browser download for a generated Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick: revoking synchronously can cancel the download
  // in some browsers before it has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `cv-product-analyst.pdf` */
export function cvFilename(
  jobTitle: string,
  extension: "docx" | "pdf",
  prefix = "cv",
): string {
  const slug = jobTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug.length > 0 ? `${prefix}-${slug}.${extension}` : `${prefix}-improved.${extension}`;
}
