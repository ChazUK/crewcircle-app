// `webcal://` and `webcals://` are scheme hints from the iCalendar
// subscription convention — there is no "webcal" wire protocol. Clients
// resolve them to HTTP(S). We normalize to https so the validator and the
// stored connection URL share a single, secure transport.
export function normalizeICalUrl(url: string): string {
  const trimmed = url.trim();
  if (/^webcal:\/\//i.test(trimmed)) {
    return "https://" + trimmed.slice("webcal://".length);
  }
  if (/^webcals:\/\//i.test(trimmed)) {
    return "https://" + trimmed.slice("webcals://".length);
  }
  return trimmed;
}
