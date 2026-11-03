/**
 * Response schemas for the two AI endpoints.
 *
 * Each schema exists twice on purpose:
 *
 *  - as JSON Schema, handed to Gemini's `response_format` so the decoder is
 *    constrained while it generates;
 *  - as a Zod schema, used to validate and repair what comes back.
 *
 * The Zod layer is deliberately forgiving. A single odd field should degrade
 * one row of the report, not throw away an analysis the user waited 30 seconds
 * for, so most fields have a fallback rather than a hard failure.
 */

import { z } from "zod";
import type { AnalyzeResponse, CoverLetterResponse, PivotResponse } from "@/lib/types";

const REQUIREMENT_TYPES = ["must", "nice"] as const;
const REQUIREMENT_CATEGORIES = [
  "skill",
  "experience",
  "education",
  "language",
  "certificate",
  "soft",
] as const;
const MATCH_STATUSES = ["matched", "partial", "missing"] as const;
const SENIORITY_LEVELS = [
  "unknown",
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
] as const;
const RED_FLAG_KINDS = [
  "certificate",
  "location",
  "language",
  "clearance",
  "other",
] as const;
const SUGGESTION_KINDS = [
  "rewrite",
  "keywords",
  "summary",
  "moveup",
  "cut",
  "gap",
] as const;

/* -------------------------------------------------------------------------- */
/* JSON Schema for the provider                                               */
/* -------------------------------------------------------------------------- */

// No `maxItems` and no `enum` here. Gemini compiles the schema into a decoding
// state machine; array bounds and enums inside arrays of objects multiply its
// states, and past a limit it rejects the schema outright ("too many states
// for serving") — for long CVs this happened often. Allowed values go in the
// field's `description` instead, which costs no states, and the Zod layer
// below maps anything unexpected to a safe fallback. The prompts state the
// counts, and `capped` enforces them.

/** A string limited to `values` by instruction rather than by the decoder. */
const oneOf = (values: readonly string[]) => ({
  type: "string",
  description: `Exactly one of: ${values.join(", ")}.`,
});

export const ANALYZE_JSON_SCHEMA = {
  type: "object",
  properties: {
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          type: oneOf(REQUIREMENT_TYPES),
          category: oneOf(REQUIREMENT_CATEGORIES),
        },
        required: ["id", "text", "type", "category"],
      },
    },
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirementId: { type: "string" },
          status: oneOf(MATCH_STATUSES),
          evidence: { type: "string" },
          note: { type: "string" },
        },
        required: ["requirementId", "status", "evidence", "note"],
      },
    },
    keywords: { type: "array", items: { type: "string" } },
    redFlags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: oneOf(RED_FLAG_KINDS),
          text: { type: "string" },
        },
        required: ["kind", "text"],
      },
    },
    seniority: {
      type: "object",
      properties: {
        jobLevel: oneOf(SENIORITY_LEVELS),
        cvLevel: oneOf(SENIORITY_LEVELS),
        note: { type: "string" },
      },
      required: ["jobLevel", "cvLevel", "note"],
    },
    bulletQuality: {
      type: "object",
      properties: {
        score: { type: "integer" },
        detail: { type: "string" },
        weakBullets: { type: "array", items: { type: "string" } },
      },
      required: ["score", "detail", "weakBullets"],
    },
    looksLikeCv: { type: "boolean" },
    looksLikeJob: { type: "boolean" },
    verdict: { type: "string" },
  },
  required: [
    "requirements",
    "matches",
    "keywords",
    "redFlags",
    "seniority",
    "bulletQuality",
    "looksLikeCv",
    "looksLikeJob",
    "verdict",
  ],
} as const satisfies Record<string, unknown>;

export const PIVOT_JSON_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          kind: oneOf(SUGGESTION_KINDS),
          title: { type: "string" },
          before: { type: "string" },
          after: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
          needsUserConfirmation: { type: "boolean" },
        },
        required: ["id", "kind", "title", "rationale"],
      },
    },
  },
  required: ["suggestions"],
} as const satisfies Record<string, unknown>;

export const COVER_LETTER_JSON_SCHEMA = {
  type: "object",
  properties: {
    greeting: { type: "string" },
    opening: { type: "string" },
    body: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          evidence: { type: "array", items: { type: "string" } },
        },
        required: ["text", "evidence"],
      },
    },
    closing: { type: "string" },
    signOff: { type: "string" },
  },
  required: ["greeting", "opening", "body", "closing", "signOff"],
} as const satisfies Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* Zod validation and repair                                                  */
/* -------------------------------------------------------------------------- */

/** Caps per array, applied after decoding instead of in the JSON Schema. */
const MAX = {
  requirements: 24,
  keywords: 30,
  redFlags: 6,
  weakBullets: 8,
  suggestions: 12,
  suggestionKeywords: 8,
} as const;

/** An array that falls back to empty and keeps at most `max` items. */
const capped = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z
    .array(item)
    .catch([])
    .transform((list) => list.slice(0, max));

/** One of `values`, forgiving case and stray spaces now the decoder no longer enforces it. */
const choice = <const T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) =>
  z
    .preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), z.enum(values))
    .catch(fallback);

const text = (fallback = "") =>
  z
    .string()
    .transform((value) => value.trim())
    .catch(fallback);

const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).transform((v) => v.trim()),
  type: choice(REQUIREMENT_TYPES, "nice"),
  category: choice(REQUIREMENT_CATEGORIES, "skill"),
});

const matchSchema = z.object({
  requirementId: z.string().min(1),
  status: choice(MATCH_STATUSES, "missing"),
  evidence: text(),
  note: text(),
});

const redFlagSchema = z.object({
  kind: choice(RED_FLAG_KINDS, "other"),
  text: z.string().min(1).transform((v) => v.trim()),
});

export const analyzeResponseSchema = z.object({
  requirements: capped(requirementSchema, MAX.requirements),
  matches: capped(matchSchema, MAX.requirements),
  keywords: z
    .array(z.string())
    .catch([])
    .transform((list) =>
      list
        .map((k) => k.trim())
        .filter((k) => k.length > 0 && k.length <= 48)
        .slice(0, MAX.keywords),
    ),
  redFlags: capped(redFlagSchema, MAX.redFlags),
  seniority: z
    .object({
      jobLevel: choice(SENIORITY_LEVELS, "unknown"),
      cvLevel: choice(SENIORITY_LEVELS, "unknown"),
      note: text(),
    })
    .catch({ jobLevel: "unknown", cvLevel: "unknown", note: "" }),
  bulletQuality: z
    .object({
      // The bullets check is worth 15 points, so anything outside that range
      // is the model misreading the brief rather than a real signal.
      score: z.coerce.number().catch(0),
      detail: text(),
      weakBullets: capped(z.string(), MAX.weakBullets),
    })
    .catch({ score: 0, detail: "", weakBullets: [] }),
  looksLikeCv: z.coerce.boolean().catch(true),
  looksLikeJob: z.coerce.boolean().catch(true),
  verdict: text(),
});

const suggestionSchema = z.object({
  id: z.string().min(1),
  kind: choice(SUGGESTION_KINDS, "gap"),
  title: z.string().min(1).transform((v) => v.trim()),
  before: text().optional(),
  after: text().optional(),
  keywords: capped(z.string(), MAX.suggestionKeywords).optional(),
  rationale: text(),
  needsUserConfirmation: z.coerce.boolean().catch(false).optional(),
});

export const pivotResponseSchema = z.object({
  suggestions: capped(suggestionSchema, MAX.suggestions),
});

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Validate the analyse response and drop rows that cannot be trusted.
 *
 * Requirements without a matching id, and matches pointing at a requirement
 * that was not returned, are removed here rather than being handled by every
 * consumer downstream.
 */
export function parseAnalyzeResponse(raw: unknown): AnalyzeResponse {
  const parsed = analyzeResponseSchema.parse(raw);

  // De-duplicate requirement ids; a repeated id would make the match lookup
  // ambiguous and double-count that requirement in the score.
  const seen = new Set<string>();
  const requirements = parsed.requirements.filter((requirement) => {
    if (seen.has(requirement.id)) return false;
    seen.add(requirement.id);
    return true;
  });

  const validIds = new Set(requirements.map((r) => r.id));
  const matches = parsed.matches.filter((m) => validIds.has(m.requirementId));

  return {
    requirements,
    matches,
    keywords: parsed.keywords,
    redFlags: parsed.redFlags,
    seniority: parsed.seniority,
    bulletQuality: {
      score: Math.max(0, Math.min(15, Math.round(parsed.bulletQuality.score))),
      detail: parsed.bulletQuality.detail,
      weakBullets: parsed.bulletQuality.weakBullets
        .map((b) => b.trim())
        .filter((b) => b.length > 0),
    },
    looksLikeCv: parsed.looksLikeCv,
    looksLikeJob: parsed.looksLikeJob,
    verdict: parsed.verdict,
  };
}

/**
 * Validate the pivot response.
 *
 * A `rewrite` or `cut` suggestion without a `before` is dropped: PRD section 3
 * requires every rewrite to link back to the original bullet, and a rewrite we
 * cannot anchor would be unapplyable in the improved-CV editor.
 */
export function parsePivotResponse(raw: unknown): PivotResponse {
  const parsed = pivotResponseSchema.parse(raw);

  const suggestions = parsed.suggestions.filter((suggestion) => {
    if (suggestion.kind === "rewrite") {
      return Boolean(suggestion.before) && Boolean(suggestion.after);
    }
    if (suggestion.kind === "cut") return Boolean(suggestion.before);
    if (suggestion.kind === "summary") return Boolean(suggestion.after);
    return true;
  });

  return { suggestions };
}

const coverLetterSchema = z.object({
  greeting: text("Dear Hiring Manager,"),
  opening: text(),
  body: capped(
    z.object({
      text: text(),
      evidence: capped(z.string(), 6),
    }),
    4,
  ),
  closing: text(),
  signOff: text("Kind regards,"),
});

/**
 * Validate the letter's shape. Evidence is checked against the CV separately,
 * in `verifyCoverLetter`, because that needs the CV text.
 */
export function parseCoverLetterResponse(raw: unknown): CoverLetterResponse {
  const parsed = coverLetterSchema.parse(raw);
  return {
    ...parsed,
    greeting: parsed.greeting || "Dear Hiring Manager,",
    signOff: parsed.signOff || "Kind regards,",
  };
}
