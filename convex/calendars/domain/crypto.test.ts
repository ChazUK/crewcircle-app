// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { decryptJson, encryptJson } from "./crypto";

// 32 bytes of zeros encoded as base64 — a deterministic test key that the
// production code will never accept because getKey validates length only.
const TEST_KEY = Buffer.alloc(32, 0).toString("base64");

describe("encryptJson / decryptJson", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("round-trips arbitrary JSON payloads", () => {
    const payload = { accessToken: "a", refreshToken: "b", tokenType: "Bearer" };
    const roundTripped = decryptJson<typeof payload>(encryptJson(payload));
    expect(roundTripped).toEqual(payload);
  });

  test("produces a different ciphertext on each call (fresh IV)", () => {
    const payload = { accessToken: "a" };
    const first = Buffer.from(encryptJson(payload));
    const second = Buffer.from(encryptJson(payload));
    expect(first.equals(second)).toBe(false);
  });

  test("throws when the blob is shorter than IV + auth tag", () => {
    const tooShort = new ArrayBuffer(10);
    expect(() => decryptJson(tooShort)).toThrow(/too short/);
  });

  test("throws if the auth tag is tampered with", () => {
    const encrypted = encryptJson({ accessToken: "a" });
    const bytes = new Uint8Array(encrypted);
    bytes[12] = bytes[12] ^ 0xff; // flip the first auth-tag byte
    expect(() => decryptJson(bytes.buffer)).toThrow();
  });

  test("throws when CALENDAR_ENCRYPTION_KEY is missing", () => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", "");
    expect(() => encryptJson({})).toThrow(/CALENDAR_ENCRYPTION_KEY is not set/);
  });

  test("throws when CALENDAR_ENCRYPTION_KEY is not 32 bytes", () => {
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", Buffer.alloc(16, 0).toString("base64"));
    expect(() => encryptJson({})).toThrow(/32 bytes/);
  });
});
