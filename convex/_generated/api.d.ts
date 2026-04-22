/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as users_db_getUser from "../users/db/getUser.js";
import type * as users_db_upsertUser from "../users/db/upsertUser.js";
import type * as users_domain_syncUser from "../users/domain/syncUser.js";
import type * as users_domain_upsertCurrentUser from "../users/domain/upsertCurrentUser.js";
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
  http: typeof http;
  "users/db/getUser": typeof users_db_getUser;
  "users/db/upsertUser": typeof users_db_upsertUser;
  "users/domain/syncUser": typeof users_domain_syncUser;
  "users/domain/upsertCurrentUser": typeof users_domain_upsertCurrentUser;
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
