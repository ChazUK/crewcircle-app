const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const PRIVATE_EXACT = new Set(["localhost", "0.0.0.0", "[::1]"]);

const PRIVATE_PREFIXES = [
  "127.", // IPv4 loopback
  "10.", // RFC 1918
  "192.168.", // RFC 1918
  "169.254.", // link-local / cloud metadata (AWS, GCP, Azure all use 169.254.169.254)
  "[::ffff:", // IPv4-mapped IPv6 — can encode any IPv4 address including private ones
  "[fc", // IPv6 unique local (fc00::/7)
  "[fd", // IPv6 unique local (fc00::/7)
  "[fe80", // IPv6 link-local (fe80::/10)
];

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (PRIVATE_EXACT.has(h)) return true;
  if (PRIVATE_PREFIXES.some((prefix) => h.startsWith(prefix))) return true;

  // 172.16.0.0/12 — covers 172.16.x.x through 172.31.x.x
  const parts = h.split(".");
  if (parts.length === 4 && parts[0] === "172") {
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

// Returns true if the URL is safe to fetch: protocol is http or https, and the
// hostname is not a private, loopback, or link-local address.
// Note: DNS rebinding (a public hostname that resolves to a private IP at
// fetch time) cannot be prevented at this layer.
export function isSecureUrl(url: URL): boolean {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return false;
  if (isPrivateHostname(url.hostname)) return false;
  return true;
}
