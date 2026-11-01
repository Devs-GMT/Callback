/**
 * Turning a fetched page into readable text.
 *
 * PRD section 3 asks for "readability-style main text". A full DOM parser plus
 * Readability would be the obvious reach, but this runs in a serverless
 * function on every link paste, and the pages that matter here are a narrow
 * set: job posts on Greenhouse, Lever, Workable, Ashby and company career
 * pages, plus published Google Docs, public Notion pages and personal sites.
 *
 * So the approach is: prefer structured data when the page offers it
 * (schema.org JobPosting, which every major ATS emits), and otherwise score
 * the page's block elements by text density and keep the densest run. That
 * handles the long tail without shipping a parser.
 */

import { decodeEntities, htmlToText } from "@/lib/html-text";

export type ExtractedPage = {
  text: string;
  title?: string;
  company?: string;
  /** True when the result came from schema.org data rather than heuristics. */
  structured: boolean;
};

/* -------------------------------------------------------------------------- */
/* Structured data                                                            */
/* -------------------------------------------------------------------------- */

type JsonLdNode = Record<string, unknown>;

function collectJsonLd(html: string): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  const pattern =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(decodeEntities(raw));
    } catch {
      continue;
    }
    // A block may hold one node, an array, or an @graph wrapper.
    const queue: unknown[] = [parsed];
    while (queue.length > 0) {
      const item = queue.pop();
      if (Array.isArray(item)) {
        queue.push(...item);
      } else if (item && typeof item === "object") {
        const node = item as JsonLdNode;
        nodes.push(node);
        if (Array.isArray(node["@graph"])) queue.push(...(node["@graph"] as unknown[]));
      }
    }
  }

  return nodes;
}

function nodeType(node: JsonLdNode): string[] {
  const type = node["@type"];
  if (typeof type === "string") return [type];
  if (Array.isArray(type)) return type.filter((t): t is string => typeof t === "string");
  return [];
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return undefined;
}

/**
 * Pull a job post out of schema.org data.
 *
 * Greenhouse, Lever, Workable and Ashby all emit JobPosting, so this is the
 * accurate path for the sites the PRD names and it also gives us the job title
 * and company for the optional fields in step 2.
 */
function fromJobPosting(nodes: JsonLdNode[]): ExtractedPage | null {
  const posting = nodes.find((node) => nodeType(node).includes("JobPosting"));
  if (!posting) return null;

  const description = asString(posting.description);
  if (!description) return null;

  const hiring = posting.hiringOrganization;
  const company =
    hiring && typeof hiring === "object"
      ? asString((hiring as JsonLdNode).name)
      : asString(hiring);

  const body = htmlToText(description);
  const title = asString(posting.title);

  // Fold the structured extras the description usually omits back into the
  // text, so the model sees the employment type and location too.
  const extras: string[] = [];
  const employmentType = posting.employmentType;
  if (typeof employmentType === "string") extras.push(`Employment type: ${employmentType}`);
  else if (Array.isArray(employmentType)) {
    const list = employmentType.filter((v): v is string => typeof v === "string");
    if (list.length > 0) extras.push(`Employment type: ${list.join(", ")}`);
  }

  const location = posting.jobLocation;
  const locationNode = Array.isArray(location) ? location[0] : location;
  if (locationNode && typeof locationNode === "object") {
    const address = (locationNode as JsonLdNode).address;
    if (address && typeof address === "object") {
      const a = address as JsonLdNode;
      const pieces = [
        asString(a.addressLocality),
        asString(a.addressRegion),
        asString(a.addressCountry),
      ].filter(Boolean);
      if (pieces.length > 0) extras.push(`Location: ${pieces.join(", ")}`);
    }
  }

  const header = [title, company].filter(Boolean).join(" · ");
  const text = [header, extras.join("\n"), body]
    .filter((part) => part && part.length > 0)
    .join("\n\n");

  return { text, title, company, structured: true };
}

/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

function metaContent(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`,
      "i",
    );
    const tag = html.match(pattern)?.[0];
    if (!tag) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    const value = content ? decodeEntities(content).trim() : "";
    if (value.length > 0) return value;
  }
  return undefined;
}

function documentTitle(html: string): string | undefined {
  const raw = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!raw) return undefined;
  const title = decodeEntities(raw).replace(/\s+/g, " ").trim();
  return title.length > 0 ? title : undefined;
}

/**
 * Split "Senior Analyst at Acme" or "Data Analyst | Acme" into its parts, which
 * is how most career pages title a job post.
 */
function splitTitleAndCompany(title: string): { title: string; company?: string } {
  const atMatch = title.match(/^(.*?)\s+(?:at|@)\s+(.+?)$/i);
  if (atMatch) return { title: atMatch[1].trim(), company: atMatch[2].trim() };

  const parts = title.split(/\s+[|–—·-]\s+/);
  if (parts.length >= 2) {
    return {
      title: parts[0].trim(),
      company: parts[parts.length - 1].trim(),
    };
  }
  return { title: title.trim() };
}

/* -------------------------------------------------------------------------- */
/* Density-based main text                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Keep the densest run of text on the page.
 *
 * Navigation, cookie banners and footers are short lines; the actual job post
 * or CV body is a long run of substantial lines. Scoring each line and keeping
 * the best window is crude but holds up well across unknown templates, and it
 * degrades to "return everything" rather than returning nothing.
 */
function mainTextByDensity(text: string): string {
  const lines = text.split("\n");
  if (lines.length < 12) return text;

  const scores = lines.map((line) => {
    const length = line.length;
    if (length === 0) return 0;
    // Short lines, and lines that are mostly punctuation or navigation words,
    // score low. Sentences and bullets score high.
    const words = line.split(/\s+/).length;
    const isNav =
      /^(home|about|careers?|jobs?|blog|contact|login|sign in|sign up|menu|search|cookies?|privacy|terms|accept|share|apply now|back|next|previous)$/i.test(
        line.trim(),
      );
    if (isNav) return -2;
    if (length < 25 && words <= 3) return -1;
    return Math.min(10, Math.ceil(length / 40)) + (line.startsWith("•") ? 2 : 0);
  });

  // Maximum-sum contiguous window (Kadane), which finds the body in one pass.
  let bestStart = 0;
  let bestEnd = lines.length - 1;
  let bestSum = -Infinity;
  let currentStart = 0;
  let currentSum = 0;

  for (let i = 0; i < scores.length; i += 1) {
    if (currentSum <= 0) {
      currentStart = i;
      currentSum = scores[i];
    } else {
      currentSum += scores[i];
    }
    if (currentSum > bestSum) {
      bestSum = currentSum;
      bestStart = currentStart;
      bestEnd = i;
    }
  }

  const body = lines.slice(bestStart, bestEnd + 1).join("\n").trim();

  // If the heuristic threw away almost everything, it misread the page.
  return body.length < text.length * 0.25 ? text : body;
}

/* -------------------------------------------------------------------------- */

/** Extract readable text, and the title and company when the page offers them. */
export function extractPage(html: string, contentType: string): ExtractedPage {
  if (contentType.includes("text/plain")) {
    return { text: html.trim(), structured: false };
  }

  if (contentType.includes("application/json")) {
    // Some career APIs return the post as JSON; stringify and let the density
    // pass find the prose rather than failing outright.
    try {
      const parsed = JSON.parse(html);
      const flat = JSON.stringify(parsed, null, 1)
        .replace(/[{}[\]",]/g, " ")
        .replace(/[ \t]+/g, " ");
      return { text: mainTextByDensity(flat).trim(), structured: false };
    } catch {
      return { text: html.trim(), structured: false };
    }
  }

  const nodes = collectJsonLd(html);
  const posting = fromJobPosting(nodes);
  if (posting && posting.text.length >= 300) return posting;

  // Prefer the page's own main/article region when it marks one.
  const region =
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ??
    html;

  const text = mainTextByDensity(htmlToText(region));

  const ogTitle = metaContent(html, ["og:title", "twitter:title"]);
  const rawTitle = ogTitle ?? documentTitle(html);
  const siteName = metaContent(html, ["og:site_name", "application-name"]);

  let title: string | undefined;
  let company: string | undefined = siteName;

  if (rawTitle) {
    const split = splitTitleAndCompany(rawTitle);
    title = split.title;
    company = company ?? split.company;
  }

  return { text, title, company, structured: false };
}
