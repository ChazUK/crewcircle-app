/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calendars_actions from "../calendars/actions.js";
import type * as calendars_auth_getConnectionForOwner from "../calendars/auth/getConnectionForOwner.js";
import type * as calendars_auth_requireOwnedConnection from "../calendars/auth/requireOwnedConnection.js";
import type * as calendars_db_cascadeDelete from "../calendars/db/cascadeDelete.js";
import type * as calendars_db_getConnectionInternal from "../calendars/db/getConnectionInternal.js";
import type * as calendars_db_getSubCalendarsForConnection from "../calendars/db/getSubCalendarsForConnection.js";
import type * as calendars_db_incrementSyncError from "../calendars/db/incrementSyncError.js";
import type * as calendars_db_insertCalendarConnection from "../calendars/db/insertCalendarConnection.js";
import type * as calendars_db_markConnectionSynced from "../calendars/db/markConnectionSynced.js";
import type * as calendars_db_refreshSubCalendarColors from "../calendars/db/refreshSubCalendarColors.js";
import type * as calendars_db_setEnabledSubCalendars from "../calendars/db/setEnabledSubCalendars.js";
import type * as calendars_db_updateICalMeta from "../calendars/db/updateICalMeta.js";
import type * as calendars_db_updateTokensIfNonce from "../calendars/db/updateTokensIfNonce.js";
import type * as calendars_db_writeEvents from "../calendars/db/writeEvents.js";
import type * as calendars_domain_assignPaletteColour from "../calendars/domain/assignPaletteColour.js";
import type * as calendars_domain_crypto from "../calendars/domain/crypto.js";
import type * as calendars_domain_expandRecurrence from "../calendars/domain/expandRecurrence.js";
import type * as calendars_domain_filterSubCalendars from "../calendars/domain/filterSubCalendars.js";
import type * as calendars_domain_getConnectionColoursForUser from "../calendars/domain/getConnectionColoursForUser.js";
import type * as calendars_domain_hashICalUrl from "../calendars/domain/hashICalUrl.js";
import type * as calendars_domain_isSecureUrl from "../calendars/domain/isSecureUrl.js";
import type * as calendars_domain_normalizeICalUrl from "../calendars/domain/normalizeICalUrl.js";
import type * as calendars_domain_validateICalUrl from "../calendars/domain/validateICalUrl.js";
import type * as calendars_providers_convertGoogleEvent from "../calendars/providers/convertGoogleEvent.js";
import type * as calendars_providers_convertICalEvent from "../calendars/providers/convertICalEvent.js";
import type * as calendars_providers_convertMicrosoftEvent from "../calendars/providers/convertMicrosoftEvent.js";
import type * as calendars_providers_google from "../calendars/providers/google.js";
import type * as calendars_providers_ical from "../calendars/providers/ical.js";
import type * as calendars_providers_microsoft from "../calendars/providers/microsoft.js";
import type * as calendars_providers_native from "../calendars/providers/native.js";
import type * as calendars_providers_parseGraphDateTimeAsUtc from "../calendars/providers/parseGraphDateTimeAsUtc.js";
import type * as calendars_providers_previousDay from "../calendars/providers/previousDay.js";
import type * as calendars_queries from "../calendars/queries.js";
import type * as calendars_scheduler from "../calendars/scheduler.js";
import type * as calendars_service_index from "../calendars/service/index.js";
import type * as calendars_service_registry from "../calendars/service/registry.js";
import type * as calendars_syncAfterConnect from "../calendars/syncAfterConnect.js";
import type * as calendars_syncWithRetry from "../calendars/syncWithRetry.js";
import type * as calendars_uploadNativeEvents from "../calendars/uploadNativeEvents.js";
import type * as crons from "../crons.js";
import type * as files_mutations from "../files/mutations.js";
import type * as http from "../http.js";
import type * as jobs_domain_generateIcs from "../jobs/domain/generateIcs.js";
import type * as jobs_http from "../jobs/http.js";
import type * as jobs_queries from "../jobs/queries.js";
import type * as lib_parseOrConvexError from "../lib/parseOrConvexError.js";
import type * as users_db_getUser from "../users/db/getUser.js";
import type * as users_db_upsertUser from "../users/db/upsertUser.js";
import type * as users_domain_syncUser from "../users/domain/syncUser.js";
import type * as users_domain_upsertCurrentUser from "../users/domain/upsertCurrentUser.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as users_syncVerifiedPhone from "../users/syncVerifiedPhone.js";
import type * as users_webhooks from "../users/webhooks.js";
import type * as webhooks_clerk_handler from "../webhooks/clerk/handler.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "calendars/actions": typeof calendars_actions;
  "calendars/auth/getConnectionForOwner": typeof calendars_auth_getConnectionForOwner;
  "calendars/auth/requireOwnedConnection": typeof calendars_auth_requireOwnedConnection;
  "calendars/db/cascadeDelete": typeof calendars_db_cascadeDelete;
  "calendars/db/getConnectionInternal": typeof calendars_db_getConnectionInternal;
  "calendars/db/getSubCalendarsForConnection": typeof calendars_db_getSubCalendarsForConnection;
  "calendars/db/incrementSyncError": typeof calendars_db_incrementSyncError;
  "calendars/db/insertCalendarConnection": typeof calendars_db_insertCalendarConnection;
  "calendars/db/markConnectionSynced": typeof calendars_db_markConnectionSynced;
  "calendars/db/refreshSubCalendarColors": typeof calendars_db_refreshSubCalendarColors;
  "calendars/db/setEnabledSubCalendars": typeof calendars_db_setEnabledSubCalendars;
  "calendars/db/updateICalMeta": typeof calendars_db_updateICalMeta;
  "calendars/db/updateTokensIfNonce": typeof calendars_db_updateTokensIfNonce;
  "calendars/db/writeEvents": typeof calendars_db_writeEvents;
  "calendars/domain/assignPaletteColour": typeof calendars_domain_assignPaletteColour;
  "calendars/domain/crypto": typeof calendars_domain_crypto;
  "calendars/domain/expandRecurrence": typeof calendars_domain_expandRecurrence;
  "calendars/domain/filterSubCalendars": typeof calendars_domain_filterSubCalendars;
  "calendars/domain/getConnectionColoursForUser": typeof calendars_domain_getConnectionColoursForUser;
  "calendars/domain/hashICalUrl": typeof calendars_domain_hashICalUrl;
  "calendars/domain/isSecureUrl": typeof calendars_domain_isSecureUrl;
  "calendars/domain/normalizeICalUrl": typeof calendars_domain_normalizeICalUrl;
  "calendars/domain/validateICalUrl": typeof calendars_domain_validateICalUrl;
  "calendars/providers/convertGoogleEvent": typeof calendars_providers_convertGoogleEvent;
  "calendars/providers/convertICalEvent": typeof calendars_providers_convertICalEvent;
  "calendars/providers/convertMicrosoftEvent": typeof calendars_providers_convertMicrosoftEvent;
  "calendars/providers/google": typeof calendars_providers_google;
  "calendars/providers/ical": typeof calendars_providers_ical;
  "calendars/providers/microsoft": typeof calendars_providers_microsoft;
  "calendars/providers/native": typeof calendars_providers_native;
  "calendars/providers/parseGraphDateTimeAsUtc": typeof calendars_providers_parseGraphDateTimeAsUtc;
  "calendars/providers/previousDay": typeof calendars_providers_previousDay;
  "calendars/queries": typeof calendars_queries;
  "calendars/scheduler": typeof calendars_scheduler;
  "calendars/service/index": typeof calendars_service_index;
  "calendars/service/registry": typeof calendars_service_registry;
  "calendars/syncAfterConnect": typeof calendars_syncAfterConnect;
  "calendars/syncWithRetry": typeof calendars_syncWithRetry;
  "calendars/uploadNativeEvents": typeof calendars_uploadNativeEvents;
  crons: typeof crons;
  "files/mutations": typeof files_mutations;
  http: typeof http;
  "jobs/domain/generateIcs": typeof jobs_domain_generateIcs;
  "jobs/http": typeof jobs_http;
  "jobs/queries": typeof jobs_queries;
  "lib/parseOrConvexError": typeof lib_parseOrConvexError;
  "users/db/getUser": typeof users_db_getUser;
  "users/db/upsertUser": typeof users_db_upsertUser;
  "users/domain/syncUser": typeof users_domain_syncUser;
  "users/domain/upsertCurrentUser": typeof users_domain_upsertCurrentUser;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  "users/syncVerifiedPhone": typeof users_syncVerifiedPhone;
  "users/webhooks": typeof users_webhooks;
  "webhooks/clerk/handler": typeof webhooks_clerk_handler;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
