/**
 * The two hashes that go on chain.
 *
 * PRD section 5 stores a `reportHash` and a `cvHash` and nothing else that
 * could identify anybody. Both are computed here, in the browser, with Web
 * Crypto.
 *
 * `cvHash` is SHA-256 of (CV text + a random salt kept only in this browser).
 * The salt is the whole point: a bare hash of a CV would let anyone holding a
 * copy of that CV confirm it matches an on-chain stamp. Salted, the hash ties
 * a report to its owner's own history and reveals nothing else.
 *
 * `reportHash` is SHA-256 of a canonical summary of the report. It commits to
 * the scores and the job title that were stamped, so a shared report can be
 * shown to match its stamp, while still containing no CV content.
 */

import type { Report } from "@/lib/types";

/** `0x`-prefixed 32-byte hex, which is what `bytes32` expects. */
export type Bytes32 = `0x${string}`;

async function sha256Hex(input: string): Promise<Bytes32> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `0x${hex}`;
}

/**
 * Salted hash of the CV text.
 *
 * The text is normalised first so that re-hashing the same CV after an
 * irrelevant whitespace change still produces the same value.
 */
export async function hashCv(cvText: string, salt: string): Promise<Bytes32> {
  const normalised = cvText.replace(/\s+/g, " ").trim();
  return sha256Hex(`callback.cv.v1|${salt}|${normalised}`);
}

/**
 * Hash of the report's stamped facts.
 *
 * The inputs are listed explicitly rather than hashing the whole object, so
 * that adding a field to `Report` cannot silently change the hash of reports
 * already stamped. Versioned for the same reason.
 */
export async function hashReport(report: Report): Promise<Bytes32> {
  const canonical = [
    "callback.report.v1",
    report.id,
    report.jobTitle,
    report.company,
    String(report.ats.score),
    String(report.match.score),
    String(report.match.requirements.length),
    String(report.match.keywords.matched.length),
    String(report.match.keywords.missing.length),
    report.improvedFromId ?? "",
    String(report.createdAt),
  ].join("|");

  return sha256Hex(canonical);
}
