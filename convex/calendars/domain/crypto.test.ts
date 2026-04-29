// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";

// 32 bytes of zeros encoded as base64 — a deterministic test key.
const TEST_KEY = Buffer.alloc(32, 0).toString("base64");

// Must run before the static import below so the module-level IIFE finds the key.
vi.hoisted(() => {
  process.env.CALENDAR_ENCRYPTION_KEY = Buffer.alloc(32, 0).toString("base64");
});

import { decryptJson, encryptJson } from "./crypto";

describe("encryptJson / decryptJson", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", TEST_KEY);
    vi.resetModules();
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

  test("throws at module load when CALENDAR_ENCRYPTION_KEY is missing", async () => {
    vi.resetModules();
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", "");
    await expect(import("./crypto")).rejects.toThrow(/CALENDAR_ENCRYPTION_KEY is not set/);
  });

  test("throws at module load when CALENDAR_ENCRYPTION_KEY is not 32 bytes", async () => {
    vi.resetModules();
    vi.stubEnv("CALENDAR_ENCRYPTION_KEY", Buffer.alloc(16, 0).toString("base64"));
    await expect(import("./crypto")).rejects.toThrow(/32 bytes/);
  });
});
