'use client'

import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CheckSquare,
  Heart,
  Library,
  ListChecks,
  MessageCircleHeart,
  PartyPopper,
  Star,
  Trophy,
} from 'lucide-react'

/** Map config icon names (kebab-case) to Lucide components for badge display. */
export const BADGE_ICONS: Record<string, LucideIcon> = {
  star: Star,
  'book-open': BookOpen,
  library: Library,
  trophy: Trophy,
  'check-square': CheckSquare,
  'list-checks': ListChecks,
  'message-circle-heart': MessageCircleHeart,
  heart: Heart,
  'party-popper': PartyPopper,
}

export function getBadgeIcon(iconName: string): LucideIcon | null {
  return BADGE_ICONS[iconName] ?? null
}
