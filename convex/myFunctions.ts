// Placeholder – app uses accounts, participants, and other convex modules.
// Keep this file so existing api references can be updated gradually, or remove when unused.
import { v } from 'convex/values'
import { query } from './_generated/server'

export const health = query({
  args: {},
  returns: v.literal(true),
  handler: async (): Promise<true> => true,
})
