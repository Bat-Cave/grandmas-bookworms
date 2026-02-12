import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listForAgeGroup = query({
  args: { ageGroup: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('baseActivities'),
      _creationTime: v.number(),
      name: v.string(),
      ageGroup: v.string(),
      activityType: v.union(v.literal('reading'), v.literal('activity')),
      raffleValue: v.number(),
      baseActivityId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const all = await ctx.db.query('baseActivities').collect()
    return all.filter((a) => {
      if (a.ageGroup === 'All') return true
      const groups = a.ageGroup.split(',').map((s) => s.trim())
      return groups.includes(args.ageGroup)
    })
  },
})

export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('baseActivities'),
      _creationTime: v.number(),
      name: v.string(),
      ageGroup: v.string(),
      activityType: v.union(v.literal('reading'), v.literal('activity')),
      raffleValue: v.number(),
      baseActivityId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query('baseActivities').collect()
  },
})

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
    activityType: 'reading',
    raffleValue: 2,
  },
  {
    name: 'Read a fairy or folk tale',
    ageGroup: '6 - 8,9 - 11,12 - 14',
    activityType: 'reading',
    raffleValue: 2,
  },
  {
    name: 'Read for 20 minutes',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 2,
  },
  {
    name: 'Read out loud for 10 minutes',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read in a blanket fort for 20 minutes',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 2,
  },
  {
    name: 'Read for 60 minutes',
    ageGroup: '12 - 14,15 - 18,Adult',
    activityType: 'reading',
    raffleValue: 5,
  },
  {
    name: 'Read in the dark with a flashlight (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read to your mom or dad (10minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 2,
  },
  {
    name: 'Read a non-fiction book',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 3,
  },
  {
    name: 'Read while eating ice cream (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read outside (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 2,
  },
  {
    name: 'Free Choice!',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read for 30 minutes',
    ageGroup: '9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'reading',
    raffleValue: 3,
  },
  {
    name: 'Read in your pajamas (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read to a sibling (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read a book about animals',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read for 10 minutes',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read a magazine',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read under the table (10minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read for 40 minutes',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 4,
  },
  {
    name: 'Read a favorite book',
    ageGroup: '0 - 5',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read on a rainy day (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Read a mystery book',
    ageGroup: '12 - 14,15 - 18,Adult',
    activityType: 'reading',
    raffleValue: 3,
  },
  {
    name: 'Read in your swimsuit (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Draw a picture that goes with the story you just read',
    ageGroup: 'All',
    activityType: 'activity',
    raffleValue: 2,
  },
  {
    name: 'Act out a story with your family or friends',
    ageGroup: '6 - 8,9 - 11,12 - 14',
    activityType: 'activity',
    raffleValue: 4,
  },
  {
    name: 'Read at the library (20 minute minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 2,
  },
  {
    name: 'Make a craft that goes with a story you read',
    ageGroup: 'All',
    activityType: 'activity',
    raffleValue: 3,
  },
  {
    name: 'Read a Dr. Suess book',
    ageGroup: '0 - 5,6 - 8,9 - 11',
    activityType: 'reading',
    raffleValue: 2,
  },
  {
    name: 'Read while having a picnic (10 minutes minimum)',
    ageGroup: 'All',
    activityType: 'reading',
    raffleValue: 1,
  },
  {
    name: 'Watch a movie about a story you read',
    ageGroup: 'All',
    activityType: 'activity',
    raffleValue: 2,
  },
  {
    name: 'Make treats from a story you read',
    ageGroup: 'All',
    activityType: 'activity',
    raffleValue: 3,
  },
  {
    name: 'Write a story and share with others',
    ageGroup: '6 - 8,9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'activity',
    raffleValue: 5,
  },
  {
    name: 'Act out a story you read',
    ageGroup: 'All',
    activityType: 'activity',
    raffleValue: 4,
  },
  {
    name: 'Read a short story aloud in a silly voice',
    ageGroup: '6 - 8,9 - 11,12 - 14',
    activityType: 'reading',
    raffleValue: 3,
  },
  {
    name: 'Read a short story aloud with an English accent',
    ageGroup: '9 - 11,12 - 14,6 - 8',
    activityType: 'reading',
    raffleValue: 3,
  },
  {
    name: 'Make a list of ten words from the story that are unfamiliar to you',
    ageGroup: '9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'activity',
    raffleValue: 3,
  },
  {
    name: 'Write an alternate ending to a story',
    ageGroup: '9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'activity',
    raffleValue: 4,
  },
  {
    name: 'Play a card game with your family or friends',
    ageGroup: 'All',
    activityType: 'activity',
    raffleValue: 2,
  },
  {
    name: 'Dress up as a character from a story and take photos',
    ageGroup: '6 - 8,9 - 11,12 - 14,15 - 18,Adult',
    activityType: 'activity',
    raffleValue: 3,
  },
]

export const seedBaseActivities = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const existing = await ctx.db.query('baseActivities').first()
    if (existing) return 0
    for (const a of ACTIVITIES_SEED) {
      await ctx.db.insert('baseActivities', {
        name: a.name,
        ageGroup: a.ageGroup,
        activityType: a.activityType as 'reading' | 'activity',
        raffleValue: a.raffleValue,
      })
    }
    return ACTIVITIES_SEED.length
  },
})
