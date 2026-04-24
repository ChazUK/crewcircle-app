// Many iCal subscription links use the `webcal://` scheme, which is just an
// http(s) URL in disguise. Rewrite it so URL parsing and fetch both accept it.
export function normalizeIcalUrl(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("webcal://")) return `https://${trimmed.slice("webcal://".length)}`;
  if (lower.startsWith("webcals://")) return `https://${trimmed.slice("webcals://".length)}`;
  return trimmed;
}

// Reject URLs that would let a user point our server at internal infrastructure
// (SSRF). This is a defence-in-depth hostname check — it does not resolve DNS,
// so a DNS-rebinding host could still slip through; Convex's fetch sandbox is
// the last line of defence there.
export function assertSafeIcalUrl(raw: string): string {
  const normalized = normalizeIcalUrl(raw);
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Invalid iCal URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("iCal URL must use http(s) or webcal");
  }
  if (url.username || url.password) {
    throw new Error("iCal URL must not contain credentials");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname) throw new Error("iCal URL is missing a hostname");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "broadcasthost") {
    throw new Error("iCal URL points at a local host");
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = hostname.match(ipv4);
  if (m) {
    const octets = m.slice(1).map(Number);
    if (octets.some((o) => o < 0 || o > 255 || Number.isNaN(o))) {
      throw new Error("iCal URL has an invalid IP address");
    }
    const [a, b] = octets;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    ) {
      throw new Error("iCal URL points at a private or reserved network");
    }
  }
  if (hostname.includes(":")) {
    assertSafeIpv6(hostname);
  }
  return normalized;
}

// Expand an IPv6 literal into its eight 16-bit groups, with `::` compression
// resolved. Returns null if the literal is malformed or embeds an unsupported
// shape. The input must NOT include the surrounding `[]` brackets.
function expandIpv6(literal: string): number[] | null {
  if (!literal || literal.includes(" ")) return null;
  // IPv4-mapped / IPv4-compatible forms end with dotted-quad.
  let trailingDottedQuad: number[] | null = null;
  const dottedIdx = literal.lastIndexOf(":");
  if (/\./.test(literal)) {
    const tail = literal.slice(dottedIdx + 1);
    const m = tail.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const octets = m.slice(1).map(Number);
    if (octets.some((o) => o < 0 || o > 255 || Number.isNaN(o))) return null;
    trailingDottedQuad = [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]];
    literal = literal.slice(0, dottedIdx);
  }

  const parts = literal.split("::");
  if (parts.length > 2) return null;
  const leftRaw = parts[0] ? parts[0].split(":") : [];
  const rightRaw = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  const left: number[] = [];
  const right: number[] = [];
  for (const group of leftRaw) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    left.push(parseInt(group, 16));
  }
  for (const group of rightRaw) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    right.push(parseInt(group, 16));
  }
  const explicit = left.length + right.length + (trailingDottedQuad ? 2 : 0);
  if (parts.length === 2) {
    if (explicit > 8) return null;
    const zeros = new Array(8 - explicit).fill(0);
    return [...left, ...zeros, ...right, ...(trailingDottedQuad ?? [])];
  }
  if (explicit !== 8) return null;
  return [...left, ...right, ...(trailingDottedQuad ?? [])];
}

function assertSafeIpv6(hostname: string): void {
  const groups = expandIpv6(hostname);
  if (!groups) {
    throw new Error("iCal URL has an invalid IPv6 address");
  }
  // ::/128 (unspecified) and ::1/128 (loopback)
  if (groups.every((g) => g === 0)) {
    throw new Error("iCal URL points at a private or reserved network");
  }
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) {
    throw new Error("iCal URL points at a private or reserved network");
  }
  // IPv4-mapped (::ffff:0:0/96) and IPv4-compatible (::/96) embeds — rewrite
  // the last 32 bits as IPv4 and re-run the IPv4 block check so ::ffff:127.0.0.1
  // can't slip past us as a loopback.
  const isIpv4Mapped =
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff;
  const isIpv4Compatible = groups.slice(0, 6).every((g) => g === 0);
  if (isIpv4Mapped || isIpv4Compatible) {
    const a = (groups[6] >> 8) & 0xff;
    const b = groups[6] & 0xff;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    ) {
      throw new Error("iCal URL points at a private or reserved network");
    }
    // Even a public IPv4 wrapped in ::ffff:x.x.x.x is suspicious for an
    // end-user-supplied URL, but we don't need to over-block here — the
    // private-range check above is the security-critical path.
    return;
  }
  // NAT64 well-known prefix 64:ff9b::/96 — rewritten IPv4 traffic. Apply the
  // same IPv4 block check to the embedded address.
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every((g) => g === 0)) {
    const a = (groups[6] >> 8) & 0xff;
    const b = groups[6] & 0xff;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    ) {
      throw new Error("iCal URL points at a private or reserved network");
    }
  }
  // Unique-local fc00::/7 (both fc.. and fd..)
  if ((groups[0] & 0xfe00) === 0xfc00) {
    throw new Error("iCal URL points at a private or reserved network");
  }
  // Link-local fe80::/10
  if ((groups[0] & 0xffc0) === 0xfe80) {
    throw new Error("iCal URL points at a private or reserved network");
  }
  // Site-local (deprecated) fec0::/10 — still worth blocking as reserved
  if ((groups[0] & 0xffc0) === 0xfec0) {
    throw new Error("iCal URL points at a private or reserved network");
  }
  // Discard-only 100::/64
  if (groups[0] === 0x0100 && groups.slice(1, 4).every((g) => g === 0)) {
    throw new Error("iCal URL points at a private or reserved network");
  }
  // Multicast ff00::/8
  if ((groups[0] & 0xff00) === 0xff00) {
    throw new Error("iCal URL points at a private or reserved network");
  }
}

export function safeHostname(raw: string): string {
  try {
    return new URL(normalizeIcalUrl(raw)).hostname;
  } catch {
    return "Calendar";
  }
}
