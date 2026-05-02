export type IncomingEvent = {
  externalId: string;
  subCalendarId?: string;
  uid?: string;
  recurrenceId?: number;
  title: string;
  description?: string;
  location?: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
  originalTimezone?: string;
};

export type SubCalendar = {
  id: string;
  label: string;
  primary: boolean;
  hint?: string;
};

export type CalendarProviderCapabilities = {
  serverSidePullable: boolean;
  writable: boolean;
  hasSubCalendars: boolean;
};

export type SyncWindow = {
  windowStartMs: number;
  windowEndMs: number;
};

export type SyncError =
  | { kind: "network"; message: string }
  | { kind: "auth"; message: string }
  | { kind: "parse"; message: string }
  | { kind: "unknown"; message: string };

export type WriteError =
  | { kind: "not_supported"; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "insufficient_scope"; message: string }
  | { kind: "unknown"; message: string };

export type WriteSuccess = { externalId: string };

export type CalendarConnectParams =
  | {
      provider: "google";
      authCode: string;
      codeVerifier: string;
      clientId: string;
      redirectUri: string;
      label: string;
    }
  | {
      provider: "microsoft";
      authCode: string;
      codeVerifier: string;
      clientId: string;
      redirectUri: string;
      label: string;
    }
  | {
      provider: "ical";
      url: string;
      label: string;
    }
  | {
      provider: "native";
      deviceCalendarId: string;
      label: string;
    };

export type CalendarConnectContext = {
  userId: string;
  color: string;
};

// Provider-discovered fields for a Calendar Connection. Excludes
// service-owned fields (userId, provider, label, color, createdAt,
// syncErrorCount) which the service supplies. Optional throughout —
// providers populate only what they discovered (e.g. iCal sets icalUrl;
// Google sets oauth tokens; Native sets localCalendarId).
export type CalendarConnectionBlueprint = {
  externalAccountId?: string;
  icalUrl?: string;
  localCalendarId?: string;
  scope?: string;
  oauthClientId?: string;
  encryptedTokens?: Uint8Array;
  tokenExpiresAt?: number;
};

// A Sub-Calendar to insert alongside the connection. iCal returns one
// synthetic entry (its feeds are opaque single-source); Google/Microsoft
// return discovered sub-calendars; Native returns the selected device
// calendar.
export type SubCalendarBlueprint = {
  externalId: string;
  label: string;
  showAsBusy: boolean;
};

// What provider.connect returns: the full state needed to install a
// usable Calendar Connection. The service inserts connection +
// sub-calendars in a single atomic mutation, so a partial install is
// unrepresentable.
export type CalendarConnectResult = {
  connection: CalendarConnectionBlueprint;
  subCalendars: SubCalendarBlueprint[];
};

export interface CalendarProvider<TCtx = unknown, TConn = unknown> {
  capabilities: CalendarProviderCapabilities;
  connect(
    ctx: TCtx,
    params: CalendarConnectParams,
    context: CalendarConnectContext,
  ): Promise<CalendarConnectResult>;
  fetchEvents?(ctx: TCtx, connection: TConn, window: SyncWindow): Promise<IncomingEvent[]>;
  writeEvent?(
    ctx: TCtx,
    connection: TConn,
    event: IncomingEvent,
  ): Promise<WriteSuccess | WriteError>;
  listSubCalendars?(ctx: TCtx, connection: TConn): Promise<SubCalendar[]>;
}

export type CalendarProviderRegistry = {
  google: CalendarProvider;
  ical: CalendarProvider;
  microsoft: CalendarProvider;
  native: CalendarProvider;
};
