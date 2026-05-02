import { describe, expect, test } from "vitest";

import { isSecureUrl } from "./isSecureUrl";

const url = (s: string) => new URL(s);

describe("isSecureUrl", () => {
  describe("protocol", () => {
    test("allows http", () => expect(isSecureUrl(url("http://example.com/"))).toBe(true));
    test("allows https", () => expect(isSecureUrl(url("https://example.com/"))).toBe(true));
    test("blocks ftp", () => expect(isSecureUrl(url("ftp://example.com/"))).toBe(false));
    test("blocks file", () => expect(isSecureUrl(url("file:///etc/passwd"))).toBe(false));
  });

  describe("private / loopback hosts", () => {
    test.each([
      ["localhost", "http://localhost/"],
      ["0.0.0.0", "http://0.0.0.0/"],
      ["127.0.0.1", "http://127.0.0.1/"],
      ["127.255.255.255", "http://127.255.255.255/"],
      ["10.0.0.1", "http://10.0.0.1/"],
      ["10.255.255.255", "http://10.255.255.255/"],
      ["192.168.0.1", "http://192.168.0.1/"],
      ["192.168.255.255", "http://192.168.255.255/"],
      ["172.16.0.1", "http://172.16.0.1/"],
      ["172.31.255.255", "http://172.31.255.255/"],
      ["169.254.169.254", "http://169.254.169.254/"], // cloud metadata
      ["169.254.0.1", "http://169.254.0.1/"],
      ["[::1]", "http://[::1]/"], // IPv6 loopback
      ["[::ffff:127.0.0.1]", "http://[::ffff:127.0.0.1]/"], // IPv4-mapped loopback
      ["[::ffff:10.0.0.1]", "http://[::ffff:10.0.0.1]/"], // IPv4-mapped RFC 1918
      ["[fc00::1]", "http://[fc00::1]/"], // IPv6 unique local
      ["[fd12:3456::1]", "http://[fd12:3456::1]/"], // IPv6 unique local
      ["[fe80::1]", "http://[fe80::1]/"], // IPv6 link-local fe80::/10
      ["[fe90::1]", "http://[fe90::1]/"], // IPv6 link-local fe80::/10
      ["[fea0::1]", "http://[fea0::1]/"], // IPv6 link-local fe80::/10
      ["[feb0::1]", "http://[feb0::1]/"], // IPv6 link-local fe80::/10
      ["[febf::1]", "http://[febf::1]/"], // IPv6 link-local fe80::/10 upper bound
    ])("blocks %s", (_label, rawUrl) => {
      expect(isSecureUrl(url(rawUrl))).toBe(false);
    });
  });

  describe("fe80::/10 boundary", () => {
    test("blocks fe80::1 (start of range)", () =>
      expect(isSecureUrl(url("http://[fe80::1]/"))).toBe(false));
    test("blocks febf::1 (end of range)", () =>
      expect(isSecureUrl(url("http://[febf::1]/"))).toBe(false));
    test("allows fec0::1 (just above range)", () =>
      expect(isSecureUrl(url("http://[fec0::1]/"))).toBe(true));
  });

  describe("172.16.0.0/12 boundary", () => {
    test("blocks 172.16.0.1 (inside range)", () =>
      expect(isSecureUrl(url("http://172.16.0.1/"))).toBe(false));
    test("blocks 172.31.255.255 (inside range)", () =>
      expect(isSecureUrl(url("http://172.31.255.255/"))).toBe(false));
    test("allows 172.15.0.1 (just below range)", () =>
      expect(isSecureUrl(url("http://172.15.0.1/"))).toBe(true));
    test("allows 172.32.0.1 (just above range)", () =>
      expect(isSecureUrl(url("http://172.32.0.1/"))).toBe(true));
  });

  describe("public hosts", () => {
    test.each([
      ["example.com", "https://example.com/feed.ics"],
      ["8.8.8.8", "https://8.8.8.8/"],
      ["172.15.0.1", "http://172.15.0.1/"],
      ["172.32.0.1", "http://172.32.0.1/"],
    ])("allows %s", (_label, rawUrl) => {
      expect(isSecureUrl(url(rawUrl))).toBe(true);
    });
  });
});
