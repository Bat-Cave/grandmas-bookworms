import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    const account = await ctx.db.get(args.accountId);
    if (!account || account.ownerId !== identity.subject) return [];
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
    const participant = await ctx.db.get(args.participantId);
    if (!participant) return null;
    const account = await ctx.db.get(participant.accountId);
    if (!account || account.ownerId !== identity.subject) return null;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const account = await ctx.db.get(args.accountId);
    if (!account || account.ownerId !== identity.subject)
      throw new Error("Forbidden");
    if (account.type !== "family") throw new Error("Only family accounts can add members");
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const account = await ctx.db.get(args.accountId);
    if (!account || account.ownerId !== identity.subject)
      throw new Error("Forbidden");
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_account_and_role", (q) =>
        q.eq("accountId", args.accountId).eq("role", "owner")
      )
      .first();
    if (existing) throw new Error("Owner participant already exists");
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const account = await ctx.db.get(participant.accountId);
    if (!account || account.ownerId !== identity.subject)
      throw new Error("Forbidden");
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");
    const account = await ctx.db.get(participant.accountId);
    if (!account || account.ownerId !== identity.subject)
      throw new Error("Forbidden");
    if (!account.parentPasscodeHash) throw new Error("Parent passcode not set");
    if (account.parentPasscodeHash !== (await hashValue(args.parentPasscode)))
      throw new Error("Incorrect passcode");
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
    const participant = await ctx.db.get(args.participantId);
    if (!participant) return false;
    const account = await ctx.db.get(participant.accountId);
    if (!account || account.ownerId !== identity.subject) return false;
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
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
    if (!account) return [];
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
    return await ctx.db.query("participants").collect();
  },
});

/** Message recipients based on admin rules. */
export const listMessageRecipients = query({
  args: {},
  returns: v.array(participantDocValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
    if (!account) return [];
    if (account.isAdmin) {
      return await ctx.db.query("participants").collect();
    }
    const adminAccounts = await ctx.db
      .query("accounts")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .collect();
    if (adminAccounts.length === 0) return [];
    const adminAccountIds = new Set(adminAccounts.map((a) => a._id));
    const allParticipants = await ctx.db.query("participants").collect();
    return allParticipants.filter((p) => adminAccountIds.has(p.accountId));
  },
});
