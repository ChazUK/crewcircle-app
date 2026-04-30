import { defineTable } from "convex/server";
import { v } from "convex/values";

export const CalendarProvider = v.union(
  v.literal("google"),
  v.literal("apple"),
  v.literal("outlook"),
  v.literal("ical"),
);

export const CalendarConnection = {
  userId: v.id("users"),
  provider: CalendarProvider,
  // User-facing label, e.g. "work@example.com" or "Family iCloud"
  label: v.string(),
  // Provider-side identifier (Google email/sub, Outlook UPN, Apple localCalendarId, etc.)
  externalAccountId: v.optional(v.string()),
  // For provider="ical" — the subscription URL
  icalUrl: v.optional(v.string()),
  // For provider="apple" — the on-device calendar id from expo-calendar
  localCalendarId: v.optional(v.string()),
  // For provider="google" / "outlook" — OAuth scope granted
  scope: v.optional(v.string()),
  // For provider="google" / "outlook" — the OAuth client_id that issued the tokens.
  // Refresh-token exchange must be made against the same client, so it's persisted here.
  oauthClientId: v.optional(v.string()),
  // Encrypted JSON blob: { accessToken, refreshToken, tokenType }
  // Encryption: AES-256-GCM with key from CALENDAR_ENCRYPTION_KEY env var.
  // Layout: [12-byte IV][16-byte auth tag][ciphertext]. Decrypted only in Node actions.
  encryptedTokens: v.optional(v.bytes()),
  // Unix ms — when the access token expires
  tokenExpiresAt: v.optional(v.number()),
  // IDs of sub-calendars within this account to actively sync.
  // - Google: calendar ids from /calendarList (e.g. "primary", "xxx@group.calendar.google.com")
  // - Apple: device localCalendarIds from expo-calendar
  // - iCal: not applicable (the feed URL is opaque)
  enabledSubCalendarIds: v.optional(v.array(v.string())),
  // Optimistic-lock nonce written atomically with each token refresh so that
  // concurrent refreshes are serialised: only the first writer wins.
  refreshNonce: v.optional(v.string()),
  // Sync metadata
  lastSyncedAt: v.optional(v.number()),
  lastSyncError: v.optional(v.string()),
  createdAt: v.number(),
};

export const CalendarEvent = {
  userId: v.id("users"),
  connectionId: v.id("calendarConnections"),
  // Which sub-calendar this event came from. Empty/undefined for iCal feeds.
  subCalendarId: v.optional(v.string()),
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
  // Unix ms, UTC
  startsAt: v.number(),
  endsAt: v.number(),
  isAllDay: v.boolean(),
  // RFC 5545 floating time: wall-clock stored verbatim as UTC ms. Clients must
  // display UTC components rather than converting to local time.
  isFloating: v.optional(v.boolean()),
  updatedAt: v.number(),
};

export const calendarsSchema = {
  calendarConnections: defineTable(CalendarConnection).index("byUser", ["userId"]),
  calendarEvents: defineTable(CalendarEvent)
    .index("byConnection", ["connectionId"])
    .index("byConnectionExternal", ["connectionId", "externalId"])
    .index("byUserStartsAt", ["userId", "startsAt"]),
};
