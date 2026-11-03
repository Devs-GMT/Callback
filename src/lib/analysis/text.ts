/**
 * Plain-text helpers shared by the ATS rule engine and the keyword matcher.
 *
 * Everything here is deterministic and dependency-free so the same code can
 * run in the browser (for the instant rule-based checks) and inside a route
 * handler (for the AI-assisted pass).
 */

/** Normalise whitespace without losing line structure. */
export function normaliseText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    // Collapse runs of blank lines to at most one, which keeps section
    // detection stable across PDF and DOCX extraction.
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function wordCount(text: string): number {
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return matches ? matches.length : 0;
}

/** Lines that read like a bullet, with the marker stripped. */
export function extractBullets(text: string): string[] {
  const bulletMarker = /^\s*(?:[-–—•·*▪◦‣]|\d{1,2}[.)])\s+/;
  return text
    .split("\n")
    .filter((line) => bulletMarker.test(line))
    .map((line) => line.replace(bulletMarker, "").trim())
    .filter((line) => line.length >= 12);
}

/**
 * Lines that look like a section heading: short, no sentence-ending
 * punctuation, and either all caps or title case.
 */
export function extractHeadingLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0 || line.length > 48) return false;
      if (/[.!?,;]$/.test(line)) return false;
      if (wordCount(line) > 5) return false;
      const letters = line.replace(/[^\p{L}]/gu, "");
      if (letters.length < 3) return false;
      const isUpper = letters === letters.toUpperCase();
      const isTitle = /^[\p{Lu}]/u.test(line);
      return isUpper || isTitle;
    });
}

/* -------------------------------------------------------------------------- */
/* Section detection                                                          */
/* -------------------------------------------------------------------------- */

export type SectionKey = "experience" | "education" | "skills" | "summary";

const SECTION_PATTERNS: Record<SectionKey, RegExp> = {
  experience:
    /\b(work\s+experience|professional\s+experience|experience|employment(\s+history)?|work\s+history|career\s+history|relevant\s+experience|pengalaman(\s+kerja)?|riwayat\s+pekerjaan)\b/i,
  education:
    /\b(education|academic(\s+background)?|qualifications|educational\s+background|pendidikan|riwayat\s+pendidikan)\b/i,
  skills:
    /\b(skills|technical\s+skills|core\s+competenc(?:y|ies)|competencies|technologies|tech\s+stack|key\s+skills|keahlian|keterampilan|kemampuan)\b/i,
  summary:
    /\b(summary|professional\s+summary|profile|about\s+me|objective|career\s+objective|personal\s+statement|ringkasan|profil|tentang\s+saya)\b/i,
};

/**
 * Which standard section a heading counts as for the ATS check, or undefined
 * for an extra section such as Projects or Awards. Experience is tested first
 * so "Professional Experience" is never read as a profile.
 */
export function sectionKeyOf(heading: string): SectionKey | undefined {
  const order: SectionKey[] = ["experience", "education", "skills", "summary"];
  return order.find((key) => SECTION_PATTERNS[key].test(heading));
}

/**
 * Which standard CV sections are present. A heading match is strong evidence;
 * a match anywhere in the body is accepted as a fallback because some PDFs
 * lose heading line breaks entirely.
 */
export function detectSections(text: string): Record<SectionKey, boolean> {
  const headings = extractHeadingLines(text);
  const headingBlob = headings.join("\n");
  const keys = Object.keys(SECTION_PATTERNS) as SectionKey[];
  const found = {} as Record<SectionKey, boolean>;

  for (const key of keys) {
    const pattern = SECTION_PATTERNS[key];
    found[key] = pattern.test(headingBlob) || pattern.test(text);
  }
  return found;
}

/* -------------------------------------------------------------------------- */
/* Contact details                                                            */
/* -------------------------------------------------------------------------- */

export type ContactFindings = {
  email: boolean;
  phone: boolean;
  location: boolean;
  web: boolean;
};

/**
 * A short list of city/country hints. A CV without a recognisable place name
 * still passes on an explicit "Location:"/"Based in" label, so this list does
 * not need to be exhaustive to be useful.
 */
const LOCATION_HINT =
  /\b(location|based\s+in|address|city|remote|hybrid|on-?site)\b|\b(jakarta|bandung|surabaya|singapore|kuala\s+lumpur|london|manchester|berlin|munich|amsterdam|paris|madrid|barcelona|dublin|lisbon|warsaw|prague|stockholm|copenhagen|oslo|helsinki|zurich|vienna|new\s+york|san\s+francisco|seattle|austin|boston|chicago|toronto|vancouver|sydney|melbourne|auckland|tokyo|seoul|bangkok|manila|hanoi|ho\s+chi\s+minh|dubai|bengaluru|bangalore|mumbai|delhi|hyderabad|karachi|lahore|lagos|nairobi|cairo|cape\s+town|johannesburg|sao\s+paulo|são\s+paulo|buenos\s+aires|mexico\s+city|bogota|bogotá|santiago|lima)\b/i;

export function detectContact(text: string): ContactFindings {
  return {
    email: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/u.test(text),
    // Loose on purpose: international formats vary wildly, and a false
    // negative here costs the user points they deserve.
    phone: /(?:\+?\d[\d\s().-]{7,}\d)/.test(text),
    location: LOCATION_HINT.test(text),
    web: /\b(linkedin\.com\/in\/|github\.com\/|gitlab\.com\/|behance\.net\/|dribbble\.com\/|medium\.com\/@|[\p{L}\p{N}-]+\.(?:com|dev|io|me|net|org|co|design|portfolio)\b)/iu.test(
      text,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

export type DateFormat =
  | "month-year"
  | "numeric-slash"
  | "iso"
  | "year-only"
  | "season-year";

const MONTH =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const DATE_PATTERNS: Array<{ format: DateFormat; pattern: RegExp }> = [
  { format: "month-year", pattern: new RegExp(`\\b(?:${MONTH})\\.?\\s+\\d{4}\\b`, "gi") },
  { format: "season-year", pattern: /\b(?:spring|summer|autumn|fall|winter)\s+\d{4}\b/gi },
  { format: "iso", pattern: /\b\d{4}-(?:0[1-9]|1[0-2])(?:-\d{2})?\b/g },
  { format: "numeric-slash", pattern: /\b(?:0?[1-9]|1[0-2])\/\d{2,4}\b/g },
  { format: "year-only", pattern: /\b(?:19|20)\d{2}\b/g },
];

export type DateFindings = {
  /** How many date tokens were found per format. */
  counts: Record<DateFormat, number>;
  total: number;
  /** The format holding the largest share of tokens. */
  dominant: DateFormat | null;
  /** Share held by the dominant format, 0 to 1. */
  dominantShare: number;
  /** True when at least one range separator is present. */
  hasRanges: boolean;
};

export function detectDates(text: string): DateFindings {
  const counts = {
    "month-year": 0,
    "numeric-slash": 0,
    iso: 0,
    "year-only": 0,
    "season-year": 0,
  } as Record<DateFormat, number>;

  // Consume matches in specificity order so "Jan 2020" is not also counted as
  // a bare year, which would make every CV look format-inconsistent.
  let remaining = text;
  for (const { format, pattern } of DATE_PATTERNS) {
    const matches = remaining.match(pattern);
    if (matches) {
      counts[format] = matches.length;
      remaining = remaining.replace(pattern, " ");
    }
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  let dominant: DateFormat | null = null;
  let best = 0;
  for (const [format, n] of Object.entries(counts) as Array<[DateFormat, number]>) {
    if (n > best) {
      best = n;
      dominant = format;
    }
  }

  return {
    counts,
    total,
    dominant,
    dominantShare: total === 0 ? 0 : best / total,
    hasRanges: /\d{4}\s*(?:-|–|—|to|until|through)\s*(?:\d{4}|present|current|now)/i.test(
      text,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Bullet quality                                                             */
/* -------------------------------------------------------------------------- */

/** Strong openers for an achievement bullet. */
export const ACTION_VERBS = [
  "accelerated", "achieved", "acquired", "adapted", "administered", "advised",
  "analysed", "analyzed", "architected", "audited", "authored", "automated",
  "built", "championed", "closed", "coached", "collaborated", "compiled",
  "completed", "conducted", "configured", "consolidated", "constructed",
  "consulted", "converted", "coordinated", "created", "cut", "decreased",
  "defined", "delivered", "deployed", "designed", "detected", "developed",
  "devised", "diagnosed", "directed", "documented", "doubled", "drove",
  "earned", "edited", "eliminated", "enabled", "engineered", "enhanced",
  "established", "evaluated", "examined", "exceeded", "executed", "expanded",
  "expedited", "facilitated", "finalised", "finalized", "forecast", "formed",
  "founded", "generated", "grew", "guided", "halved", "handled", "headed",
  "identified", "implemented", "improved", "increased", "influenced",
  "initiated", "innovated", "inspected", "installed", "instituted",
  "integrated", "introduced", "investigated", "launched", "led", "leveraged",
  "maintained", "managed", "mapped", "maximised", "maximized", "measured",
  "mentored", "migrated", "minimised", "minimized", "modelled", "modeled",
  "modernised", "modernized", "monitored", "negotiated", "operated",
  "optimised", "optimized", "orchestrated", "organised", "organized",
  "overhauled", "oversaw", "owned", "partnered", "performed", "pioneered",
  "planned", "prepared", "presented", "prioritised", "prioritized",
  "produced", "programmed", "project-managed", "promoted", "proposed",
  "prototyped", "provided", "published", "qualified", "quantified", "raised",
  "ran", "rebuilt", "recommended", "reconciled", "recovered", "recruited",
  "redesigned", "reduced", "refactored", "refined", "released", "remodelled",
  "reorganised", "reorganized", "repaired", "replaced", "reported",
  "researched", "resolved", "restored", "restructured", "revamped",
  "reviewed", "revised", "saved", "scaled", "scheduled", "secured",
  "selected", "shaped", "shipped", "simplified", "sourced", "spearheaded",
  "specified", "standardised", "standardized", "steered", "streamlined",
  "strengthened", "structured", "supervised", "supported", "surveyed",
  "sustained", "synthesised", "synthesized", "targeted", "taught", "tested",
  "tracked", "trained", "transformed", "translated", "tripled",
  "troubleshot", "unified", "upgraded", "validated", "verified", "won",
  "wrote",
] as const;

const ACTION_VERB_SET = new Set<string>(ACTION_VERBS);

/** Weak openers that signal a duty list rather than an achievement. */
const WEAK_OPENERS =
  /^(responsible\s+for|duties\s+included|tasked\s+with|involved\s+in|helped\s+(?:with|to)|worked\s+on|assisted\s+(?:with|in)|participated\s+in|in\s+charge\s+of)\b/i;

export function startsWithActionVerb(bullet: string): boolean {
  const first = bullet.trim().split(/[\s,.;:]+/)[0]?.toLowerCase() ?? "";
  if (ACTION_VERB_SET.has(first)) return true;
  // Accept regular past-tense verbs the list misses, but not weak openers.
  return /^[a-z]{4,}ed$/.test(first) && !WEAK_OPENERS.test(bullet);
}

export function hasWeakOpener(bullet: string): boolean {
  return WEAK_OPENERS.test(bullet.trim());
}

/** A number, percentage, money amount or multiple that quantifies a result. */
export function hasQuantifiedResult(bullet: string): boolean {
  return /(\d+\s*%|\b\d+(?:[.,]\d+)?\s*(?:k|m|bn|b)\b|[$€£¥]\s?\d|\b\d+(?:[.,]\d{3})+\b|\b\d+\s*(?:x|times|users|customers|clients|teams|people|hours|days|weeks|months|projects|tickets|requests|queries|reports|dashboards|markets|countries|stores|accounts|leads|deals|articles|features|releases|bugs|tests|models|datasets|records|rows|apis|endpoints|services)\b|\b\d{2,}\b)/i.test(
    bullet,
  );
}

export type BulletStats = {
  total: number;
  withActionVerb: number;
  withNumbers: number;
  weak: string[];
};

export function analyseBullets(text: string): BulletStats {
  const bullets = extractBullets(text);
  const weak: string[] = [];
  let withActionVerb = 0;
  let withNumbers = 0;

  for (const bullet of bullets) {
    const strongOpener = startsWithActionVerb(bullet);
    const quantified = hasQuantifiedResult(bullet);
    if (strongOpener) withActionVerb += 1;
    if (quantified) withNumbers += 1;
    if (!strongOpener || !quantified) weak.push(bullet);
  }

  return { total: bullets.length, withActionVerb, withNumbers, weak };
}

/* -------------------------------------------------------------------------- */
/* Seniority                                                                  */
/* -------------------------------------------------------------------------- */

import type { Seniority } from "@/lib/types";

const SENIORITY_ORDER: Seniority[] = [
  "unknown",
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
];

export function seniorityRank(level: Seniority): number {
  return SENIORITY_ORDER.indexOf(level);
}

/** Distance between two levels, ignoring `unknown` on either side. */
export function seniorityGap(a: Seniority, b: Seniority): number {
  if (a === "unknown" || b === "unknown") return 0;
  return Math.abs(seniorityRank(a) - seniorityRank(b));
}

export function guessSeniority(text: string): Seniority {
  const t = text.toLowerCase();
  if (/\b(head\s+of|director|vp\b|vice\s+president|principal|staff\s+engineer|lead\b|team\s+lead|tech\s+lead|chief)\b/.test(t))
    return "lead";
  if (/\b(senior|sr\.?|snr\b)\b/.test(t)) return "senior";
  if (/\b(intern|internship|trainee|apprentice|placement\s+student)\b/.test(t))
    return "intern";
  if (/\b(junior|jr\.?|graduate|entry[-\s]level|associate|fresh\s+graduate)\b/.test(t))
    return "junior";
  if (/\b(mid[-\s]level|intermediate|\d\+?\s*years?\s+of\s+experience)\b/.test(t))
    return "mid";
  return "unknown";
}
