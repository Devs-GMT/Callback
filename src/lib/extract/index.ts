/**
 * The three ways to add a CV and the two ways to add a job (PRD section 2),
 * behind one set of functions that always resolve to a `CvInput` or `JobInput`.
 *
 * Every failure here surfaces as an `ExtractionError` carrying a message
 * already written for the user, because PRD section 11 specifies the wording
 * for each case and the UI should not be re-deriving it.
 */

import { LIMITS } from "@/lib/config";
import { normaliseText } from "@/lib/analysis/text";
import { guessSeniority } from "@/lib/analysis/text";
import { extractDocx, DocxUnreadableError } from "@/lib/extract/docx";
import { extractPdf, PdfTooManyPagesError, PdfUnreadableError } from "@/lib/extract/pdf";
import type { CvInput, ExtractionWarning, JobInput } from "@/lib/types";
import type { ApiError } from "@/lib/types";

export type ExtractionErrorKind =
  | "too-big"
  | "too-many-pages"
  | "wrong-type"
  | "unreadable"
  | "too-short"
  | "too-long"
  | "link-failed"
  | "offline";

export class ExtractionError extends Error {
  kind: ExtractionErrorKind;
  /** Shown verbatim to the user. */
  userMessage: string;
  /** Set when the right next step is to switch to the paste tab. */
  suggestPaste: boolean;

  constructor(
    kind: ExtractionErrorKind,
    userMessage: string,
    options?: { suggestPaste?: boolean },
  ) {
    super(userMessage);
    this.name = "ExtractionError";
    this.kind = kind;
    this.userMessage = userMessage;
    this.suggestPaste = options?.suggestPaste ?? false;
  }
}

/* -------------------------------------------------------------------------- */
/* Files                                                                      */
/* -------------------------------------------------------------------------- */

const PDF_TYPES = ["application/pdf"];
const DOCX_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ACCEPTED_FILE_TYPES = [...PDF_TYPES, ...DOCX_TYPES].join(",") + ",.pdf,.docx";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileKind = "pdf" | "docx";

/**
 * Decide what a file is.
 *
 * The browser's reported MIME type is unreliable — some systems hand back
 * `application/octet-stream` for a perfectly good .docx — so the extension is
 * accepted as evidence too.
 */
function classify(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  if (PDF_TYPES.includes(file.type) || name.endsWith(".pdf")) return "pdf";
  if (DOCX_TYPES.includes(file.type) || name.endsWith(".docx")) return "docx";
  return null;
}

/** Extract CV text from an uploaded PDF or DOCX. */
export async function extractFromFile(file: File): Promise<CvInput> {
  const kind = classify(file);

  if (!kind) {
    const isLegacyDoc = file.name.toLowerCase().endsWith(".doc");
    throw new ExtractionError(
      "wrong-type",
      isLegacyDoc
        ? "We can read .docx but not the older .doc format. Open it in Word and save as .docx, or paste the text."
        : "We can read PDF and Word (.docx) files. Paste the text instead if your CV is in another format.",
      { suggestPaste: true },
    );
  }

  if (file.size > LIMITS.fileBytes) {
    throw new ExtractionError(
      "too-big",
      `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(LIMITS.fileBytes)} — try exporting it again, or paste the text.`,
      { suggestPaste: true },
    );
  }

  if (file.size === 0) {
    throw new ExtractionError("unreadable", "That file is empty.", {
      suggestPaste: true,
    });
  }

  let text: string;
  let pageCount: number | undefined;
  let warnings: ExtractionWarning[];

  try {
    if (kind === "pdf") {
      const result = await extractPdf(file, { maxPages: LIMITS.pdfPages });
      text = result.text;
      pageCount = result.pageCount;
      warnings = result.warnings;
    } else {
      const result = await extractDocx(file);
      text = result.text;
      warnings = result.warnings;
    }
  } catch (error) {
    if (error instanceof PdfTooManyPagesError) {
      throw new ExtractionError(
        "too-many-pages",
        `That PDF has ${error.pageCount} pages. We read up to ${LIMITS.pdfPages} — most CVs should be 1 to 2 anyway.`,
      );
    }
    if (error instanceof PdfUnreadableError || error instanceof DocxUnreadableError) {
      throw new ExtractionError("unreadable", error.message, { suggestPaste: true });
    }
    throw new ExtractionError(
      "unreadable",
      "Something went wrong reading that file. Paste the text instead.",
      { suggestPaste: true },
    );
  }

  const normalised = normaliseText(text);

  // PRD section 11: an image-only PDF gets its own message, and it also counts
  // as an ATS fail, which `computeAts` handles from the `sparse-text` warning.
  if (normalised.replace(/\s/g, "").length < 60) {
    throw new ExtractionError(
      "unreadable",
      kind === "pdf"
        ? "We can't read any text in this PDF — it looks like a scan or an image. Export it as a text-based PDF, or paste the text."
        : "We couldn't find any text in that Word file. Paste the text instead.",
      { suggestPaste: true },
    );
  }

  return {
    text: normalised.slice(0, LIMITS.cvChars),
    source: "upload",
    fileName: file.name,
    pageCount,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Paste                                                                      */
/* -------------------------------------------------------------------------- */

/** Validate pasted CV text. Synchronous, because nothing needs fetching. */
export function extractFromPaste(raw: string): CvInput {
  const text = normaliseText(raw);

  if (text.replace(/\s/g, "").length < LIMITS.cvMinChars) {
    throw new ExtractionError(
      "too-short",
      "That's too short to read as a CV. Paste the whole thing, including your experience and skills.",
    );
  }

  if (text.length > LIMITS.cvChars) {
    throw new ExtractionError(
      "too-long",
      `That's ${text.length.toLocaleString("en")} characters. We read up to ${LIMITS.cvChars.toLocaleString("en")} — trim it to the roles that matter for this job.`,
    );
  }

  // Nothing is known about formatting from pasted text, so no formatting
  // warnings are raised. The ATS formatting check scores full marks, which is
  // correct: plain text is the most ATS-safe form there is.
  return { text, source: "paste", warnings: [] };
}

/* -------------------------------------------------------------------------- */
/* Links                                                                      */
/* -------------------------------------------------------------------------- */

type ExtractUrlPayload = {
  text: string;
  title?: string;
  company?: string;
  finalUrl: string;
  structured: boolean;
};

async function readUrl(url: string): Promise<ExtractUrlPayload> {
  let response: Response;
  try {
    response = await fetch("/api/extract-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new ExtractionError(
      "offline",
      "We couldn't reach the server. Check your connection and try again.",
      { suggestPaste: true },
    );
  }

  if (!response.ok) {
    let message = "We couldn't read this link.";
    try {
      const error = (await response.json()) as ApiError;
      if (error?.error) message = error.error;
    } catch {
      // Keep the default message if the body is not the shape we expect.
    }
    throw new ExtractionError("link-failed", message, { suggestPaste: true });
  }

  return (await response.json()) as ExtractUrlPayload;
}

/**
 * Read a CV from a public URL: a Google Doc published to the web, a public
 * Notion page, or a personal site.
 */
export async function extractFromLink(url: string): Promise<CvInput> {
  const payload = await readUrl(url);
  const text = normaliseText(payload.text);

  if (text.replace(/\s/g, "").length < LIMITS.cvMinChars) {
    throw new ExtractionError(
      "link-failed",
      "We read that page but found very little text. Paste your CV instead.",
      { suggestPaste: true },
    );
  }

  return {
    text: text.slice(0, LIMITS.cvChars),
    source: "link",
    // A page gives us no reliable page count, so the ATS length check falls
    // back to estimating from the word count.
    warnings: [],
  };
}

/** Read a job description from a career page URL. */
export async function fetchJobFromUrl(url: string): Promise<JobInput> {
  const payload = await readUrl(url);
  const text = normaliseText(payload.text);

  if (text.replace(/\s/g, "").length < LIMITS.jobMinChars) {
    throw new ExtractionError(
      "link-failed",
      "That page didn't have a full job description on it. Paste the text instead.",
      { suggestPaste: true },
    );
  }

  return {
    text: text.slice(0, LIMITS.jobChars),
    source: "url",
    title: payload.title?.slice(0, LIMITS.jobTitleChars),
    company: payload.company?.slice(0, 80),
    seniority: guessSeniority(`${payload.title ?? ""}\n${text}`),
    sourceUrl: payload.finalUrl,
  };
}

/** Validate a pasted job description. */
export function jobFromPaste(raw: string, extras?: {
  title?: string;
  company?: string;
}): JobInput {
  const text = normaliseText(raw);

  if (text.replace(/\s/g, "").length < LIMITS.jobMinChars) {
    throw new ExtractionError(
      "too-short",
      "This doesn't look like a full job description. Paste the whole posting, including the requirements.",
    );
  }

  if (text.length > LIMITS.jobChars) {
    throw new ExtractionError(
      "too-long",
      `That's ${text.length.toLocaleString("en")} characters. We read up to ${LIMITS.jobChars.toLocaleString("en")} — paste just the role and requirements.`,
    );
  }

  return {
    text,
    source: "paste",
    title: extras?.title?.trim().slice(0, LIMITS.jobTitleChars) || undefined,
    company: extras?.company?.trim().slice(0, 80) || undefined,
    seniority: guessSeniority(`${extras?.title ?? ""}\n${text}`),
  };
}

/** True when the string is a plausible public http(s) URL. */
export function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

/** Normalise user input into a URL we can send to the server. */
export function coerceUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes("://") ? trimmed : `https://${trimmed}`;
}
