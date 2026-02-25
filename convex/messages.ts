import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { evaluateBadges } from "./badges/evaluate";
import {
  getAccountForOwnerId,
  getActiveMembershipByOwnerId,
  requireIdentity,
} from "./lib/authz";

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
    const identity = await requireIdentity(ctx);
    const senderAccount = await getAccountForOwnerId(ctx, identity.subject);
    if (!senderAccount) throw new Error("NO_ACCOUNT");
    const senderMembership = await getActiveMembershipByOwnerId(
      ctx,
      identity.subject,
    );
    if (!senderMembership) throw new Error("MEMBERSHIP_REQUIRED");
    const senderParticipant = await ctx.db.get(args.senderId);
    if (!senderParticipant) throw new Error("SENDER_NOT_FOUND");
    if (senderParticipant.accountId !== senderAccount._id)
      throw new Error("FORBIDDEN");
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new Error("RECIPIENT_NOT_FOUND");
    const recipientAccount = await ctx.db.get(recipient.accountId);
    if (!recipientAccount) {
      throw new Error("ORG_MISMATCH");
    }
    const recipientMembership = await getActiveMembershipByOwnerId(
      ctx,
      recipientAccount.ownerId,
    );
    if (!recipientMembership) {
      throw new Error("ORG_MISMATCH");
    }
    if (
      recipientMembership.organizationId !== senderMembership.organizationId
    ) {
      throw new Error("ORG_MISMATCH");
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
    const account = await getAccountForOwnerId(ctx, identity.subject);
    if (!account) return [];
    const membership = await getActiveMembershipByOwnerId(ctx, identity.subject);
    if (!membership) return [];
    const myParticipants = await ctx.db
      .query("participants")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    const myIds = new Set(myParticipants.map((p) => p._id));
    const orgMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", membership.organizationId))
      .collect();
    const activeOwnerIds = new Set(
      orgMemberships.filter((m) => m.status === "active").map((m) => m.ownerId),
    );
    const orgAccountIds = new Set(
      (await ctx.db.query("accounts").collect())
        .filter((a) => activeOwnerIds.has(a.ownerId))
        .map((a) => a._id),
    );
    const all = await ctx.db.query("messages").collect();
    const received = all.filter((m) => myIds.has(m.recipientId));
    const scopedReceived = [];
    for (const message of received) {
      const sender = await ctx.db.get(message.senderId);
      if (!sender || !orgAccountIds.has(sender.accountId)) continue;
      scopedReceived.push(message);
    }
    const withSenderNames = await Promise.all(
      scopedReceived.map(async (m) => {
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
    const account = await getAccountForOwnerId(ctx, identity.subject);
    if (!account) return [];
    const membership = await getActiveMembershipByOwnerId(ctx, identity.subject);
    if (!membership) return [];
    const myParticipants = await ctx.db
      .query("participants")
      .withIndex("by_account", (q) => q.eq("accountId", account._id))
      .collect();
    const myIds = new Set(myParticipants.map((p) => p._id));
    const orgMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", membership.organizationId))
      .collect();
    const activeOwnerIds = new Set(
      orgMemberships.filter((m) => m.status === "active").map((m) => m.ownerId),
    );
    const orgAccountIds = new Set(
      (await ctx.db.query("accounts").collect())
        .filter((a) => activeOwnerIds.has(a.ownerId))
        .map((a) => a._id),
    );
    const all = await ctx.db.query("messages").collect();
    const sent = all.filter((m) => myIds.has(m.senderId));
    const scopedSent = [];
    for (const message of sent) {
      const recipient = await ctx.db.get(message.recipientId);
      if (!recipient || !orgAccountIds.has(recipient.accountId)) continue;
      scopedSent.push(message);
    }
    const withRecipientNames = await Promise.all(
      scopedSent.map(async (m) => {
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
