import { createCipheriv, randomBytes } from "node:crypto";

// Encrypts arbitrary JSON data using AES-256-GCM.
// Layout of returned buffer: [12-byte IV][16-byte auth tag][ciphertext]
// Key must be a base64-encoded 32-byte value in CALENDAR_ENCRYPTION_KEY env var.
export async function encryptJson(data: unknown): Promise<ArrayBuffer> {
  const keyEnv = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!keyEnv) throw new Error("CALENDAR_ENCRYPTION_KEY env var not set");

  const key = Buffer.from(keyEnv, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const json = JSON.stringify(data);
  const ciphertext = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const result = new Uint8Array(12 + 16 + ciphertext.length);
  result.set(iv, 0);
  result.set(authTag, 12);
  result.set(ciphertext, 28);
  return result.buffer;
}
