/**
 * Exporting the improved CV as a .docx.
 *
 * PRD section 2 step 4 asks for a "simple ATS-friendly layout", which is the
 * whole specification: the document deliberately has no columns, no tables, no
 * text boxes, no images, no headers and no footers — the five things the ATS
 * formatting check penalises. A single column of styled paragraphs in a
 * standard font is the most machine-readable thing Word can hold.
 *
 * That also means the exported CV scores full marks on the formatting check if
 * the user re-imports it, which is the point. The structure itself (name,
 * contact line, sections) comes from `layoutCv`.
 */

import type { CvLayout } from "@/lib/analysis/cv-layout";

export type CvDocxOptions = {
  /** Used for the document title. */
  name?: string;
};

const FONT = "Calibri";
/** Sizes are in half-points. */
const SIZE = { name: 32, heading: 22, body: 21, contact: 19 } as const;

/**
 * Build the .docx and hand it back as a Blob.
 *
 * Section dividers are a bottom border on the heading paragraph rather than a
 * drawn line or a table: a paragraph border is plain formatting that every
 * parser skips, while shapes and tables are exactly what trips ATS reading.
 *
 * `docx` is imported dynamically: it is a sizeable dependency that only
 * matters the moment someone clicks download, and it has no business in the
 * initial bundle of a page most visitors will only read.
 */
export async function buildCvDocx(
  layout: CvLayout,
  options: CvDocxOptions = {},
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } =
    await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  if (layout.name) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.LEFT,
        spacing: { after: 60 },
        children: [
          new TextRun({ text: layout.name.text, bold: true, size: SIZE.name, font: FONT, color: "111111" }),
        ],
      }),
    );
  }

  for (const line of layout.contact) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: line.text, size: SIZE.contact, font: FONT, color: "444444" })],
      }),
    );
  }

  for (const section of layout.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 2 },
        },
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            size: SIZE.heading,
            font: FONT,
            color: "111111",
            characterSpacing: 20,
          }),
        ],
      }),
    );

    for (const line of section.lines) {
      if (line.kind === "gap") {
        children.push(new Paragraph({ text: "", spacing: { after: 40 } }));
        continue;
      }
      if (line.kind === "bullet") {
        children.push(
          new Paragraph({
            // A real Word list rather than a literal bullet character, which
            // is what a parser expects to find.
            bullet: { level: 0 },
            spacing: { after: 50 },
            children: [new TextRun({ text: line.text, size: SIZE.body, font: FONT })],
          }),
        );
        continue;
      }
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: line.kind === "entry" ? 60 : 0, after: line.kind === "entry" ? 40 : 70 },
          children: [
            new TextRun({ text: line.text, bold: line.kind === "entry", size: SIZE.body, font: FONT }),
          ],
        }),
      );
    }
  }

  const document = new Document({
    creator: "Callback",
    title: layout.name ? `${layout.name.text} — CV` : options.name ? `CV — ${options.name}` : "CV",
    description: "Improved CV exported from Callback",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE.body },
          paragraph: { spacing: { line: 264 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            // Single column, no header or footer defined.
            margin: { top: 720, bottom: 720, left: 800, right: 800 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
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

/** `alex-taylor-cv-product-analyst.docx` */
export function cvFilename(jobTitle: string): string {
  const slug = jobTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug.length > 0 ? `cv-${slug}.docx` : "cv-improved.docx";
}
