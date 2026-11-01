/**
 * PDF text extraction, in the browser.
 *
 * PRD section 3 asks for two things beyond "get the text out": keep the
 * reading order, and detect two-column layouts from the x-positions so the ATS
 * formatting check can flag them.
 *
 * Both matter for the same reason. A recruiter's ATS reads a two-column CV by
 * x-position and interleaves the columns, turning "Skills: SQL" and "Acme
 * Corp" into one nonsense line. If we extracted text naively we would either
 * reproduce that mangling (and score the CV on text the user never wrote) or
 * silently tidy it up (and miss the problem the user needs to know about). So
 * we do both: detect the columns, read each one in order, and raise a warning.
 *
 * Runs entirely client-side — the CV never reaches a server during extraction.
 */

import type { ExtractionWarning } from "@/lib/types";

export type PdfExtraction = {
  text: string;
  pageCount: number;
  warnings: ExtractionWarning[];
};

export class PdfTooManyPagesError extends Error {
  pageCount: number;
  constructor(pageCount: number, limit: number) {
    super(`This PDF has ${pageCount} pages. The limit is ${limit}.`);
    this.name = "PdfTooManyPagesError";
    this.pageCount = pageCount;
  }
}

export class PdfUnreadableError extends Error {
  constructor(message = "We couldn't read this PDF.") {
    super(message);
    this.name = "PdfUnreadableError";
  }
}

/* -------------------------------------------------------------------------- */
/* Internal geometry types                                                    */
/* -------------------------------------------------------------------------- */

type Piece = {
  text: string;
  /** Left edge, in PDF user space. */
  x: number;
  /** Baseline, measured from the top of the page so it sorts naturally. */
  y: number;
  width: number;
  height: number;
};

/** Items on one visual line, left to right. */
type Line = {
  y: number;
  pieces: Piece[];
};

/* -------------------------------------------------------------------------- */
/* Loading pdf.js                                                             */
/* -------------------------------------------------------------------------- */

type PdfJsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJsModule> | null = null;

/**
 * Load pdf.js on demand.
 *
 * It is a large dependency that only matters once a user picks a PDF, so it is
 * imported lazily and kept out of the initial bundle. The worker is served
 * from /public (see scripts/copy-pdf-worker.mjs) because resolving it through
 * the bundler is unreliable across dev and production builds.
 */
async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((module) => {
      module.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
      return module;
    });
  }
  return pdfjsPromise;
}

/* -------------------------------------------------------------------------- */
/* Line assembly                                                              */
/* -------------------------------------------------------------------------- */

/** Group pieces that share a baseline into lines, top to bottom. */
function toLines(pieces: Piece[]): Line[] {
  if (pieces.length === 0) return [];

  // A tolerance proportional to the text size copes with sub-pixel baseline
  // drift and with superscripts, without merging separate lines.
  const medianHeight =
    [...pieces].sort((a, b) => a.height - b.height)[Math.floor(pieces.length / 2)]
      ?.height ?? 10;
  const tolerance = Math.max(2, medianHeight * 0.5);

  const sorted = [...pieces].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: Line[] = [];

  for (const piece of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(piece.y - last.y) <= tolerance) {
      last.pieces.push(piece);
      // Track the line's baseline as a running average so a tall piece does
      // not drag subsequent comparisons out of range.
      last.y = (last.y * (last.pieces.length - 1) + piece.y) / last.pieces.length;
    } else {
      lines.push({ y: piece.y, pieces: [piece] });
    }
  }

  for (const line of lines) line.pieces.sort((a, b) => a.x - b.x);
  return lines;
}

/** Join one line's pieces, inserting a space only where there is a real gap. */
function renderLine(line: Line): string {
  let out = "";
  let previous: Piece | null = null;

  for (const piece of line.pieces) {
    if (previous) {
      const gap = piece.x - (previous.x + previous.width);
      // pdf.js splits a word across items when the font or kerning changes, so
      // only a gap near a space's width is a real word break.
      const spaceWidth = previous.height * 0.25;
      if (gap > spaceWidth) out += " ";
    }
    out += piece.text;
    previous = piece;
  }

  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/* -------------------------------------------------------------------------- */
/* Column detection                                                           */
/* -------------------------------------------------------------------------- */

type ColumnSplit = {
  isTwoColumn: boolean;
  /** x coordinate of the gutter, when there is one. */
  boundary: number;
};

/**
 * Decide whether a page is laid out in two columns.
 *
 * The test is the vertical gutter: scan candidate split points across the
 * middle of the page and look for one that almost no text crosses, with
 * meaningful text on both sides. A single-column CV with an indented block
 * fails this test because its full-width lines cross every candidate.
 */
function detectColumns(lines: Line[], pageWidth: number): ColumnSplit {
  const none: ColumnSplit = { isTwoColumn: false, boundary: 0 };

  // Short pages do not carry enough evidence either way.
  if (lines.length < 8) return none;

  const pieces = lines.flatMap((line) => line.pieces);
  if (pieces.length < 15) return none;

  let best: { boundary: number; score: number } | null = null;

  // Only the middle of the page is a plausible gutter for a two-column CV.
  for (let fraction = 0.35; fraction <= 0.65; fraction += 0.01) {
    const boundary = pageWidth * fraction;

    let crossing = 0;
    let left = 0;
    let right = 0;

    for (const piece of pieces) {
      const start = piece.x;
      const end = piece.x + piece.width;
      if (start < boundary && end > boundary) crossing += 1;
      else if (end <= boundary) left += 1;
      else right += 1;
    }

    // Both sides must hold real content, and almost nothing may straddle.
    const total = pieces.length;
    const crossingShare = crossing / total;
    const minorityShare = Math.min(left, right) / total;

    if (crossingShare > 0.04 || minorityShare < 0.2) continue;

    // Prefer the cleanest gutter with the most even split.
    const score = minorityShare - crossingShare * 2;
    if (!best || score > best.score) best = { boundary, score };
  }

  return best ? { isTwoColumn: true, boundary: best.boundary } : none;
}

/**
 * Read a two-column page in the order a human would: the whole left column,
 * then the whole right column.
 */
function renderTwoColumns(lines: Line[], boundary: number): string {
  const leftLines: Line[] = [];
  const rightLines: Line[] = [];

  for (const line of lines) {
    const leftPieces = line.pieces.filter((p) => p.x + p.width <= boundary);
    const rightPieces = line.pieces.filter((p) => p.x + p.width > boundary);
    if (leftPieces.length > 0) leftLines.push({ y: line.y, pieces: leftPieces });
    if (rightPieces.length > 0) rightLines.push({ y: line.y, pieces: rightPieces });
  }

  const render = (group: Line[]) =>
    group
      .map(renderLine)
      .filter((line) => line.length > 0)
      .join("\n");

  return [render(leftLines), render(rightLines)]
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function renderSingleColumn(lines: Line[]): string {
  const rendered: string[] = [];
  let previousY: number | null = null;
  let previousHeight = 10;

  for (const line of lines) {
    const text = renderLine(line);
    if (text.length === 0) continue;

    // A gap much larger than one line height is a paragraph or section break,
    // which keeps section headings detectable downstream.
    if (previousY !== null && line.y - previousY > previousHeight * 1.8) {
      rendered.push("");
    }

    rendered.push(text);
    previousY = line.y;
    previousHeight =
      line.pieces.reduce((sum, p) => sum + p.height, 0) / line.pieces.length || 10;
  }

  return rendered.join("\n");
}

/* -------------------------------------------------------------------------- */
/* Header and footer detection                                                */
/* -------------------------------------------------------------------------- */

/**
 * Flag contact details sitting in the top or bottom margin.
 *
 * Many ATS parsers drop running headers and footers entirely, so an email
 * address that only appears there is invisible to them. PRD section 3 counts
 * this against the formatting check.
 */
function hasContactInMargin(
  lines: Line[],
  pageHeight: number,
  pageCount: number,
): boolean {
  // On a one-page CV, text at the top is the name block, not a running header.
  if (pageCount < 2) return false;

  const marginTop = pageHeight * 0.08;
  const marginBottom = pageHeight * 0.92;
  const contact = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}|\+?\d[\d\s().-]{7,}\d/u;

  return lines.some(
    (line) =>
      (line.y <= marginTop || line.y >= marginBottom) && contact.test(renderLine(line)),
  );
}

/* -------------------------------------------------------------------------- */

export type ExtractPdfOptions = {
  maxPages: number;
};

/**
 * Extract text from a PDF file.
 *
 * @throws {PdfTooManyPagesError} when the page count exceeds the limit.
 * @throws {PdfUnreadableError} when the file is not a readable PDF.
 */
export async function extractPdf(
  file: Blob,
  options: ExtractPdfOptions,
): Promise<PdfExtraction> {
  const pdfjs = await loadPdfJs();

  const buffer = await file.arrayBuffer();

  // The loading task owns the worker, and it is the task — not the document
  // proxy — that exposes `destroy()`, so it has to stay in scope for cleanup.
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // A CV never needs to pull anything else over the network.
    disableAutoFetch: true,
    disableStream: true,
  });

  let document: Awaited<typeof loadingTask.promise>;
  try {
    document = await loadingTask.promise;
  } catch {
    await loadingTask.destroy().catch(() => undefined);
    throw new PdfUnreadableError(
      "We couldn't open this PDF. It may be password-protected or damaged.",
    );
  }

  const pageCount = document.numPages;

  if (pageCount > options.maxPages) {
    await loadingTask.destroy();
    throw new PdfTooManyPagesError(pageCount, options.maxPages);
  }

  const warnings = new Set<ExtractionWarning>();
  const pageTexts: string[] = [];
  let totalCharacters = 0;
  let twoColumnPages = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const pieces: Piece[] = [];

      for (const item of content.items) {
        if (!("str" in item)) continue;
        const text = item.str;
        if (text.trim().length === 0) continue;

        // transform is [a, b, c, d, e, f]; e and f are the translation, and
        // `height` comes from the vertical scale.
        const [, , , , x, yFromBottom] = item.transform as number[];
        pieces.push({
          text,
          x,
          // Flip to a top-down axis so sorting matches reading order.
          y: viewport.height - yFromBottom,
          width: item.width ?? 0,
          height: item.height || 10,
        });
      }

      const lines = toLines(pieces);
      const split = detectColumns(lines, viewport.width);

      if (split.isTwoColumn) twoColumnPages += 1;

      if (hasContactInMargin(lines, viewport.height, pageCount)) {
        warnings.add("header-footer");
      }

      const pageText = split.isTwoColumn
        ? renderTwoColumns(lines, split.boundary)
        : renderSingleColumn(lines);

      totalCharacters += pageText.replace(/\s/g, "").length;
      pageTexts.push(pageText);

      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  // One odd page does not make a two-column CV; a majority does.
  if (twoColumnPages > 0 && twoColumnPages >= Math.ceil(pageCount / 2)) {
    warnings.add("two-columns");
  }

  // A text layer this thin means the content is in images. PRD section 11
  // treats an image-only PDF as its own error state, and the ATS "readable"
  // check turns this into a fail.
  if (totalCharacters < 200 * pageCount) {
    warnings.add("sparse-text");
  }

  const text = pageTexts
    .join("\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, pageCount, warnings: [...warnings] };
}
