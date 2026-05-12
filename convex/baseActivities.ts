import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { AGE_GROUP_LABELS } from '../lib/ageGroups'
import { requireActiveMembership, requireAdminMembership } from './lib/authz'

const activityValidator = v.object({
  _id: v.id('baseActivities'),
  _creationTime: v.number(),
  organizationId: v.optional(v.id('organizations')),
  name: v.string(),
  description: v.optional(v.string()),
  ageGroup: v.string(),
  activityType: v.union(v.literal('reading'), v.literal('activity')),
  raffleValue: v.number(),
  baseActivityId: v.optional(v.string()),
})

const CANNED_ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  'Free Choice!':
    'Choose any reading activity that fits your age and interests, then complete it your own way.',
}

/** Matches seeded activity tips; use when persisting or displaying rows without `description`. */
export function defaultActivityDescription(name: string): string {
  return CANNED_ACTIVITY_DESCRIPTIONS[name] ?? `Helpful tip: ${name}.`
}

const ACTIVITIES_SEED = [
  {
    name: 'Read with a friend (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read to a stuffed animal',
    ageGroup: '6 - 8',
    activityType: 'reading' as const,
    raffleValue: 2,
  },
  {
    name: 'Read a fairy or folk tale',
    ageGroup: '6 - 8,9 - 11,12 - 14',
    activityType: 'reading' as const,
    raffleValue: 2,
  },
  {
    name: 'Read for 20 minutes',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 2,
  },
  {
    name: 'Read out loud for 10 minutes',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read in a blanket fort for 20 minutes',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 2,
  },
  {
    name: 'Read for 60 minutes',
    ageGroup: '12 - 14,15 - 18,Adult',
    activityType: 'reading' as const,
    raffleValue: 5,
  },
  {
    name: 'Read in the dark with a flashlight (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read to your mom or dad (10minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 2,
  },
  {
    name: 'Read a non-fiction book',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 3,
  },
  {
    name: 'Read while eating ice cream (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read outside (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 2,
  },
  {
    name: 'Free Choice!',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read for 30 minutes',
    ageGroup: '9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'reading' as const,
    raffleValue: 3,
  },
  {
    name: 'Read in your pajamas (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read to a sibling (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read a book about animals',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read for 10 minutes',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read a magazine',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read under the table (10minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read for 40 minutes',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 4,
  },
  {
    name: 'Read a favorite book',
    ageGroup: '0 - 5',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read on a rainy day (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Read a mystery book',
    ageGroup: '12 - 14,15 - 18,Adult',
    activityType: 'reading' as const,
    raffleValue: 3,
  },
  {
    name: 'Read in your swimsuit (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Draw a picture that goes with the story you just read',
    ageGroup: 'All',
    activityType: 'activity' as const,
    raffleValue: 2,
  },
  {
    name: 'Act out a story with your family or friends',
    ageGroup: '6 - 8,9 - 11,12 - 14',
    activityType: 'activity' as const,
    raffleValue: 4,
  },
  {
    name: 'Read at the library (20 minute minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 2,
  },
  {
    name: 'Make a craft that goes with a story you read',
    ageGroup: 'All',
    activityType: 'activity' as const,
    raffleValue: 3,
  },
  {
    name: 'Read a Dr. Suess book',
    ageGroup: '0 - 5,6 - 8,9 - 11',
    activityType: 'reading' as const,
    raffleValue: 2,
  },
  {
    name: 'Read while having a picnic (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading' as const,
    raffleValue: 1,
  },
  {
    name: 'Watch a movie about a story you read',
    ageGroup: 'All',
    activityType: 'activity' as const,
    raffleValue: 2,
  },
  {
    name: 'Make treats from a story you read',
    ageGroup: 'All',
    activityType: 'activity' as const,
    raffleValue: 3,
  },
  {
    name: 'Write a story and share with others',
    ageGroup: '6 - 8,9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'activity' as const,
    raffleValue: 5,
  },
  {
    name: 'Act out a story you read',
    ageGroup: 'All',
    activityType: 'activity' as const,
    raffleValue: 4,
  },
  {
    name: 'Read a short story aloud in a silly voice',
    ageGroup: '6 - 8,9 - 11,12 - 14',
    activityType: 'reading' as const,
    raffleValue: 3,
  },
  {
    name: 'Read a short story aloud with an English accent',
    ageGroup: '9 - 11,12 - 14,6 - 8',
    activityType: 'reading' as const,
    raffleValue: 3,
  },
  {
    name: 'Make a list of ten words from the story that are unfamiliar to you',
    ageGroup: '9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'activity' as const,
    raffleValue: 3,
  },
  {
    name: 'Write an alternate ending to a story',
    ageGroup: '9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'activity' as const,
    raffleValue: 4,
  },
  {
    name: 'Play a card game with your family or friends',
    ageGroup: 'All',
    activityType: 'activity' as const,
    raffleValue: 2,
  },
  {
    name: 'Dress up as a character from a story and take photos',
    ageGroup: '6 - 8,9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'activity' as const,
    raffleValue: 3,
  },
].map((activity) => ({
  ...activity,
  description: defaultActivityDescription(activity.name),
}))

type ActivityInput = {
  name: string
  description: string
  ageGroup: string
  activityType: 'reading' | 'activity'
  raffleValue: number
}

type Ctx = QueryCtx | MutationCtx

function normalizeAgeGroup(value: string) {
  const groups = value
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean)

  if (groups.includes('All')) return 'All'

  const unique = Array.from(new Set(groups)).filter((group) =>
    AGE_GROUP_LABELS.includes(group),
  )

  if (unique.length === 0) throw new Error('INVALID_ACTIVITY_AGE_GROUP')

  return unique.join(',')
}

function normalizeActivityInput(input: ActivityInput) {
  const name = input.name.trim()
  if (!name) throw new Error('INVALID_ACTIVITY_NAME')

  const description = input.description.trim()
  if (description.length > 1000) throw new Error('INVALID_ACTIVITY_DESCRIPTION')

  if (!Number.isInteger(input.raffleValue) || input.raffleValue <= 0) {
    throw new Error('INVALID_ACTIVITY_RAFFLE_VALUE')
  }

  return {
    name,
    description,
    ageGroup: normalizeAgeGroup(input.ageGroup),
    activityType: input.activityType,
    raffleValue: input.raffleValue,
  }
}

function matchesAgeGroup(activityAgeGroup: string, ageGroup: string) {
  if (activityAgeGroup === 'All') return true
  return activityAgeGroup
    .split(',')
    .map((group) => group.trim())
    .includes(ageGroup)
}

async function getActivitiesForOrganization(
  ctx: Ctx,
  organizationId: Id<'organizations'>,
) {
  const scoped = await ctx.db
    .query('baseActivities')
    .withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
    .collect()

  return scoped.sort((a, b) => a.name.localeCompare(b.name))
}

export async function ensureDefaultActivitiesForOrganization(
  ctx: MutationCtx,
  organizationId: Id<'organizations'>,
) {
  const existing = await getActivitiesForOrganization(ctx, organizationId)
  if (existing.length > 0) return 0

  for (const activity of ACTIVITIES_SEED) {
    await ctx.db.insert('baseActivities', {
      organizationId,
      name: activity.name,
      description: activity.description,
      ageGroup: activity.ageGroup,
      activityType: activity.activityType,
      raffleValue: activity.raffleValue,
    })
  }

  return ACTIVITIES_SEED.length
}

export const listForAgeGroup = query({
  args: { ageGroup: v.string() },
  returns: v.array(activityValidator),
  handler: async (ctx, args) => {
    const { membership } = await requireActiveMembership(ctx)
    const activities = await getActivitiesForOrganization(ctx, membership.organizationId)
    return activities.filter((activity) => matchesAgeGroup(activity.ageGroup, args.ageGroup))
  },
})

export const listAll = query({
  args: {},
  returns: v.array(activityValidator),
  handler: async (ctx) => {
    const { membership } = await requireAdminMembership(ctx)
    return await getActivitiesForOrganization(ctx, membership.organizationId)
  },
})

export const ensureDefaults = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const { membership } = await requireAdminMembership(ctx)
    return await ensureDefaultActivitiesForOrganization(ctx, membership.organizationId)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    ageGroup: v.string(),
    activityType: v.union(v.literal('reading'), v.literal('activity')),
    raffleValue: v.number(),
  },
  returns: v.id('baseActivities'),
  handler: async (ctx, args) => {
    const { membership } = await requireAdminMembership(ctx)
    const activity = normalizeActivityInput(args)
    return await ctx.db.insert('baseActivities', {
      organizationId: membership.organizationId,
      ...activity,
    })
  },
})

export const update = mutation({
  args: {
    activityId: v.id('baseActivities'),
    name: v.string(),
    description: v.string(),
    ageGroup: v.string(),
    activityType: v.union(v.literal('reading'), v.literal('activity')),
    raffleValue: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { membership } = await requireAdminMembership(ctx)
    const existing = await ctx.db.get(args.activityId)
    if (!existing || existing.organizationId !== membership.organizationId) {
      throw new Error('ACTIVITY_NOT_FOUND')
    }

    const activity = normalizeActivityInput(args)
    await ctx.db.patch(args.activityId, activity)
    return null
  },
})

export const remove = mutation({
  args: { activityId: v.id('baseActivities') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { membership } = await requireAdminMembership(ctx)
    const existing = await ctx.db.get(args.activityId)
    if (!existing || existing.organizationId !== membership.organizationId) {
      throw new Error('ACTIVITY_NOT_FOUND')
    }

    await ctx.db.delete(args.activityId)
    return null
  },
})

export const seedBaseActivities = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const { membership } = await requireAdminMembership(ctx)
    return await ensureDefaultActivitiesForOrganization(ctx, membership.organizationId)
  },
})
