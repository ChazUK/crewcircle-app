// AES-256-GCM encryption/decryption using WebCrypto (SubtleCrypto).
// Works in both Convex edge and Node.js runtimes, and in test environments.
// Layout of encrypted buffer: [12-byte IV][16-byte auth tag][ciphertext]
// Key must be a base64-encoded 32-byte value in CALENDAR_ENCRYPTION_KEY env var.

export type DecryptedTokens = { accessToken: string; refreshToken?: string; tokenType: string };

async function importKey(usage: "encrypt" | "decrypt"): Promise<CryptoKey> {
  const keyEnv = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!keyEnv) throw new Error("CALENDAR_ENCRYPTION_KEY env var not set");
  const keyBytes = Uint8Array.from(atob(keyEnv), (c) => c.charCodeAt(0));
  return globalThis.crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [usage]);
}

export async function encryptJson(data: unknown): Promise<ArrayBuffer> {
  const key = await importKey("encrypt");
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const json = new TextEncoder().encode(JSON.stringify(data));
  // WebCrypto AES-GCM appends the 16-byte auth tag after the ciphertext.
  // Re-pack to [IV(12)][authTag(16)][ciphertext] to match the stored layout.
  const encrypted = new Uint8Array(
    await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, json),
  );
  const ciphertextLen = encrypted.length - 16;
  const result = new Uint8Array(12 + 16 + ciphertextLen);
  result.set(iv, 0);
  result.set(encrypted.slice(ciphertextLen), 12);
  result.set(encrypted.slice(0, ciphertextLen), 28);
  return result.buffer;
}

export async function decryptJson<T = DecryptedTokens>(buffer: ArrayBuffer): Promise<T> {
  const key = await importKey("decrypt");
  const bytes = new Uint8Array(buffer);
  const iv = bytes.slice(0, 12);
  const authTag = bytes.slice(12, 28);
  const ciphertext = bytes.slice(28);
  // WebCrypto AES-GCM decrypt expects ciphertext || authTag concatenated.
  const combined = new Uint8Array(ciphertext.length + 16);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);
  const decrypted = await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}
