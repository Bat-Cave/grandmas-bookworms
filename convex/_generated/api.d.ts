/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as activityCompletions from "../activityCompletions.js";
import type * as ageGroup from "../ageGroup.js";
import type * as badges_config from "../badges/config.js";
import type * as badges_evaluate from "../badges/evaluate.js";
import type * as baseActivities from "../baseActivities.js";
import type * as bingoCards from "../bingoCards.js";
import type * as lib_authz from "../lib/authz.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as myFunctions from "../myFunctions.js";
import type * as organizations from "../organizations.js";
import type * as participants from "../participants.js";
import type * as rewards from "../rewards.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  activityCompletions: typeof activityCompletions;
  ageGroup: typeof ageGroup;
  "badges/config": typeof badges_config;
  "badges/evaluate": typeof badges_evaluate;
  baseActivities: typeof baseActivities;
  bingoCards: typeof bingoCards;
  "lib/authz": typeof lib_authz;
  messages: typeof messages;
  migrations: typeof migrations;
  myFunctions: typeof myFunctions;
  organizations: typeof organizations;
  participants: typeof participants;
  rewards: typeof rewards;
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
