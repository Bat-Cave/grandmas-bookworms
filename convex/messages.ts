import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { evaluateBadges } from "./badges/evaluate";

const formatParticipantName = (
  p: { firstName?: string; lastName?: string } | null | undefined
) => {
  if (!p) return "Unknown";
  const first = p.firstName ?? "";
  const last = p.lastName ?? "";
  const fullName = `${first} ${last}`.trim();
  return fullName || "Unknown";
};

export const sendMessage = mutation({
  args: {
    recipientId: v.id("participants"),
    senderId: v.id("participants"),
    body: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const senderAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
    if (!senderAccount) throw new Error("No account");
    const senderParticipant = await ctx.db.get(args.senderId);
    if (!senderParticipant) throw new Error("Sender not found");
    if (senderParticipant.accountId !== senderAccount._id)
      throw new Error("Forbidden");
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("Recipient not found");
    if (!senderAccount.isAdmin) {
      const recipientAccount = await ctx.db.get(recipient.accountId);
      if (!recipientAccount?.isAdmin) {
        throw new Error("Forbidden");
      }
    }
    const messageId = await ctx.db.insert("messages", {
      senderId: senderParticipant._id,
      recipientId: args.recipientId,
      body: args.body.trim(),
    });
    await evaluateBadges(ctx, senderParticipant._id);
    return messageId;
  },
});

export const listReceived = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      senderId: v.id("participants"),
      recipientId: v.id("participants"),
      body: v.string(),
      senderName: v.string(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
    if (!account) return [];
    const myParticipants = await ctx.db
      .query("participants")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    const myIds = new Set(myParticipants.map((p) => p._id));
    const all = await ctx.db.query("messages").collect();
    const received = all.filter((m) => myIds.has(m.recipientId));
    const withSenderNames = await Promise.all(
      received.map(async (m) => {
        const sender = await ctx.db.get(m.senderId);
        return {
          ...m,
          senderName: formatParticipantName(sender ?? undefined),
        };
      })
    );
    withSenderNames.sort((a, b) => b._creationTime - a._creationTime);
    return withSenderNames;
  },
});

export const listSent = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      senderId: v.id("participants"),
      recipientId: v.id("participants"),
      body: v.string(),
      recipientName: v.string(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
    if (!account) return [];
    const myParticipants = await ctx.db
      .query("participants")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    const myIds = new Set(myParticipants.map((p) => p._id));
    const all = await ctx.db.query("messages").collect();
    const sent = all.filter((m) => myIds.has(m.senderId));
    const withRecipientNames = await Promise.all(
      sent.map(async (m) => {
        const recipient = await ctx.db.get(m.recipientId);
        return {
          ...m,
          recipientName: formatParticipantName(recipient ?? undefined),
        };
      })
    );
    withRecipientNames.sort((a, b) => b._creationTime - a._creationTime);
    return withRecipientNames;
  },
});
