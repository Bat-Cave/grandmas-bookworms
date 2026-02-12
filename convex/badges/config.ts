/**
 * Badge config in codebase. Convex returns badgeIds + counts; app uses this
 * config to get name, tier, icon for display. Awarding logic uses the same
 * metrics and thresholds.
 */

export type BadgeTier = 'base' | 'rare' | 'epic' | 'legendary'

export type BadgeMetric = 'activity_count' | 'line_count' | 'message_count' | 'bingo_count'

export interface BadgeMilestone {
  metric: BadgeMetric
  threshold: number
  badgeId: string
  name: string
  description: string
  icon: string // Lucide icon name (kebab-case)
  tier: BadgeTier
}

/** Activity count milestones. badgeId = activities_<threshold> for new awards. */
export const ACTIVITY_MILESTONES: BadgeMilestone[] = [
  { metric: 'activity_count', threshold: 1, badgeId: 'activities_1', name: 'First activity', description: 'Completed your first reading activity', icon: 'star', tier: 'base' },
  { metric: 'activity_count', threshold: 10, badgeId: 'activities_10', name: '10 activities', description: 'Completed 10 activities', icon: 'book-open', tier: 'base' },
  { metric: 'activity_count', threshold: 25, badgeId: 'activities_25', name: '25 activities', description: 'Completed 25 activities', icon: 'book-open', tier: 'rare' },
  { metric: 'activity_count', threshold: 50, badgeId: 'activities_50', name: '50 activities', description: 'Completed 50 activities', icon: 'library', tier: 'epic' },
  { metric: 'activity_count', threshold: 100, badgeId: 'activities_100', name: 'Reading champion', description: 'Completed 100 activities', icon: 'trophy', tier: 'legendary' },
]

/** Line count milestones. badgeId = lines_<threshold>. */
export const LINE_MILESTONES: BadgeMilestone[] = [
  { metric: 'line_count', threshold: 1, badgeId: 'lines_1', name: 'First line', description: 'Got your first BINGO line', icon: 'check-square', tier: 'base' },
  { metric: 'line_count', threshold: 2, badgeId: 'lines_2', name: 'Two lines', description: 'Got your second BINGO line', icon: 'list-checks', tier: 'rare' },
]

/** Message count milestones. badgeId = messages_<threshold>. */
export const MESSAGE_MILESTONES: BadgeMilestone[] = [
  { metric: 'message_count', threshold: 1, badgeId: 'messages_1', name: 'Helped a friend', description: 'Sent a positive message', icon: 'message-circle-heart', tier: 'base' },
  { metric: 'message_count', threshold: 5, badgeId: 'messages_5', name: 'Super helper', description: 'Sent 5+ positive messages', icon: 'heart', tier: 'rare' },
]

/** Full BINGO (blackout) milestones. */
export const BINGO_MILESTONES: BadgeMilestone[] = [
  { metric: 'bingo_count', threshold: 1, badgeId: 'bingo_1', name: 'First BINGO', description: 'Got your first full BINGO', icon: 'party-popper', tier: 'epic' },
]

/** All milestone definitions for awarding. */
export const ALL_MILESTONES: BadgeMilestone[] = [
  ...ACTIVITY_MILESTONES,
  ...LINE_MILESTONES,
  ...MESSAGE_MILESTONES,
  ...BINGO_MILESTONES,
]

const DISPLAY_BY_BADGE_ID = new Map<string, { name: string; description: string; icon: string; tier: BadgeTier }>(
  ALL_MILESTONES.map((m) => [
    m.badgeId,
    { name: m.name, description: m.description, icon: m.icon, tier: m.tier },
  ])
)

export interface BadgeDisplayInfo {
  name: string
  description: string
  icon: string
  tier: BadgeTier
}

/** Get display info for a badgeId from config. */
export function getBadgeDisplayInfo(badgeId: string): BadgeDisplayInfo | null {
  const info = DISPLAY_BY_BADGE_ID.get(badgeId)
  return info ?? null
}

/** Get next milestone for a metric (for "progress to next" UI). */
export function getNextMilestone(
  metric: BadgeMetric,
  currentCount: number
): BadgeMilestone | null {
  const list =
    metric === 'activity_count'
      ? ACTIVITY_MILESTONES
      : metric === 'line_count'
        ? LINE_MILESTONES
        : metric === 'message_count'
          ? MESSAGE_MILESTONES
          : BINGO_MILESTONES
  return list.find((m) => m.threshold > currentCount) ?? null
}
