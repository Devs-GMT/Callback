/**
 * DOCX text extraction, in the browser.
 *
 * PRD section 3 asks for mammoth.js, and specifically for tables and images to
 * be detected. Both are ATS formatting risks: a table's cells get read in an
 * unpredictable order, and text inside an image is not read at all.
 *
 * mammoth's `extractRawText` would give us the words with less work, but it
 * throws away exactly the structure we need — list markers, headings, and any
 * sign that a table was there. So we convert to HTML, inspect the HTML for the
 * risky constructs, and then flatten it to text ourselves.
 */

import { htmlToText } from "@/lib/html-text";
import type { ExtractionWarning } from "@/lib/types";
import { clientMessages } from "@/i18n/lib";

export type DocxExtraction = {
  text: string;
  warnings: ExtractionWarning[];
};

export class DocxUnreadableError extends Error {
  constructor(message = clientMessages().extract.docxUnreadable) {
    super(message);
    this.name = "DocxUnreadableError";
  }
}

type MammothModule = typeof import("mammoth");

let mammothPromise: Promise<MammothModule> | null = null;

/** Loaded on demand so it stays out of the initial bundle. */
async function loadMammoth(): Promise<MammothModule> {
  if (!mammothPromise) mammothPromise = import("mammoth");
  return mammothPromise;
}

/**
 * Count how many of a page's words sit inside table cells.
 *
 * A CV with its whole layout built from a table is a much bigger problem than
 * one with a single small skills grid, and the warning should reflect that, so
 * the share is measured rather than merely detected.
 */
function tableTextShare(html: string): number {
  const tableBlocks = html.match(/<table\b[\s\S]*?<\/table>/gi);
  if (!tableBlocks) return 0;

  const inTables = tableBlocks
    .map((block) => htmlToText(block).replace(/\s/g, "").length)
    .reduce((sum, length) => sum + length, 0);

  const total = htmlToText(html).replace(/\s/g, "").length;
  return total === 0 ? 0 : inTables / total;
}

export async function extractDocx(file: Blob): Promise<DocxExtraction> {
  const mammoth = await loadMammoth();
  const arrayBuffer = await file.arrayBuffer();

  let html: string;
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        // Keep images in the HTML as empty <img> tags so they can be counted,
        // without carrying megabytes of base64 through the conversion.
        convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
      },
    );
    html = result.value;
  } catch {
    throw new DocxUnreadableError(
      clientMessages().extract.docxUnreadable,
    );
  }

  const warnings = new Set<ExtractionWarning>();

  // A table anywhere is worth flagging, because the ATS reading order risk
  // applies to whatever is inside it.
  if (tableTextShare(html) > 0.05) warnings.add("tables");
  if (/<img\b/i.test(html)) warnings.add("images");

  const text = htmlToText(html);

  if (text.replace(/\s/g, "").length < 200) {
    warnings.add("sparse-text");
  }

  return { text, warnings: [...warnings] };
}
