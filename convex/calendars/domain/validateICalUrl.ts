import { isSecureUrl } from "./isSecureUrl";

export type ICalValidationResult =
  | { valid: true }
  | { valid: false; reason: "unreachable"; message: string }
  | { valid: false; reason: "invalid"; message: string };

const FETCH_TIMEOUT_MS = 10_000;
const ICAL_HEADER = "BEGIN:VCALENDAR";
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

// Streams the response body up to maxBytes, returning the accumulated text.
// Returns null if the limit is exceeded before the stream ends, cancelling
// the reader immediately so the connection is dropped rather than drained.
// Using streaming rather than response.text() prevents memory exhaustion from
// a malicious server that omits Content-Length and streams indefinitely.
export async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let text = "";
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        reader.cancel().catch(() => {});
        return null;
      }

      text += decoder.decode(value, { stream: true });

      // Exit early once the iCal header is confirmed — no need to read further.
      if (text.includes(ICAL_HEADER)) {
        reader.cancel();
        break;
      }
    }
    text += decoder.decode();
  } finally {
    reader.cancel().catch(() => {});
  }

  return text;
}

export async function validateICalUrl(url: string): Promise<ICalValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "invalid", message: "URL is not valid" };
  }

  if (!isSecureUrl(parsed)) {
    return {
      valid: false,
      reason: "invalid",
      message: "URL must use http or https and be a publicly reachable address",
    };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "text/calendar" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // Prevents SSRF via redirect chains: a public URL redirecting to an
      // internal address would bypass the isSecureUrl check above.
      redirect: "error",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    return { valid: false, reason: "unreachable", message };
  }

  if (!response.ok) {
    return {
      valid: false,
      reason: "unreachable",
      message: `HTTP ${response.status} ${response.statusText}`.trim(),
    };
  }

  // Fast reject based on declared size before reading any bytes.
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
    return {
      valid: false,
      reason: "invalid",
      message: "Response is too large to be a valid iCal feed",
    };
  }

  const body = await readBodyWithLimit(response, MAX_RESPONSE_BYTES);
  if (body === null) {
    return {
      valid: false,
      reason: "invalid",
      message: "Response is too large to be a valid iCal feed",
    };
  }

  if (!body.includes(ICAL_HEADER)) {
    return { valid: false, reason: "invalid", message: "Response is not a valid iCal feed" };
  }

  return { valid: true };
}
