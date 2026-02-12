/**
 * Badge ideas for Grandma's Bookworms — use with Lucide icons (lucide.dev/icons)
 * and ray.so for badge images. icon = Lucide icon name (kebab-case).
 */
export const BADGE_IDEAS = [
  // --- Existing (for reference) ---
  { badgeId: 'first_activity', name: 'First activity', description: 'Completed your first reading activity', icon: 'star' },
  { badgeId: 'ten_activities', name: '10 activities', description: 'Completed 10 activities', icon: 'book-open' },
  { badgeId: 'first_line', name: 'First line', description: 'Got your first BINGO line', icon: 'check-square' },
  { badgeId: 'first_bingo', name: 'First BINGO', description: 'Got your first full BINGO', icon: 'party-popper' },
  { badgeId: 'helper', name: 'Helped a friend', description: 'Sent a positive message', icon: 'message-circle-heart' },

  // --- Milestones / streaks ---
  { badgeId: 'twenty_five_activities', name: '25 activities', description: 'Completed 25 activities', icon: 'book-open' },
  { badgeId: 'fifty_activities', name: '50 activities', description: 'Completed 50 activities', icon: 'library' },
  { badgeId: 'hundred_activities', name: 'Reading champion', description: 'Completed 100 activities', icon: 'trophy' },
  { badgeId: 'week_warrior', name: 'Week warrior', description: 'Completed at least one activity every day for 7 days', icon: 'flame' },
  { badgeId: 'early_bird', name: 'Early bird', description: 'Completed an activity before 9am', icon: 'sunrise' },
  { badgeId: 'night_owl', name: 'Night owl', description: 'Completed an activity after 8pm', icon: 'moon' },

  // --- BINGO / card ---
  { badgeId: 'two_lines', name: 'Two lines', description: 'Got your second BINGO line', icon: 'list-checks' },
  { badgeId: 'blackout', name: 'Blackout', description: 'Filled the entire card', icon: 'layout-grid' },
  { badgeId: 'corner_star', name: 'Corner star', description: 'Completed all four corners', icon: 'square' },
  { badgeId: 'diagonal_master', name: 'Diagonal master', description: 'Got both diagonals', icon: 'move-diagonal' },

  // --- Social / family ---
  { badgeId: 'super_helper', name: 'Super helper', description: 'Sent 5+ positive messages', icon: 'heart' },
  { badgeId: 'cheerleader', name: 'Cheerleader', description: 'Sent a message to every family member', icon: 'users' },
  { badgeId: 'first_to_congratulate', name: 'First to congratulate', description: "Sent a message within 1 hour of someone's BINGO", icon: 'zap' },

  // --- Fun / variety ---
  { badgeId: 'variety_reader', name: 'Variety reader', description: 'Completed at least 5 different activity types', icon: 'layers' },
  { badgeId: 'speed_reader', name: 'Speed reader', description: 'Completed 3 activities in one day', icon: 'gauge' },
  { badgeId: 'comeback_kid', name: 'Comeback kid', description: 'Completed an activity after 7+ days of no activity', icon: 'refresh-cw' },
  { badgeId: 'new_year_reader', name: 'New year reader', description: 'Completed an activity on Jan 1', icon: 'calendar-days' },
] as const

export type BadgeIdea = (typeof BADGE_IDEAS)[number]
