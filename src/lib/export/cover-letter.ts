/**
 * Exporting the cover letter as a PDF or .docx.
 *
 * The letter reuses the CV template's header, type and accent, so the two
 * documents read as a matching set when they are sent together. The letter
 * itself is a single column of paragraphs: greeting, body, sign-off.
 */

import type { CvLayout } from "@/lib/analysis/cv-layout";
import { letterParagraphs } from "@/lib/analysis/cover-letter";
import { resolveCvStyle, type CvStyle } from "@/lib/cv-templates";
import { docxBlocks, docxDocument } from "@/lib/export/cv-docx";
import { CvPdfWriter, createCvDoc } from "@/lib/export/cv-pdf";

export type LetterExport = {
  /** The CV's layout, for the matching header. */
  layout: CvLayout;
  /** The letter as plain text, paragraphs separated by blank lines. */
  text: string;
  style: CvStyle;
  /** Printed under the header, e.g. "4 November 2026". */
  date: string;
  jobTitle?: string;
};

function title(input: LetterExport): string {
  const who = input.layout.name?.text;
  const role = input.jobTitle ? ` — ${input.jobTitle}` : "";
  return who ? `${who} — Cover letter${role}` : `Cover letter${role}`;
}

export async function buildCoverLetterPdf(input: LetterExport): Promise<Blob> {
  const { doc, embedded } = await createCvDoc(title(input));
  const writer = new CvPdfWriter(doc, input.style, embedded);
  const s = resolveCvStyle(input.style);

  writer.header(
    input.layout.name?.text,
    input.layout.headline?.text,
    input.layout.contact.map((line) => line.text),
  );
  writer.gap(s.space.section);
  writer.small(input.date);
  writer.gap(s.space.section * 0.6);

  for (const paragraph of letterParagraphs(input.text)) {
    writer.paragraph(paragraph, { gap: s.size.body * 0.9 });
  }
  return doc.output("blob");
}

export async function buildCoverLetterDocx(input: LetterExport): Promise<Blob> {
  const docx = await import("docx");
  const s = resolveCvStyle(input.style);
  const blocks = docxBlocks(docx, s);

  const children = blocks.header(
    input.layout.name?.text,
    input.layout.headline?.text,
    input.layout.contact.map((line) => line.text),
  );
  children.push(blocks.small(input.date, s.space.section * 0.6));
  for (const paragraph of letterParagraphs(input.text)) {
    const lines = paragraph.split("\n");
    lines.forEach((line, index) => {
      // Lines inside one block (sign-off, then name) sit tight together.
      children.push(blocks.paragraph(line, index === lines.length - 1 ? s.size.body * 0.9 : 0));
    });
  }

  const document = docxDocument(docx, s, title(input), "Cover letter exported from Callback", children);
  return docx.Packer.toBlob(document);
}
