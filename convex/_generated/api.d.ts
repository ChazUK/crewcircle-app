/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as calendars_actionHelpers from "../calendars/actionHelpers.js";
import type * as calendars_actions from "../calendars/actions.js";
import type * as calendars_db_cascadeDelete from "../calendars/db/cascadeDelete.js";
import type * as calendars_db_getConnection from "../calendars/db/getConnection.js";
import type * as calendars_db_writeEvents from "../calendars/db/writeEvents.js";
import type * as calendars_domain_crypto from "../calendars/domain/crypto.js";
import type * as calendars_domain_googleEvents from "../calendars/domain/googleEvents.js";
import type * as calendars_domain_icalUrl from "../calendars/domain/icalUrl.js";
import type * as calendars_domain_parseIcs from "../calendars/domain/parseIcs.js";
import type * as calendars_google from "../calendars/google.js";
import type * as calendars_mutations from "../calendars/mutations.js";
import type * as calendars_queries from "../calendars/queries.js";
import type * as calendars_scheduler from "../calendars/scheduler.js";
import type * as crons from "../crons.js";
import type * as files_mutations from "../files/mutations.js";
import type * as http from "../http.js";
import type * as users_db_getUser from "../users/db/getUser.js";
import type * as users_db_upsertUser from "../users/db/upsertUser.js";
import type * as users_domain_syncUser from "../users/domain/syncUser.js";
import type * as users_domain_upsertCurrentUser from "../users/domain/upsertCurrentUser.js";
import type * as users_domain_urlValidation from "../users/domain/urlValidation.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as users_webhooks from "../users/webhooks.js";
import type * as webhooks_clerk_handler from "../webhooks/clerk/handler.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "calendars/actionHelpers": typeof calendars_actionHelpers;
  "calendars/actions": typeof calendars_actions;
  "calendars/db/cascadeDelete": typeof calendars_db_cascadeDelete;
  "calendars/db/getConnection": typeof calendars_db_getConnection;
  "calendars/db/writeEvents": typeof calendars_db_writeEvents;
  "calendars/domain/crypto": typeof calendars_domain_crypto;
  "calendars/domain/googleEvents": typeof calendars_domain_googleEvents;
  "calendars/domain/icalUrl": typeof calendars_domain_icalUrl;
  "calendars/domain/parseIcs": typeof calendars_domain_parseIcs;
  "calendars/google": typeof calendars_google;
  "calendars/mutations": typeof calendars_mutations;
  "calendars/queries": typeof calendars_queries;
  "calendars/scheduler": typeof calendars_scheduler;
  crons: typeof crons;
  "files/mutations": typeof files_mutations;
  http: typeof http;
  "users/db/getUser": typeof users_db_getUser;
  "users/db/upsertUser": typeof users_db_upsertUser;
  "users/domain/syncUser": typeof users_domain_syncUser;
  "users/domain/upsertCurrentUser": typeof users_domain_upsertCurrentUser;
  "users/domain/urlValidation": typeof users_domain_urlValidation;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
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
