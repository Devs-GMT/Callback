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
 * the user re-imports it, which is the point.
 */

import type { CvSegment } from "@/lib/analysis/apply";

const SUMMARY_OR_SECTION =
  /^(summary|professional\s+summary|profile|about\s+me|objective|career\s+objective|personal\s+statement|experience|work\s+experience|professional\s+experience|employment(\s+history)?|work\s+history|education|skills|technical\s+skills|core\s+competenc(?:y|ies)|competencies|projects|certifications?|languages|interests|references|awards|publications|volunteering)\s*:?\s*$/i;

const BULLET_MARKER = /^\s*(?:[-–—•·*▪◦‣]|\d{1,2}[.)])\s+/;

/** Does this line read as a section heading? */
function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 48) return false;
  if (BULLET_MARKER.test(line)) return false;
  if (SUMMARY_OR_SECTION.test(trimmed)) return true;

  // An all-caps short line with no sentence punctuation is a heading too.
  const letters = trimmed.replace(/[^\p{L}]/gu, "");
  return (
    letters.length >= 3 &&
    letters === letters.toUpperCase() &&
    !/[.!?,;]$/.test(trimmed)
  );
}

export type CvDocxOptions = {
  /** Used for the document title and the first line. */
  name?: string;
};

/**
 * Build the .docx and hand it back as a Blob.
 *
 * `docx` is imported dynamically: it is a sizeable dependency that only
 * matters the moment someone clicks download, and it has no business in the
 * initial bundle of a page most visitors will only read.
 */
export async function buildCvDocx(
  segments: CvSegment[],
  options: CvDocxOptions = {},
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } =
    await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  for (const segment of segments) {
    const line = segment.text;
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      continue;
    }

    if (isHeading(trimmed)) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 220, after: 90 },
          children: [
            new TextRun({
              text: trimmed.replace(/:$/, ""),
              bold: true,
              size: 24, // half-points, so 12pt
              font: "Calibri",
            }),
          ],
        }),
      );
      continue;
    }

    if (BULLET_MARKER.test(line)) {
      children.push(
        new Paragraph({
          // A real Word list rather than a literal bullet character, which is
          // what a parser expects to find.
          bullet: { level: 0 },
          spacing: { after: 70 },
          children: [
            new TextRun({
              text: line.replace(BULLET_MARKER, "").trim(),
              size: 21, // 10.5pt
              font: "Calibri",
            }),
          ],
        }),
      );
      continue;
    }

    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 80 },
        children: [new TextRun({ text: trimmed, size: 21, font: "Calibri" })],
      }),
    );
  }

  const document = new Document({
    creator: "Callback",
    title: options.name ? `${options.name} — CV` : "CV",
    description: "Improved CV exported from Callback",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 21 },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            // Generous single-column margins, no header or footer defined.
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
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
