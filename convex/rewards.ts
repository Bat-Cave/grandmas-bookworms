import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { query } from './_generated/server'
import { getAccountForOwnerId } from './lib/authz'

const formatParticipantName = (p?: {
  firstName?: string
  lastName?: string
}) => {
  if (!p) return 'Unknown'
  const first = p.firstName ?? ''
  const last = p.lastName ?? ''
  const fullName = `${first} ${last}`.trim()
  return fullName || 'Unknown'
}

const PERIOD_KEY = 'current'

export const getRaffleTicketsForParticipant = query({
  args: { participantId: v.id('participants') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('raffleTickets'),
      ticketCount: v.number(),
      periodKey: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const myAccount = await getAccountForOwnerId(ctx, identity.subject)
    if (!myAccount?.organizationId) return null
    const participant = await ctx.db.get(args.participantId)
    if (!participant) return null
    const account = await ctx.db.get(participant.accountId)
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return null
    }
    return await ctx.db
      .query('raffleTickets')
      .withIndex('by_participant_and_period', (q) =>
        q.eq('participantId', args.participantId).eq('periodKey', PERIOD_KEY),
      )
      .unique()
  },
})

export const getRaffleTicketsForMyParticipants = query({
  args: {},
  returns: v.array(
    v.object({
      participantId: v.id('participants'),
      participantName: v.string(),
      ticketCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const account = await getAccountForOwnerId(ctx, identity.subject)
    if (!account?.organizationId) return []
    const participants = await ctx.db
      .query('participants')
      .withIndex('by_account', (q) => q.eq('accountId', account._id))
      .collect()
    const result: {
      participantId: Id<'participants'>
      participantName: string
      ticketCount: number
    }[] = []
    for (const p of participants) {
      const rt = await ctx.db
        .query('raffleTickets')
        .withIndex('by_participant_and_period', (q) =>
          q.eq('participantId', p._id).eq('periodKey', PERIOD_KEY),
        )
        .unique()
      result.push({
        participantId: p._id,
        participantName: formatParticipantName(p),
        ticketCount: rt?.ticketCount ?? 0,
      })
    }
    return result
  },
})

/** Returns earned badgeIds + earnedAt. App uses badge config for name, tier, icon. */
export const getBadgesForParticipant = query({
  args: { participantId: v.id('participants') },
  returns: v.array(
    v.object({
      badgeId: v.string(),
      earnedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const myAccount = await getAccountForOwnerId(ctx, identity.subject)
    if (!myAccount?.organizationId) return []
    const participant = await ctx.db.get(args.participantId)
    if (!participant) return []
    const account = await ctx.db.get(participant.accountId)
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return []
    }
    const links = await ctx.db
      .query('participantBadges')
      .withIndex('by_participant', (q) =>
        q.eq('participantId', args.participantId),
      )
      .collect()
    const result = links.map((link) => ({ badgeId: link.badgeId, earnedAt: link.earnedAt }))
    result.sort((a, b) => b.earnedAt - a.earnedAt)
    return result
  },
})

/** Returns counts used for badge evaluation and "progress to next" UI. */
export const getParticipantBadgeCounts = query({
  args: { participantId: v.id('participants') },
  returns: v.union(
    v.null(),
    v.object({
      activityCount: v.number(),
      lineCount: v.number(),
      messageCount: v.number(),
      bingoCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const myAccount = await getAccountForOwnerId(ctx, identity.subject)
    if (!myAccount?.organizationId) return null
    const participant = await ctx.db.get(args.participantId)
    if (!participant) return null
    const account = await ctx.db.get(participant.accountId)
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return null
    }

    const completions = await ctx.db
      .query('activityCompletions')
      .withIndex('by_participant', (q) => q.eq('participantId', args.participantId))
      .collect()
    const activityCount = completions.filter((c) => c.completedAt != null).length

    const lines = await ctx.db
      .query('bingoLines')
      .withIndex('by_participant', (q) => q.eq('participantId', args.participantId))
      .collect()
    const lineCount = lines.length

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_sender', (q) => q.eq('senderId', args.participantId))
      .collect()
    const messageCount = messages.length

    const cards = await ctx.db
      .query('bingoCards')
      .withIndex('by_participant_and_period', (q) =>
        q.eq('participantId', args.participantId).eq('periodKey', PERIOD_KEY),
      )
      .collect()
    let bingoCount = 0
    for (const card of cards) {
      const squares = await ctx.db
        .query('bingoSquares')
        .withIndex('by_card', (q) => q.eq('bingoCardId', card._id))
        .collect()
      const squareIds = new Set(squares.map((s) => s._id))
      const completedForCard = completions.filter(
        (c) => c.completedAt != null && squareIds.has(c.bingoSquareId),
      )
      if (completedForCard.length === 25) bingoCount += 1
    }

    return { activityCount, lineCount, messageCount, bingoCount }
  },
})

export const getBingoLinesForParticipant = query({
  args: { participantId: v.id('participants') },
  returns: v.array(
    v.object({
      bingoCardId: v.id('bingoCards'),
      lineType: v.union(
        v.literal('row'),
        v.literal('column'),
        v.literal('diagonal'),
      ),
      lineIndex: v.number(),
      completedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const myAccount = await getAccountForOwnerId(ctx, identity.subject)
    if (!myAccount?.organizationId) return []
    const participant = await ctx.db.get(args.participantId)
    if (!participant) return []
    const account = await ctx.db.get(participant.accountId)
    if (
      !account ||
      account.ownerId !== identity.subject ||
      account.organizationId !== myAccount.organizationId
    ) {
      return []
    }
    const lines = await ctx.db
      .query('bingoLines')
      .withIndex('by_participant', (q) =>
        q.eq('participantId', args.participantId),
      )
      .collect()
    return lines.map((l) => ({
      bingoCardId: l.bingoCardId,
      lineType: l.lineType,
      lineIndex: l.lineIndex,
      completedAt: l.completedAt,
    }))
  },
})
