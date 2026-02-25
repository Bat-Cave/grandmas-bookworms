import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAccountForOwnerId,
  getActiveMembershipByOwnerId,
  requireMyAccountWithOrganization,
} from "./lib/authz";

const hashValue = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const participantDocValidator = v.object({
  _id: v.id("participants"),
  _creationTime: v.number(),
  accountId: v.id("accounts"),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  birthday: v.optional(v.string()),
  name: v.optional(v.string()),
  ageGroup: v.optional(v.string()),
  role: v.union(v.literal("owner"), v.literal("member")),
  avatarStorageId: v.optional(v.id("_storage")),
  unlockType: v.optional(v.union(v.literal("pin"), v.literal("emoji"))),
  unlockHash: v.optional(v.string()),
});

export const listByAccount = query({
  args: { accountId: v.id("accounts") },
  returns: v.array(participantDocValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const myAccount = await getAccountForOwnerId(ctx, identity.subject);
    if (!myAccount?.organizationId) return [];
    const account = await ctx.db.get(args.accountId);
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return [];
    }
    return await ctx.db
      .query("participants")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();
  },
});

export const getParticipant = query({
  args: { participantId: v.id("participants") },
  returns: v.union(participantDocValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const myAccount = await getAccountForOwnerId(ctx, identity.subject);
    if (!myAccount?.organizationId) return null;
    const participant = await ctx.db.get(args.participantId);
    if (!participant) return null;
    const account = await ctx.db.get(participant.accountId);
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return null;
    }
    return participant;
  },
});

export const addMember = mutation({
  args: {
    accountId: v.id("accounts"),
    firstName: v.string(),
    lastName: v.string(),
    birthday: v.string(),
    unlockType: v.optional(v.union(v.literal("pin"), v.literal("emoji"))),
    unlockValue: v.optional(v.string()),
  },
  returns: v.id("participants"),
  handler: async (ctx, args) => {
    const myAccount = await requireMyAccountWithOrganization(ctx);
    const account = await ctx.db.get(args.accountId);
    if (
      !account ||
      account.ownerId !== myAccount.ownerId ||
      account.organizationId !== myAccount.organizationId
    ) {
      throw new Error("FORBIDDEN");
    }
    if (account.type !== "family")
      throw new Error("ONLY_FAMILY_CAN_ADD_MEMBERS");
    return await ctx.db.insert("participants", {
      accountId: args.accountId,
      firstName: args.firstName,
      lastName: args.lastName,
      birthday: args.birthday,
      role: "member",
      unlockType: args.unlockType,
      unlockHash: args.unlockValue ? await hashValue(args.unlockValue) : undefined,
    });
  },
});

export const createOwnerParticipant = mutation({
  args: {
    accountId: v.id("accounts"),
    firstName: v.string(),
    lastName: v.string(),
    birthday: v.string(),
  },
  returns: v.id("participants"),
  handler: async (ctx, args) => {
    const myAccount = await requireMyAccountWithOrganization(ctx);
    const account = await ctx.db.get(args.accountId);
    if (
      !account ||
      account.ownerId !== myAccount.ownerId ||
      account.organizationId !== myAccount.organizationId
    ) {
      throw new Error("FORBIDDEN");
    }
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_account_and_role", (q) =>
        q.eq("accountId", args.accountId).eq("role", "owner")
      )
      .first();
    if (existing) throw new Error("OWNER_PARTICIPANT_ALREADY_EXISTS");
    return await ctx.db.insert("participants", {
      accountId: args.accountId,
      firstName: args.firstName,
      lastName: args.lastName,
      birthday: args.birthday,
      role: "owner",
    });
  },
});

export const updateParticipant = mutation({
  args: {
    participantId: v.id("participants"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    birthday: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myAccount = await requireMyAccountWithOrganization(ctx);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("PARTICIPANT_NOT_FOUND");
    const account = await ctx.db.get(participant.accountId);
    if (
      !account ||
      account.ownerId !== myAccount.ownerId ||
      account.organizationId !== myAccount.organizationId
    ) {
      throw new Error("FORBIDDEN");
    }
    const updates: {
      firstName?: string;
      lastName?: string;
      birthday?: string;
    } = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.birthday !== undefined) updates.birthday = args.birthday;
    if (Object.keys(updates).length > 0)
      await ctx.db.patch(args.participantId, updates);
    return null;
  },
});

export const setParticipantUnlock = mutation({
  args: {
    participantId: v.id("participants"),
    parentPasscode: v.string(),
    unlockType: v.union(v.literal("pin"), v.literal("emoji")),
    unlockValue: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myAccount = await requireMyAccountWithOrganization(ctx);
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("PARTICIPANT_NOT_FOUND");
    const account = await ctx.db.get(participant.accountId);
    if (
      !account ||
      account.ownerId !== myAccount.ownerId ||
      account.organizationId !== myAccount.organizationId
    ) {
      throw new Error("FORBIDDEN");
    }
    if (!account.parentPasscodeHash) throw new Error("PARENT_PASSCODE_NOT_SET");
    if (account.parentPasscodeHash !== (await hashValue(args.parentPasscode)))
      throw new Error("INCORRECT_PARENT_PASSCODE");
    await ctx.db.patch(args.participantId, {
      unlockType: args.unlockType,
      unlockHash: await hashValue(args.unlockValue),
    });
    return null;
  },
});

export const verifyUnlock = mutation({
  args: {
    participantId: v.id("participants"),
    unlockValue: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const myAccount = await getAccountForOwnerId(ctx, identity.subject);
    if (!myAccount?.organizationId) return false;
    const participant = await ctx.db.get(args.participantId);
    if (!participant) return false;
    const account = await ctx.db.get(participant.accountId);
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return false;
    }
    if (!participant.unlockHash) return false;
    return participant.unlockHash === (await hashValue(args.unlockValue));
  },
});

export const listMyParticipants = query({
  args: {},
  returns: v.array(participantDocValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const account = await getAccountForOwnerId(ctx, identity.subject);
    if (!account?.organizationId) return [];
    return await ctx.db
      .query("participants")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
  },
});

/** All participants in the club (for message recipient picker, etc.). */
export const listClubParticipants = query({
  args: {},
  returns: v.array(participantDocValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const membership = await getActiveMembershipByOwnerId(ctx, identity.subject);
    if (!membership) return [];
    const orgMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", membership.organizationId))
      .collect();
    const activeOwnerIds = new Set(
      orgMemberships.filter((m) => m.status === "active").map((m) => m.ownerId),
    );
    const orgAccounts = (await ctx.db.query("accounts").collect()).filter((a) =>
      activeOwnerIds.has(a.ownerId),
    );
    const orgAccountIds = new Set(orgAccounts.map((a) => a._id));
    const participants = await ctx.db.query("participants").collect();
    return participants.filter((p) => orgAccountIds.has(p.accountId));
  },
});

/** Message recipients are participants in the same organization. */
export const listMessageRecipients = query({
  args: {},
  returns: v.array(participantDocValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const membership = await getActiveMembershipByOwnerId(ctx, identity.subject);
    if (!membership) return [];
    const orgMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", membership.organizationId))
      .collect();
    const activeOwnerIds = new Set(
      orgMemberships.filter((m) => m.status === "active").map((m) => m.ownerId),
    );
    const orgAccounts = (await ctx.db.query("accounts").collect()).filter((a) =>
      activeOwnerIds.has(a.ownerId),
    );
    if (orgAccounts.length === 0) return [];
    const orgAccountIds = new Set(orgAccounts.map((a) => a._id));
    const allParticipants = await ctx.db.query("participants").collect();
    return allParticipants.filter((p) => orgAccountIds.has(p.accountId));
  },
});
