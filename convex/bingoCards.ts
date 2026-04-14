import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAgeGroupFromBirthday } from "./ageGroup";
import { ensureDefaultActivitiesForOrganization } from "./baseActivities";
import { requireMyAccountWithOrganization } from "./lib/authz";

const FREE_POSITION = 12; // center of 5x5 (row 2, col 2)
const PERIOD_KEY = "current"; // could be "2025-02" or "summer-2025" later

function shuffle<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const getOrCreateForParticipant = mutation({
  args: { participantId: v.id("participants") },
  returns: v.id("bingoCards"),
  handler: async (ctx, args) => {
    const myAccount = await requireMyAccountWithOrganization(ctx);
    const organizationId = myAccount.organizationId;
    if (!organizationId) throw new Error("MEMBERSHIP_REQUIRED");
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

    const existing = await ctx.db
      .query("bingoCards")
      .withIndex("by_participant_and_period", (q) =>
        q.eq("participantId", args.participantId).eq("periodKey", PERIOD_KEY)
      )
      .unique();
    if (existing) return existing._id;

    await ensureDefaultActivitiesForOrganization(ctx, organizationId);
    const activities = await ctx.db
      .query("baseActivities")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();
    const participantAgeGroup = getAgeGroupFromBirthday(participant.birthday);
    const eligible = activities.filter((a) => {
      if (a.ageGroup === "All") return true;
      const groups = a.ageGroup.split(",").map((s) => s.trim());
      return groups.includes(participantAgeGroup);
    });
    if (eligible.length < 24)
      throw new Error("INSUFFICIENT_ACTIVITIES_FOR_AGE_GROUP");

    const picked = shuffle(eligible).slice(0, 24);
    const cardId = await ctx.db.insert("bingoCards", {
      participantId: args.participantId,
      periodKey: PERIOD_KEY,
    });

    let activityIndex = 0;
    for (let pos = 0; pos < 25; pos++) {
      const baseActivityId =
        pos === FREE_POSITION ? undefined : picked[activityIndex++]!._id;
      await ctx.db.insert("bingoSquares", {
        bingoCardId: cardId,
        position: pos,
        baseActivityId,
        activityName:
          pos === FREE_POSITION ? "FREE" : picked[activityIndex - 1]?.name,
        activityDescription:
          pos === FREE_POSITION
            ? "This center square is already free."
            : picked[activityIndex - 1]?.description,
        raffleValue:
          pos === FREE_POSITION ? 0 : picked[activityIndex - 1]?.raffleValue,
      });
    }
    return cardId;
  },
});

export const getCardForParticipant = query({
  args: { participantId: v.id("participants") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("bingoCards"),
      _creationTime: v.number(),
      participantId: v.id("participants"),
      periodKey: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const myAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
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
    return await ctx.db
      .query("bingoCards")
      .withIndex("by_participant_and_period", (q) =>
        q.eq("participantId", args.participantId).eq("periodKey", PERIOD_KEY)
      )
      .unique();
  },
});

export const getCardWithSquares = query({
  args: { bingoCardId: v.id("bingoCards") },
  returns: v.union(
    v.null(),
    v.object({
      card: v.object({
        _id: v.id("bingoCards"),
        _creationTime: v.number(),
        participantId: v.id("participants"),
        periodKey: v.string(),
      }),
      squares: v.array(
        v.object({
          _id: v.id("bingoSquares"),
          position: v.number(),
          baseActivityId: v.optional(v.id("baseActivities")),
          activityDescription: v.union(v.string(), v.null()),
          activityName: v.union(v.string(), v.null()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const myAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
    if (!myAccount?.organizationId) return null;
    const card = await ctx.db.get(args.bingoCardId);
    if (!card) return null;
    const participant = await ctx.db.get(card.participantId);
    if (!participant) return null;
    const account = await ctx.db.get(participant.accountId);
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return null;
    }

    const squares = await ctx.db
      .query("bingoSquares")
      .withIndex("by_card", (q) => q.eq("bingoCardId", args.bingoCardId))
      .collect();

    const squaresWithNames = await Promise.all(
      squares.map(async (s) => {
        const activityName = s.baseActivityId
          ? s.activityName ?? (await ctx.db.get(s.baseActivityId))?.name ?? null
          : "FREE";
        const activityDescription = s.baseActivityId
          ? s.activityDescription ??
            (await ctx.db.get(s.baseActivityId))?.description ??
            null
          : s.activityDescription ?? "This center square is already free.";
        return {
          _id: s._id,
          position: s.position,
          baseActivityId: s.baseActivityId,
          activityDescription,
          activityName,
        };
      })
    );
    squaresWithNames.sort((a, b) => a.position - b.position);
    return { card, squares: squaresWithNames };
  },
});
