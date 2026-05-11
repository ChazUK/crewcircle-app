import { defineTable } from "convex/server";
import { v } from "convex/values";

export const CalendarProvider = v.union(
  v.literal("google"),
  v.literal("native"),
  v.literal("microsoft"),
  v.literal("ical"),
);

export const CalendarConnection = {
  userId: v.id("users"),
  provider: CalendarProvider,
  // User-facing label, e.g. "work@example.com" or "Family iCloud"
  label: v.string(),
  // Provider-side identifier (Google email/sub, Outlook UPN, Apple localCalendarId, etc.)
  externalAccountId: v.optional(v.string()),
  // For provider="ical" — the subscription URL (stored as encrypted bytes at the application layer)
  icalUrl: v.optional(v.bytes()),
  // For provider="native" — the on-device calendar id from expo-calendar
  localCalendarId: v.optional(v.string()),
  // For provider="google" / "microsoft" — OAuth scope granted
  scope: v.optional(v.string()),
  // For provider="google" / "microsoft" — the OAuth client_id that issued the tokens.
  // Refresh-token exchange must be made against the same client, so it's persisted here.
  oauthClientId: v.optional(v.string()),
  // Encrypted JSON blob: { accessToken, refreshToken, tokenType }
  // Encryption: AES-256-GCM with key from CALENDAR_ENCRYPTION_KEY env var.
  // Layout: [12-byte IV][16-byte auth tag][ciphertext]. Decrypted only in Node actions.
  encryptedTokens: v.optional(v.bytes()),
  // Unix ms — when the access token expires
  tokenExpiresAt: v.optional(v.number()),
  // Optimistic-lock nonce written atomically with each token refresh so that
  // concurrent refreshes are serialised: only the first writer wins.
  refreshNonce: v.optional(v.string()),
  // Sync metadata
  lastSyncedAt: v.optional(v.number()),
  lastSyncError: v.optional(v.string()),
  createdAt: v.number(),
  // Hex colour assigned to this connection, e.g. "#6366f1"
  color: v.string(),
  // Incremented on each sync failure; reset to 0 on success. UI shows a badge when > 3.
  syncErrorCount: v.number(),
  // ETag from the last successful iCal feed fetch — used for conditional HTTP requests.
  icalEtag: v.optional(v.string()),
  // Last-Modified header from the last successful iCal fetch — used for conditional HTTP requests.
  icalLastModified: v.optional(v.string()),
  // SHA-256 hex of the normalised iCal URL — used to dedupe iCal subscriptions per user.
  icalUrlHash: v.optional(v.string()),
};

export const CalendarSubCalendar = {
  connectionId: v.id("calendarConnections"),
  // Provider's identifier for this sub-calendar
  externalId: v.string(),
  label: v.string(),
  // Controls future visibility to other CrewCircle users (does not affect the owner's diary)
  showAsBusy: v.boolean(),
  color: v.optional(v.string()),
};

export const CalendarEvent = {
  userId: v.id("users"),
  connectionId: v.id("calendarConnections"),
  // Foreign key to the sub-calendar row this event belongs to
  subCalendarId: v.id("calendarSubCalendars"),
  // Composite stable identifier: `${subCalendarId}::${providerEventId}` when a
  // sub-calendar applies, else the raw provider event id. Ensures uniqueness
  // across sub-calendars of the same connection.
  externalId: v.string(),
  // Original VEVENT UID (or provider event id), shared across every expanded
  // instance of a recurring event. `externalId` carries a recurrence suffix
  // for instances; `uid` lets callers group instances back to their seed.
  uid: v.optional(v.string()),
  // Epoch ms of the recurrence-id this row represents — set on every expanded
  // instance of an RRULE/RDATE event (including RECURRENCE-ID overrides),
  // unset for non-recurring events.
  recurrenceId: v.optional(v.number()),
  title: v.string(),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  // Unix ms, UTC. For all-day events these are UTC-midnight bookends and
  // exist only to keep `byUserStartsAt` usable for range queries — display
  // code must read `startDate`/`endDate` instead so timezone changes don't
  // shift the rendered day.
  startsAt: v.number(),
  endsAt: v.number(),
  isAllDay: v.boolean(),
  // Set when isAllDay=true. Date-valued, format "yyyy-MM-dd". endDate is
  // the inclusive last day (unlike provider APIs which use an exclusive end).
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  // IANA timezone for timed events when the provider supplies one
  // (Google start.timeZone, Microsoft start.timeZone, iCal TZID).
  originalTimezone: v.optional(v.string()),
  updatedAt: v.number(),
};

export const calendarsSchema = {
  calendarConnections: defineTable(CalendarConnection).index("byUser", ["userId"]),
  calendarSubCalendars: defineTable(CalendarSubCalendar).index("byConnection", ["connectionId"]),
  calendarEvents: defineTable(CalendarEvent)
    .index("byConnection", ["connectionId"])
    .index("byConnectionExternal", ["connectionId", "externalId"])
    .index("bySubCalendar", ["subCalendarId"])
    .index("byUserStartsAt", ["userId", "startsAt"])
    // Overlap queries lead with endsAt so we can fetch every event that
    // hasn't ended by the window start in a single bounded scan, then
    // filter on startsAt in memory. Avoids an open-ended startsAt scan
    // when looking for events that began before the window.
    .index("byUserEndsAt", ["userId", "endsAt"]),
};
