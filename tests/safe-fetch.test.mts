import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBlockedAddress } from "../src/lib/server/safe-fetch.ts";

/**
 * Address classification for the link-reading endpoint.
 *
 * This is the security boundary for `/api/extract-url`: the endpoint fetches a
 * URL the user supplies, so getting these ranges wrong is either a
 * server-side request forgery hole or a broken feature.
 *
 * Both directions are tested on purpose. An over-broad block list looks safe
 * and silently breaks real sites — which is exactly what happened with the
 * NAT64 prefix below, where blocking `64:ff9b::/96` outright made every
 * IPv4-only host unreachable from a DNS64 network, Greenhouse and Lever
 * included.
 */

describe("isBlockedAddress", () => {
  it("blocks IPv4 loopback, private and link-local ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "127.1.2.3",
      "10.0.0.1",
      "10.255.255.255",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // cloud metadata
      "100.64.0.1", // carrier NAT
      "0.0.0.0",
      "255.255.255.255",
      "224.0.0.1", // multicast
      "240.0.0.1", // reserved
      "192.0.2.1", // documentation
      "198.18.0.1", // benchmarking
    ]) {
      assert.equal(isBlockedAddress(ip), true, `${ip} should be blocked`);
    }
  });

  it("allows ordinary public IPv4 addresses", () => {
    for (const ip of [
      "13.35.1.18", // CloudFront, fronts Greenhouse
      "18.244.51.96",
      "103.102.166.224", // Wikipedia
      "172.15.255.255", // just below the private 172.16/12 block
      "172.32.0.1", // just above it
      "9.255.255.255", // just below 10/8
      "11.0.0.1", // just above it
      "100.63.255.255", // just below the CGNAT block
      "100.128.0.1", // just above it
    ]) {
      assert.equal(isBlockedAddress(ip), false, `${ip} should be allowed`);
    }
  });

  it("blocks IPv6 loopback, unique-local, link-local and multicast", () => {
    for (const ip of [
      "::",
      "::1",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "fe80::abcd%eth0", // zone index must not defeat the check
      "ff02::1",
      "2001:db8::1", // documentation
      "100::1", // discard prefix
    ]) {
      assert.equal(isBlockedAddress(ip), true, `${ip} should be blocked`);
    }
  });

  it("allows ordinary public IPv6 addresses", () => {
    for (const ip of [
      "2606:4700:4403::6812:2582", // Cloudflare
      "2001:df2:e500:ed1a::1", // Wikipedia
      "2a06:98c1:310d::ac40:967e",
    ]) {
      assert.equal(isBlockedAddress(ip), false, `${ip} should be allowed`);
    }
  });

  it("judges an IPv4-mapped address on its embedded IPv4", () => {
    assert.equal(isBlockedAddress("::ffff:127.0.0.1"), true);
    assert.equal(isBlockedAddress("::ffff:10.0.0.1"), true);
    assert.equal(isBlockedAddress("::ffff:169.254.169.254"), true);
    assert.equal(isBlockedAddress("::ffff:13.35.1.18"), false);
  });

  it("judges a NAT64 address on its embedded IPv4, not the prefix", () => {
    // 64:ff9b::d23:112 is 13.35.1.18 — a public address a DNS64 resolver
    // synthesised. Blocking the whole prefix broke every IPv4-only host.
    assert.equal(isBlockedAddress("64:ff9b::d23:112"), false);
    assert.equal(isBlockedAddress("64:ff9b::d23:109"), false);
    assert.equal(isBlockedAddress("64:ff9b::d23:169"), false);
    assert.equal(isBlockedAddress("64:ff9b::d23:13f"), false);

    // The wrapping must not become a bypass for anything private.
    assert.equal(isBlockedAddress("64:ff9b::7f00:1"), true); // 127.0.0.1
    assert.equal(isBlockedAddress("64:ff9b::a00:1"), true); // 10.0.0.1
    assert.equal(isBlockedAddress("64:ff9b::a9fe:a9fe"), true); // 169.254.169.254
    assert.equal(isBlockedAddress("64:ff9b::c0a8:101"), true); // 192.168.1.1
    assert.equal(isBlockedAddress("64:ff9b::ac10:1"), true); // 172.16.0.1
  });

  it("blocks anything it cannot parse", () => {
    for (const value of [
      "",
      "garbage",
      "999.999.999.999",
      "1.2.3",
      "12345::",
      "::ffff:999.1.1.1",
      "localhost",
    ]) {
      assert.equal(isBlockedAddress(value), true, `${value} should be blocked`);
    }
  });
});
