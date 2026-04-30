function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtcDate(epochMs: number): string {
  const d = new Date(epochMs);
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545 §3.1: fold lines longer than 75 octets with CRLF + SPACE
function foldLine(line: string): string {
  const maxOctets = 75;
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= maxOctets) return line;

  const parts: string[] = [];
  let pos = 0;
  let limit = maxOctets;
  while (pos < bytes.length) {
    // Find a char boundary at or before limit
    while (limit > pos && (bytes[limit]! & 0xc0) === 0x80) limit--;
    parts.push(new TextDecoder().decode(bytes.slice(pos, limit)));
    pos = limit;
    limit = pos + maxOctets - 1; // -1 for the leading SPACE on continuation lines
  }
  return parts.join("\r\n ");
}

export type IcsEventData = {
  uid: string;
  dtstamp: number;
  startsAt: number;
  endsAt: number;
  title: string;
  description: string;
  location?: string;
};

export function generateIcs(event: IcsEventData): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CrewCircle//CrewCircle//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${formatUtcDate(event.dtstamp)}`,
    `DTSTART:${formatUtcDate(event.startsAt)}`,
    `DTEND:${formatUtcDate(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
  ];

  if (event.location !== undefined) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
