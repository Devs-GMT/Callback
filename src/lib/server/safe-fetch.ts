/**
 * Fetching a URL the user supplied, safely.
 *
 * `/api/extract-url` takes an arbitrary link and reads it server-side, which
 * is a server-side request forgery primitive unless it is fenced in. PRD
 * section 3 asks for private addresses blocked, a 5 second timeout and a 2 MB
 * cap; this module implements all three plus the parts that are easy to miss:
 *
 *  - Redirects are followed manually so every hop is re-validated. A public
 *    host that 302s to 169.254.169.254 is the classic bypass.
 *  - DNS is resolved up front and *every* returned address is checked, not
 *    just the first, so a hostname with one public and one private A record
 *    cannot slip through.
 *  - Only http and https on the default ports are allowed, so the endpoint
 *    cannot be used to probe internal services on odd ports.
 *
 * Known limitation: the check and the connection are two separate DNS
 * resolutions, so a hostname re-pointed between them (DNS rebinding) is not
 * caught. Closing that would mean connecting to a pinned IP, which breaks TLS
 * certificate validation for https. Given the endpoint only ever returns
 * extracted article text to the caller who supplied the URL, and runs with a
 * 5 second budget, that residual window is accepted rather than traded for
 * weaker transport security.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type SafeFetchFailure =
  | { reason: "bad_url" }
  | { reason: "blocked" }
  /** The hostname did not resolve. Distinct from `blocked` on purpose. */
  | { reason: "dns_failed" }
  | { reason: "timeout" }
  | { reason: "too_large" }
  | { reason: "http_error"; status: number }
  | { reason: "unsupported_type"; contentType: string }
  | { reason: "network" };

export type SafeFetchResult =
  | { ok: true; html: string; finalUrl: string; contentType: string }
  | { ok: false; failure: SafeFetchFailure };

const MAX_REDIRECTS = 3;

/** Content types worth parsing as a page. */
const ALLOWED_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/plain",
  "application/json",
];

/* -------------------------------------------------------------------------- */
/* IP range checks                                                            */
/* -------------------------------------------------------------------------- */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

/** CIDR blocks that must never be reachable from this endpoint. */
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // this network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, incl. cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true;
  if (value === 0xffffffff) return true; // broadcast

  for (const [network, bits] of BLOCKED_V4) {
    const base = ipv4ToInt(network);
    if (base === null) continue;
    // `>>> 0` keeps the mask unsigned; a /0 would shift by 32 and misbehave.
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) === (base & mask)) return true;
  }
  return false;
}

/** Expand an IPv6 address to its 8 hextets as numbers. */
function parseIpv6(ip: string): number[] | null {
  const zone = ip.indexOf("%");
  const address = zone === -1 ? ip : ip.slice(0, zone);

  const [head, tail] = address.split("::");
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail !== undefined ? tail.split(":").filter(Boolean) : [];

  // A trailing IPv4 form, as in ::ffff:192.0.2.1, contributes two hextets.
  const expand = (parts: string[]): string[] | null => {
    const out: string[] = [];
    for (const part of parts) {
      if (part.includes(".")) {
        const value = ipv4ToInt(part);
        if (value === null) return null;
        out.push(((value >>> 16) & 0xffff).toString(16));
        out.push((value & 0xffff).toString(16));
      } else {
        out.push(part);
      }
    }
    return out;
  };

  const headExpanded = expand(headParts);
  const tailExpanded = expand(tailParts);
  if (!headExpanded || !tailExpanded) return null;

  const missing = 8 - headExpanded.length - tailExpanded.length;
  if (tail === undefined) {
    if (headExpanded.length !== 8) return null;
  } else if (missing < 0) {
    return null;
  }

  const hextets = [
    ...headExpanded,
    ...Array.from({ length: tail === undefined ? 0 : missing }, () => "0"),
    ...tailExpanded,
  ];

  if (hextets.length !== 8) return null;

  const numbers: number[] = [];
  for (const hextet of hextets) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(hextet)) return null;
    numbers.push(parseInt(hextet, 16));
  }
  return numbers;
}

function isBlockedIpv6(ip: string): boolean {
  const parts = parseIpv6(ip);
  if (!parts) return true;

  const allZero = parts.every((p) => p === 0);
  if (allZero) return true; // ::
  if (parts.slice(0, 7).every((p) => p === 0) && parts[7] === 1) return true; // ::1

  /**
   * Addresses that embed an IPv4 one in their low 32 bits are judged on that
   * IPv4 address, not rejected outright. Three forms matter:
   *
   *   ::ffff:a.b.c.d   IPv4-mapped
   *   ::a.b.c.d        IPv4-compatible (deprecated, still seen)
   *   64:ff9b::a.b.c.d NAT64
   *
   * NAT64 is the one worth spelling out. On a NAT64/DNS64 network — which is
   * normal on many mobile and cloud networks — the resolver synthesises these
   * for hosts that only have an A record. `job-boards.greenhouse.io` resolves
   * to `64:ff9b::d23:112`, which is simply the public address 13.35.1.18 in
   * NAT64 form. Treating the whole prefix as untrusted made every IPv4-only
   * host unreachable from such a network, which broke exactly the job boards
   * this endpoint exists to read.
   */
  const embeddedIpv4 = (() => {
    const firstFiveZero = parts.slice(0, 5).every((p) => p === 0);
    if (firstFiveZero && (parts[5] === 0xffff || parts[5] === 0)) return true;
    if (parts[0] === 0x0064 && parts[1] === 0xff9b && parts[2] === 0 && parts[3] === 0)
      return true;
    return false;
  })();

  if (embeddedIpv4) {
    const v4 = `${parts[6] >> 8}.${parts[6] & 0xff}.${parts[7] >> 8}.${parts[7] & 0xff}`;
    return isBlockedIpv4(v4);
  }

  const [first] = parts;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (first === 0x2001 && parts[1] === 0x0db8) return true; // documentation
  if (first === 0x0100 && parts.slice(1, 4).every((p) => p === 0)) return true; // discard

  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true;
}

/* -------------------------------------------------------------------------- */
/* URL validation                                                             */
/* -------------------------------------------------------------------------- */

function parseUrl(input: string): URL | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  // Only the default ports. Anything else is a port scan in disguise.
  if (url.port !== "" && url.port !== "80" && url.port !== "443") return null;

  // No credentials in the URL, which some clients would forward upstream.
  if (url.username || url.password) return null;

  if (url.hostname.length === 0) return null;

  return url;
}

/** Hostnames that resolve locally regardless of DNS. */
function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "metadata" || host === "metadata.google.internal") return true;
  // A bare hostname with no dot is almost always an internal name.
  return !host.includes(".") && isIP(host) === 0;
}

type Resolution =
  | { ok: true; addresses: string[] }
  | { ok: false; reason: "blocked" | "dns_failed" };

/**
 * Resolve `hostname` and check every address it returns.
 *
 * All-or-nothing on the addresses, on purpose: a host that resolves to both a
 * public and a private address is not safe to fetch.
 *
 * A failed lookup is reported separately from a blocked range. Collapsing the
 * two would tell a user that their perfectly ordinary job link "isn't a public
 * web page" when in fact our DNS query just failed — a misleading message that
 * sends them to the wrong fix.
 */
async function resolveSafely(hostname: string): Promise<Resolution> {
  if (isLocalHostname(hostname)) return { ok: false, reason: "blocked" };

  if (isIP(hostname) !== 0) {
    const bare = hostname.replace(/^\[|\]$/g, "");
    return isBlockedAddress(bare)
      ? { ok: false, reason: "blocked" }
      : { ok: true, addresses: [bare] };
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, reason: "dns_failed" };
  }

  if (addresses.length === 0) return { ok: false, reason: "dns_failed" };
  if (addresses.some((entry) => isBlockedAddress(entry.address))) {
    return { ok: false, reason: "blocked" };
  }

  return { ok: true, addresses: addresses.map((entry) => entry.address) };
}

/* -------------------------------------------------------------------------- */
/* Fetch                                                                      */
/* -------------------------------------------------------------------------- */

/** Read the body with a hard byte ceiling, aborting as soon as it is passed. */
async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  const body = response.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export type SafeFetchOptions = {
  timeoutMs: number;
  maxBytes: number;
};

/**
 * Fetch a user-supplied URL with every hop validated.
 *
 * The timeout covers the whole operation including redirects, so a chain of
 * slow hops cannot extend it.
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions,
): Promise<SafeFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    let current = parseUrl(rawUrl);
    if (!current) return { ok: false, failure: { reason: "bad_url" } };

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const resolution = await resolveSafely(current.hostname);
      if (!resolution.ok) {
        return { ok: false, failure: { reason: resolution.reason } };
      }

      let response: Response;
      try {
        response = await fetch(current, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            // Identify honestly, and ask for the readable version of the page.
            "User-Agent":
              "Callback/1.0 (+https://github.com/; CV and job description reader)",
            Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
            "Accept-Language": "en",
          },
          cache: "no-store",
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return { ok: false, failure: { reason: "timeout" } };
        }
        return { ok: false, failure: { reason: "network" } };
      }

      // Follow redirects ourselves so the next host is validated too.
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return { ok: false, failure: { reason: "http_error", status: response.status } };
        }
        const next = parseUrl(new URL(location, current).toString());
        if (!next) return { ok: false, failure: { reason: "blocked" } };
        current = next;
        continue;
      }

      if (!response.ok) {
        return { ok: false, failure: { reason: "http_error", status: response.status } };
      }

      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
      if (!ALLOWED_TYPES.some((type) => contentType.includes(type))) {
        return { ok: false, failure: { reason: "unsupported_type", contentType } };
      }

      const declared = Number(response.headers.get("content-length") ?? "0");
      if (declared > options.maxBytes) {
        return { ok: false, failure: { reason: "too_large" } };
      }

      const html = await readCapped(response, options.maxBytes);
      if (html === null) return { ok: false, failure: { reason: "too_large" } };

      return { ok: true, html, finalUrl: current.toString(), contentType };
    }

    return { ok: false, failure: { reason: "http_error", status: 310 } };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, failure: { reason: "timeout" } };
    }
    return { ok: false, failure: { reason: "network" } };
  } finally {
    clearTimeout(timer);
  }
}
