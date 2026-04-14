import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { evaluateBadges } from "./badges/evaluate";
import { requireMyAccountWithOrganization } from "./lib/authz";

const PERIOD_KEY = "current";

function getCompletedPositions(completedPositions: number[]): Set<number> {
  return new Set(completedPositions);
}

export const startActivity = mutation({
  args: {
    bingoSquareId: v.id("bingoSquares"),
    participantId: v.id("participants"),
    startedAt: v.number(),
  },
  returns: v.id("activityCompletions"),
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

    const square = await ctx.db.get(args.bingoSquareId);
    if (!square) throw new Error("SQUARE_NOT_FOUND");
    const card = await ctx.db.get(square.bingoCardId);
    if (!card || card.participantId !== args.participantId) {
      throw new Error("FORBIDDEN");
    }

    const existing = await ctx.db
      .query("activityCompletions")
      .withIndex("by_square", (q) => q.eq("bingoSquareId", args.bingoSquareId))
      .first();
    if (existing) throw new Error("ACTIVITY_ALREADY_STARTED");

    return await ctx.db.insert("activityCompletions", {
      bingoSquareId: args.bingoSquareId,
      participantId: args.participantId,
      startedAt: args.startedAt,
    });
  },
});

export const completeActivity = mutation({
  args: {
    completionId: v.id("activityCompletions"),
    completedAt: v.number(),
    formData: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myAccount = await requireMyAccountWithOrganization(ctx);
    const completion = await ctx.db.get(args.completionId);
    if (!completion) throw new Error("COMPLETION_NOT_FOUND");
    const participant = await ctx.db.get(completion.participantId);
    if (!participant) throw new Error("PARTICIPANT_NOT_FOUND");
    const account = await ctx.db.get(participant.accountId);
    if (
      !account ||
      account.ownerId !== myAccount.ownerId ||
      account.organizationId !== myAccount.organizationId
    ) {
      throw new Error("FORBIDDEN");
    }
    if (completion.completedAt) throw new Error("ALREADY_COMPLETED");

    const square = await ctx.db.get(completion.bingoSquareId);
    if (!square) return null;
    const card = await ctx.db.get(square.bingoCardId);
    if (!card) return null;
    if (card.participantId !== participant._id) throw new Error("FORBIDDEN");

    await ctx.db.patch(args.completionId, {
      completedAt: args.completedAt,
      formData: args.formData,
    });

    let raffleValue = 0;
    if (square.raffleValue !== undefined) {
      raffleValue = square.raffleValue;
    } else if (square.baseActivityId) {
      const activity = await ctx.db.get(square.baseActivityId);
      if (activity) raffleValue = activity.raffleValue;
    }

    const existingRaffle = await ctx.db
      .query("raffleTickets")
      .withIndex("by_participant_and_period", (q) =>
        q.eq("participantId", participant._id).eq("periodKey", PERIOD_KEY)
      )
      .unique();
    if (existingRaffle) {
      await ctx.db.patch(existingRaffle._id, {
        ticketCount: existingRaffle.ticketCount + raffleValue,
      });
    } else {
      await ctx.db.insert("raffleTickets", {
        participantId: participant._id,
        periodKey: PERIOD_KEY,
        ticketCount: raffleValue,
      });
    }

    const completionsForCard = await ctx.db
      .query("activityCompletions")
      .withIndex("by_participant", (q) => q.eq("participantId", participant._id))
      .collect();
    const completedSquares = completionsForCard.filter((c) => c.completedAt != null);
    const squareIds = new Set(completedSquares.map((c) => c.bingoSquareId));
    const allSquares = await ctx.db
      .query("bingoSquares")
      .withIndex("by_card", (q) => q.eq("bingoCardId", card._id))
      .collect();
    const completedPositions = getCompletedPositions(
      allSquares.filter((s) => squareIds.has(s._id)).map((s) => s.position)
    );
    const existingLines = await ctx.db
      .query("bingoLines")
      .withIndex("by_card", (q) => q.eq("bingoCardId", card._id))
      .collect();
    const existingKeys = new Set(
      existingLines.map((l) => `${l.lineType}-${l.lineIndex}`)
    );
    const addLineBonus = async () => {
      const rt = await ctx.db
        .query("raffleTickets")
        .withIndex("by_participant_and_period", (q) =>
          q.eq("participantId", participant._id).eq("periodKey", PERIOD_KEY)
        )
        .unique();
      if (rt) await ctx.db.patch(rt._id, { ticketCount: rt.ticketCount + 1 });
    };
    for (let i = 0; i < 5; i++) {
      if (existingKeys.has(`row-${i}`)) continue;
      let ok = true;
      for (let c = 0; c < 5; c++) if (!completedPositions.has(i * 5 + c)) ok = false;
      if (ok) {
        await ctx.db.insert("bingoLines", {
          bingoCardId: card._id,
          participantId: participant._id,
          lineType: "row",
          lineIndex: i,
          completedAt: args.completedAt,
        });
        await addLineBonus();
      }
    }
    for (let j = 0; j < 5; j++) {
      if (existingKeys.has(`column-${j}`)) continue;
      let ok = true;
      for (let r = 0; r < 5; r++) if (!completedPositions.has(r * 5 + j)) ok = false;
      if (ok) {
        await ctx.db.insert("bingoLines", {
          bingoCardId: card._id,
          participantId: participant._id,
          lineType: "column",
          lineIndex: j,
          completedAt: args.completedAt,
        });
        await addLineBonus();
      }
    }
    if (!existingKeys.has("diagonal-0")) {
      let ok = true;
      for (let i = 0; i < 5; i++) if (!completedPositions.has(i * 5 + i)) ok = false;
      if (ok) {
        await ctx.db.insert("bingoLines", {
          bingoCardId: card._id,
          participantId: participant._id,
          lineType: "diagonal",
          lineIndex: 0,
          completedAt: args.completedAt,
        });
        await addLineBonus();
      }
    }
    if (!existingKeys.has("diagonal-1")) {
      let ok = true;
      for (let i = 0; i < 5; i++) if (!completedPositions.has(i * 5 + (4 - i))) ok = false;
      if (ok) {
        await ctx.db.insert("bingoLines", {
          bingoCardId: card._id,
          participantId: participant._id,
          lineType: "diagonal",
          lineIndex: 1,
          completedAt: args.completedAt,
        });
        await addLineBonus();
      }
    }

    await evaluateBadges(ctx, participant._id, PERIOD_KEY);

    return null;
  },
});

export const getCompletionForSquare = query({
  args: { bingoSquareId: v.id("bingoSquares") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("activityCompletions"),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      participantId: v.id("participants"),
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
    const square = await ctx.db.get(args.bingoSquareId);
    if (!square) return null;
    const card = await ctx.db.get(square.bingoCardId);
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
    return await ctx.db
      .query("activityCompletions")
      .withIndex("by_square", (q) => q.eq("bingoSquareId", args.bingoSquareId))
      .first();
  },
});

export const listCompletionsForCard = query({
  args: { bingoCardId: v.id("bingoCards") },
  returns: v.array(
    v.object({
      bingoSquareId: v.id("bingoSquares"),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      completionId: v.id("activityCompletions"),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const myAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
    if (!myAccount?.organizationId) return [];
    const card = await ctx.db.get(args.bingoCardId);
    if (!card) return [];
    const participant = await ctx.db.get(card.participantId);
    if (!participant) return [];
    const account = await ctx.db.get(participant.accountId);
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return [];
    }

    const squares = await ctx.db
      .query("bingoSquares")
      .withIndex("by_card", (q) => q.eq("bingoCardId", args.bingoCardId))
      .collect();
    const squareIds = squares.map((s) => s._id);
    const completions = await ctx.db.query("activityCompletions").collect();
    const forThisCard = completions.filter((c) =>
      squareIds.includes(c.bingoSquareId)
    );
    return forThisCard.map((c) => ({
      bingoSquareId: c.bingoSquareId,
      startedAt: c.startedAt,
      completedAt: c.completedAt,
      completionId: c._id,
    }));
  },
});
