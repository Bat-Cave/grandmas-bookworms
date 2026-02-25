import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAccountForOwnerId,
  requireActiveMembershipByOwnerId,
  requireIdentity,
} from "./lib/authz";

const hashValue = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const getMyAccount = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("accounts"),
      _creationTime: v.number(),
      ownerId: v.string(),
      organizationId: v.optional(v.id("organizations")),
      type: v.union(v.literal("individual"), v.literal("family")),
      displayName: v.string(),
      isAdmin: v.boolean(),
      hasParentPasscode: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const account = await getAccountForOwnerId(ctx, identity.subject);
    if (!account) return null;
    return {
      _id: account._id,
      _creationTime: account._creationTime,
      ownerId: account.ownerId,
      organizationId: account.organizationId,
      type: account.type,
      displayName: account.displayName,
      isAdmin: account.isAdmin ?? false,
      hasParentPasscode: Boolean(account.parentPasscodeHash),
    };
  },
});

export const createAccount = mutation({
  args: {
    type: v.union(v.literal("individual"), v.literal("family")),
    displayName: v.string(),
    parentPasscode: v.optional(v.string()),
  },
  returns: v.id("accounts"),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { membership } = await requireActiveMembershipByOwnerId(
      ctx,
      identity.subject
    );
    const existing = await getAccountForOwnerId(ctx, identity.subject);
    if (existing) throw new Error("ACCOUNT_ALREADY_EXISTS");
    return await ctx.db.insert("accounts", {
      ownerId: identity.subject,
      organizationId: membership.organizationId,
      type: args.type,
      displayName: args.displayName,
      isAdmin: false,
      parentPasscodeHash: args.parentPasscode
        ? await hashValue(args.parentPasscode)
        : undefined,
    });
  },
});

export const updateAccount = mutation({
  args: {
    accountId: v.id("accounts"),
    displayName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account || account.ownerId !== identity.subject)
      throw new Error("FORBIDDEN");
    const updates: { displayName?: string } = {};
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (Object.keys(updates).length > 0)
      await ctx.db.patch(args.accountId, updates);
    return null;
  },
});

export const setParentPasscode = mutation({
  args: {
    accountId: v.id("accounts"),
    parentPasscode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account || account.ownerId !== identity.subject)
      throw new Error("FORBIDDEN");
    await ctx.db.patch(args.accountId, {
      parentPasscodeHash: await hashValue(args.parentPasscode),
    });
    return null;
  },
});

export const verifyParentPasscode = mutation({
  args: { passcode: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const account = await getAccountForOwnerId(ctx, identity.subject);
    if (!account || !account.parentPasscodeHash) return false;
    return account.parentPasscodeHash === (await hashValue(args.passcode));
  },
});
