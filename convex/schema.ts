import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    createdByOwnerId: v.string(),
    isActive: v.boolean(),
  })
    .index('by_slug', ['slug'])
    .index('by_creator', ['createdByOwnerId']),

  organizationMembers: defineTable({
    organizationId: v.id('organizations'),
    ownerId: v.string(),
    role: v.union(v.literal('admin'), v.literal('member')),
    status: v.union(v.literal('active'), v.literal('revoked')),
    joinedAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index('by_owner', ['ownerId'])
    .index('by_org', ['organizationId'])
    .index('by_org_and_owner', ['organizationId', 'ownerId']),

  organizationInvites: defineTable({
    organizationId: v.id('organizations'),
    code: v.optional(v.string()),
    codeHash: v.string(),
    createdByOwnerId: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    useCount: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index('by_org', ['organizationId'])
    .index('by_code_hash', ['codeHash']),

  accounts: defineTable({
    ownerId: v.string(),
    organizationId: v.optional(v.id('organizations')),
    type: v.union(v.literal('individual'), v.literal('family')),
    displayName: v.string(),
    isAdmin: v.optional(v.boolean()),
    parentPasscodeHash: v.optional(v.string()),
  })
    .index('by_owner', ['ownerId'])
    .index('by_org', ['organizationId']),

  participants: defineTable({
    accountId: v.id('accounts'),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    birthday: v.optional(v.string()),
    name: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    role: v.union(v.literal('owner'), v.literal('member')),
    avatarStorageId: v.optional(v.id('_storage')),
    unlockType: v.optional(v.union(v.literal('pin'), v.literal('emoji'))),
    unlockHash: v.optional(v.string()),
  })
    .index('by_account', ['accountId'])
    .index('by_account_and_role', ['accountId', 'role']),

  baseActivities: defineTable({
    name: v.string(),
    ageGroup: v.string(),
    activityType: v.union(v.literal('reading'), v.literal('activity')),
    raffleValue: v.number(),
    baseActivityId: v.optional(v.string()),
  }),

  bingoCards: defineTable({
    participantId: v.id('participants'),
    periodKey: v.string(),
  }).index('by_participant_and_period', ['participantId', 'periodKey']),

  bingoSquares: defineTable({
    bingoCardId: v.id('bingoCards'),
    position: v.number(),
    baseActivityId: v.optional(v.id('baseActivities')),
  }).index('by_card', ['bingoCardId']),

  activityCompletions: defineTable({
    bingoSquareId: v.id('bingoSquares'),
    participantId: v.id('participants'),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    formData: v.optional(v.any()),
  })
    .index('by_square', ['bingoSquareId'])
    .index('by_participant', ['participantId']),

  raffleTickets: defineTable({
    participantId: v.id('participants'),
    periodKey: v.string(),
    ticketCount: v.number(),
  }).index('by_participant_and_period', ['participantId', 'periodKey']),

  bingoLines: defineTable({
    bingoCardId: v.id('bingoCards'),
    participantId: v.id('participants'),
    lineType: v.union(
      v.literal('row'),
      v.literal('column'),
      v.literal('diagonal'),
    ),
    lineIndex: v.number(),
    completedAt: v.number(),
  })
    .index('by_card', ['bingoCardId'])
    .index('by_participant', ['participantId']),

  participantBadges: defineTable({
    participantId: v.id('participants'),
    badgeId: v.string(),
    periodKey: v.optional(v.string()),
    earnedAt: v.number(),
  })
    .index('by_participant', ['participantId'])
    .index('by_badge', ['badgeId']),

  messages: defineTable({
    senderId: v.id('participants'),
    recipientId: v.id('participants'),
    body: v.string(),
  })
    .index('by_recipient', ['recipientId'])
    .index('by_sender', ['senderId']),
})
