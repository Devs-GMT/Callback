import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ANALYZE_JSON_SCHEMA,
  COVER_LETTER_JSON_SCHEMA,
  PIVOT_JSON_SCHEMA,
  analyzeResponseSchema,
} from "@/lib/ai/schemas";

/**
 * Gemini rejects schemas whose decoding state machine grows too large ("too
 * many states for serving"), and enums or array bounds inside arrays of
 * objects are what grow it. Allowed values live in descriptions instead.
 */
describe("provider schemas", () => {
  it("carry no enum or array bound", () => {
    for (const schema of [ANALYZE_JSON_SCHEMA, PIVOT_JSON_SCHEMA, COVER_LETTER_JSON_SCHEMA]) {
      const json = JSON.stringify(schema);
      assert.doesNotMatch(json, /"enum"|"maxItems"|"minItems"/);
    }
  });

  it("still maps loosely cased values onto the allowed ones", () => {
    const parsed = analyzeResponseSchema.parse({
      requirements: [{ id: "r1", text: "SQL", type: " Must ", category: "SKILL" }],
      matches: [{ requirementId: "r1", status: "Matched", evidence: "SQL", note: "" }],
      keywords: [],
      redFlags: [{ kind: "visa", text: "Needs a visa" }],
      seniority: { jobLevel: "Senior", cvLevel: "staff", note: "" },
      bulletQuality: { score: 10, detail: "", weakBullets: [] },
      looksLikeCv: true,
      looksLikeJob: true,
      verdict: "",
    });
    assert.equal(parsed.requirements[0].type, "must");
    assert.equal(parsed.requirements[0].category, "skill");
    assert.equal(parsed.matches[0].status, "matched");
    assert.equal(parsed.redFlags[0].kind, "other");
    assert.equal(parsed.seniority.jobLevel, "senior");
    assert.equal(parsed.seniority.cvLevel, "unknown");
  });
});
