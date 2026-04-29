"use node";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const _KEY = (() => {
  const raw = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CALENDAR_ENCRYPTION_KEY is not set. Generate a 32-byte key with `openssl rand -base64 32` and set it with `npx convex env set CALENDAR_ENCRYPTION_KEY <value>`.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `CALENDAR_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). Use \`openssl rand -base64 32\`.`,
    );
  }
  return key;
})();

function getKey(): Buffer {
  return _KEY;
}

export function encryptJson(payload: unknown): ArrayBuffer {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, ciphertext]);
  return packed.buffer.slice(
    packed.byteOffset,
    packed.byteOffset + packed.byteLength,
  ) as ArrayBuffer;
}

export function decryptJson<T>(blob: ArrayBuffer): T {
  const key = getKey();
  const packed = Buffer.from(blob);
  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Encrypted blob is too short");
  }
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

export type EncryptedOAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
};
