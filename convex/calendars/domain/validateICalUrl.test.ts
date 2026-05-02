import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { readBodyWithLimit, validateICalUrl } from "./validateICalUrl";

const VALID_ICAL_BODY = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Test//EN",
  "END:VCALENDAR",
].join("\r\n");

function makeResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}

function makeStreamingResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

// ─── readBodyWithLimit ────────────────────────────────────────────────────────

describe("readBodyWithLimit", () => {
  test("returns body text when under the limit", async () => {
    const response = makeStreamingResponse(["BEGIN:VCALENDAR", "\r\nEND:VCALENDAR"]);
    const result = await readBodyWithLimit(response, 1024);
    expect(result).toContain("BEGIN:VCALENDAR");
  });

  test("returns null and cancels the reader when the limit is exceeded mid-stream", async () => {
    const chunk = "x".repeat(512);
    const response = makeStreamingResponse([chunk, chunk, chunk]); // 1536 bytes total
    const result = await readBodyWithLimit(response, 1024);
    expect(result).toBeNull();
  });

  test("exits early after finding BEGIN:VCALENDAR without reading the rest of the stream", async () => {
    let chunksRead = 0;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("BEGIN:VCALENDAR\r\n"));
        controller.enqueue(encoder.encode("x".repeat(1024 * 1024)));
        controller.close();
      },
      pull() {
        chunksRead++;
      },
    });
    const response = new Response(stream);
    const result = await readBodyWithLimit(response, 10 * 1024 * 1024);
    expect(result).toContain("BEGIN:VCALENDAR");
    expect(chunksRead).toBe(0);
  });

  test("returns empty string for a response with no body", async () => {
    const result = await readBodyWithLimit(new Response(null, { status: 200 }), 1024);
    expect(result).toBe("");
  });
});

// ─── validateICalUrl ──────────────────────────────────────────────────────────

describe("validateICalUrl", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Happy path
  test("returns valid when the response body contains BEGIN:VCALENDAR", async () => {
    fetchMock.mockResolvedValue(makeResponse(VALID_ICAL_BODY));
    expect(await validateICalUrl("https://example.com/feed.ics")).toEqual({ valid: true });
  });

  // URL validation — fetch must never be called for any of these
  test("returns invalid for a malformed URL string", async () => {
    const result = await validateICalUrl("not a url");
    expect(result).toMatchObject({ valid: false, reason: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each([
    ["ftp protocol", "ftp://example.com/feed.ics"],
    ["localhost", "http://localhost/calendar.ics"],
    ["IPv4 loopback", "http://127.0.0.1/calendar.ics"],
    ["RFC 1918 10.x", "http://10.0.0.1/calendar.ics"],
    ["RFC 1918 192.168.x", "http://192.168.1.1/calendar.ics"],
    ["RFC 1918 172.16.x", "http://172.16.0.1/calendar.ics"],
    ["cloud metadata endpoint", "http://169.254.169.254/latest/meta-data/"],
    ["IPv6 loopback", "http://[::1]/calendar.ics"],
    ["IPv4-mapped IPv6 loopback", "http://[::ffff:127.0.0.1]/calendar.ics"],
  ])("returns invalid without fetching — %s", async (_label, url) => {
    const result = await validateICalUrl(url);
    expect(result).toMatchObject({ valid: false, reason: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Redirect chains
  test("passes redirect:error to fetch to block SSRF via redirects", async () => {
    fetchMock.mockRejectedValue(new TypeError("redirect not allowed"));
    await validateICalUrl("https://example.com/redirecting.ics");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirect: "error" }),
    );
  });

  test("returns unreachable when a redirect is encountered", async () => {
    fetchMock.mockRejectedValue(new TypeError("redirect not allowed"));
    expect(await validateICalUrl("https://example.com/redirecting.ics")).toMatchObject({
      valid: false,
      reason: "unreachable",
    });
  });

  // Network errors
  test("returns unreachable when fetch throws a network error", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(await validateICalUrl("https://example.com/feed.ics")).toMatchObject({
      valid: false,
      reason: "unreachable",
    });
  });

  test("returns unreachable when the server responds with HTTP 404", async () => {
    fetchMock.mockResolvedValue(makeResponse("Not Found", 404));
    const result = await validateICalUrl("https://example.com/missing.ics");
    expect(result).toMatchObject({ valid: false, reason: "unreachable" });
    if (result.valid === false) expect(result.message).toContain("404");
  });

  // Memory exhaustion
  test("returns invalid when Content-Length header exceeds 10 MB", async () => {
    fetchMock.mockResolvedValue(
      makeResponse(VALID_ICAL_BODY, 200, { "content-length": String(11 * 1024 * 1024) }),
    );
    expect(await validateICalUrl("https://example.com/feed.ics")).toMatchObject({
      valid: false,
      reason: "invalid",
    });
  });

  test("returns invalid when streamed body exceeds 10 MB even without Content-Length", async () => {
    const chunk = "x".repeat(1024 * 1024);
    fetchMock.mockResolvedValue(makeStreamingResponse(Array(11).fill(chunk)));
    expect(await validateICalUrl("https://example.com/feed.ics")).toMatchObject({
      valid: false,
      reason: "invalid",
    });
  });

  // Content checks
  test("returns invalid when the response body is HTML rather than iCal", async () => {
    fetchMock.mockResolvedValue(makeResponse("<html><body>Not a feed</body></html>"));
    expect(await validateICalUrl("https://example.com/feed.ics")).toMatchObject({
      valid: false,
      reason: "invalid",
    });
  });
});
