/**
 * The AI provider boundary.
 *
 * Everything the app needs from a model is one call: "given this system
 * instruction and this prompt, return JSON matching this schema". Keeping that
 * behind a single interface means swapping Gemini for another provider is a
 * change to this file only — the prompts, the schemas and the routes are
 * untouched.
 *
 * Gemini is the default because it is the only one of the candidates with a
 * genuine free tier, and because its `response_format` schema is enforced by
 * the decoder rather than merely requested in the prompt.
 *
 * Privacy (PRD section 3): `store: false` on every call, and no CV or job text
 * is ever written to a log here.
 */

import { GoogleGenAI } from "@google/genai";

export type JsonSchema = Record<string, unknown>;

export type GenerateJsonOptions = {
  /** Model id, defaulting per task from the env below. */
  model?: string;
  system: string;
  prompt: string;
  schema: JsonSchema;
  /** Lower is more deterministic. Extraction wants near-zero. */
  temperature?: number;
  /** How long the model reasons before answering. See `THINKING`. */
  thinking?: ThinkingLevel;
  /** Abort the upstream call when the route's budget runs out. */
  signal?: AbortSignal;
};

export class AiNotConfiguredError extends Error {
  constructor() {
    super("The AI provider is not configured.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiRateLimitedError extends Error {
  retryAfter?: number;
  constructor(retryAfter?: number) {
    super("The AI provider is rate limited.");
    this.name = "AiRateLimitedError";
    this.retryAfter = retryAfter;
  }
}

export class AiUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUpstreamError";
  }
}

/**
 * Model choice per task.
 *
 * Both default to the fast model. Pivot used to get the stronger
 * gemini-3.8-flash for its prose, but measured on a real CV it generated at
 * roughly 4 tokens a second and took 100 to 250 s per call, far past the
 * route's 60 s budget, while flash-lite returned the same kinds of
 * suggestions in about 18 s. Set GEMINI_MODEL_PIVOT to trade speed back for
 * prose quality.
 */
export const MODELS = {
  analyze: process.env.GEMINI_MODEL_ANALYZE ?? "gemini-3.5-flash-lite",
  pivot: process.env.GEMINI_MODEL_PIVOT ?? "gemini-3.5-flash-lite",
} as const;

export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

function thinkingFrom(value: string | undefined, fallback: ThinkingLevel): ThinkingLevel {
  return value === "minimal" || value === "low" || value === "medium" || value === "high"
    ? value
    : fallback;
}

/**
 * Reasoning effort per task.
 *
 * Gemini 3 models think at length by default, which on a full CV and job
 * description pushed each call past a minute — longer than the routes'
 * `maxDuration`. Neither task needs it: analyse is extraction against a fixed
 * schema, and pivot rewrites bullets under tight rules spelled out in the
 * prompt. Override with GEMINI_THINKING_ANALYZE / GEMINI_THINKING_PIVOT.
 */
export const THINKING = {
  analyze: thinkingFrom(process.env.GEMINI_THINKING_ANALYZE, "minimal"),
  pivot: thinkingFrom(process.env.GEMINI_THINKING_PIVOT, "low"),
} as const;

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
}

export function isAiConfigured(): boolean {
  return Boolean(apiKey());
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const key = apiKey();
  if (!key) throw new AiNotConfiguredError();
  if (!client) client = new GoogleGenAI({ apiKey: key });
  return client;
}

/** Pull an HTTP status off whatever shape the SDK threw. */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  for (const value of [candidate.status, candidate.statusCode, candidate.code]) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value);
  }
  return undefined;
}

function retryAfterOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const headers = (error as { headers?: unknown }).headers;
  if (headers && typeof (headers as Headers).get === "function") {
    const value = (headers as Headers).get("retry-after");
    if (value && /^\d+$/.test(value)) return Number(value);
  }
  return undefined;
}

/** The provider rejected the response schema itself, not the request. */
function isSchemaRejection(error: unknown): boolean {
  return (
    statusOf(error) === 400 &&
    error instanceof Error &&
    /too many states|schema/i.test(error.message)
  );
}

/**
 * Strip a ```json fence if the model adds one despite the schema. Cheap
 * insurance: a single stray fence should not lose the user their analysis.
 */
function unfence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Ask the model for JSON conforming to `schema` and return it parsed.
 *
 * Throws `AiNotConfiguredError`, `AiRateLimitedError` or `AiUpstreamError` so
 * the routes can map each to the right user-facing state from PRD section 11.
 */
export async function generateJson<T = unknown>(
  options: GenerateJsonOptions,
): Promise<T> {
  const ai = getClient();

  const call = (constrained: boolean) =>
    ai.interactions.create(
      {
        model: options.model ?? MODELS.analyze,
        system_instruction: constrained
          ? options.system
          : `${options.system}

Return one JSON object that conforms to this JSON Schema:
${JSON.stringify(options.schema)}`,
        input: options.prompt,
        response_format: constrained
          ? { type: "text", mime_type: "application/json", schema: options.schema }
          : { type: "text", mime_type: "application/json" },
        generation_config: {
          temperature: options.temperature ?? 0.1,
          thinking_level: options.thinking ?? THINKING.analyze,
        },
        // Do not retain the CV or job text on the provider side.
        store: false,
      },
      options.signal ? { signal: options.signal } : undefined,
    );

  let raw: string;
  try {
    let response;
    try {
      response = await call(true);
    } catch (error) {
      // Gemini sometimes refuses to compile a schema it accepted before ("too
      // many states for serving"). The schema is a convenience, not a
      // guarantee — Zod validates the answer either way — so ask once more
      // with the schema written into the instructions instead.
      if (!isSchemaRejection(error)) throw error;
      response = await call(false);
    }
    raw = response.output_text ?? "";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiUpstreamError("The analysis took too long to come back.");
    }
    const status = statusOf(error);
    if (status === 429) throw new AiRateLimitedError(retryAfterOf(error));
    if (status === 401 || status === 403) throw new AiNotConfiguredError();
    throw new AiUpstreamError(
      error instanceof Error ? error.message : "The AI provider failed.",
    );
  }

  if (raw.trim().length === 0) {
    throw new AiUpstreamError("The AI provider returned an empty response.");
  }

  try {
    return JSON.parse(unfence(raw)) as T;
  } catch {
    throw new AiUpstreamError("The AI provider returned malformed JSON.");
  }
}
