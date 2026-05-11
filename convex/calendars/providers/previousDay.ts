// Returns the date string ("yyyy-MM-dd") for the day before the given date.
// Used to convert provider exclusive-end dates (Google end.date, iCal DTEND
// with VALUE=DATE) into the inclusive last day we persist as endDate.
export function previousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}
