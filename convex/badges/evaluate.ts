import type { GenericMutationCtx } from 'convex/server'
import type { DataModel, Id } from '../_generated/dataModel'
import { ALL_MILESTONES } from './config'
import type { BadgeMetric } from './config'

const PERIOD_KEY = 'current'

export async function evaluateBadges(
  ctx: GenericMutationCtx<DataModel>,
  participantId: Id<'participants'>,
  periodKey: string = PERIOD_KEY,
): Promise<void> {
  const activityCount = await getActivityCount(ctx, participantId)
  const lineCount = await getLineCount(ctx, participantId)
  const messageCount = await getMessageCount(ctx, participantId)
  const bingoCount = await getBingoCount(ctx, participantId)

  const counts: Record<BadgeMetric, number> = {
    activity_count: activityCount,
    line_count: lineCount,
    message_count: messageCount,
    bingo_count: bingoCount,
  }

  const existing = await ctx.db
    .query('participantBadges')
    .withIndex('by_participant', (q) => q.eq('participantId', participantId))
    .collect()
  const existingBadgeIds = new Set(existing.map((b) => b.badgeId))

  const now = Date.now()
  for (const milestone of ALL_MILESTONES) {
    const count = counts[milestone.metric]
    if (count >= milestone.threshold && !existingBadgeIds.has(milestone.badgeId)) {
      await ctx.db.insert('participantBadges', {
        participantId,
        badgeId: milestone.badgeId,
        periodKey,
        earnedAt: now,
      })
      existingBadgeIds.add(milestone.badgeId)
    }
  }
}

async function getActivityCount(
  ctx: GenericMutationCtx<DataModel>,
  participantId: Id<'participants'>,
): Promise<number> {
  const completions = await ctx.db
    .query('activityCompletions')
    .withIndex('by_participant', (q) => q.eq('participantId', participantId))
    .collect()
  return completions.filter((c) => c.completedAt != null).length
}

async function getLineCount(
  ctx: GenericMutationCtx<DataModel>,
  participantId: Id<'participants'>,
): Promise<number> {
  const lines = await ctx.db
    .query('bingoLines')
    .withIndex('by_participant', (q) => q.eq('participantId', participantId))
    .collect()
  return lines.length
}

async function getMessageCount(
  ctx: GenericMutationCtx<DataModel>,
  participantId: Id<'participants'>,
): Promise<number> {
  const messages = await ctx.db
    .query('messages')
    .withIndex('by_sender', (q) => q.eq('senderId', participantId))
    .collect()
  return messages.length
}

/** Full BINGO = 25 completed squares on a card. Count cards where participant has blackout. */
async function getBingoCount(
  ctx: GenericMutationCtx<DataModel>,
  participantId: Id<'participants'>,
): Promise<number> {
  const cards = await ctx.db
    .query('bingoCards')
    .withIndex('by_participant_and_period', (q) =>
      q.eq('participantId', participantId).eq('periodKey', PERIOD_KEY),
    )
    .collect()
  let blackouts = 0
  for (const card of cards) {
    const squares = await ctx.db
      .query('bingoSquares')
      .withIndex('by_card', (q) => q.eq('bingoCardId', card._id))
      .collect()
    const squareIds = new Set(squares.map((s) => s._id))
    const completions = await ctx.db
      .query('activityCompletions')
      .withIndex('by_participant', (q) => q.eq('participantId', participantId))
      .collect()
    const completedForCard = completions.filter(
      (c) => c.completedAt != null && squareIds.has(c.bingoSquareId),
    )
    if (completedForCard.length === 25) blackouts += 1
  }
  return blackouts
}
