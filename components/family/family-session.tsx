'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Id } from '@/convex/_generated/dataModel'

const AUTO_LOCK_MS = 30 * 60 * 1000
const PARENT_UNLOCK_MS = 10 * 60 * 1000

type FamilySessionState = {
  activeParticipantId: Id<'participants'> | null
  isLocked: boolean
  lastActiveAt: number | null
  parentUnlockedUntil: number | null
  setActiveParticipantId: (id: Id<'participants'> | null) => void
  lockSession: () => void
  touchActivity: () => void
  grantParentUnlock: () => void
}

export const useFamilySessionStore = create<FamilySessionState>()(
  persist(
    (set) => ({
      activeParticipantId: null,
      isLocked: false,
      lastActiveAt: null,
      parentUnlockedUntil: null,
      setActiveParticipantId: (id) =>
        set({
          activeParticipantId: id,
          isLocked: false,
          lastActiveAt: Date.now(),
          parentUnlockedUntil: null,
        }),
      lockSession: () =>
        set({
          isLocked: true,
          activeParticipantId: null,
          parentUnlockedUntil: null,
        }),
      touchActivity: () => set({ lastActiveAt: Date.now() }),
      grantParentUnlock: () =>
        set({ parentUnlockedUntil: Date.now() + PARENT_UNLOCK_MS }),
    }),
    {
      name: 'gbw-family-session',
      partialize: (state) => ({
        activeParticipantId: state.activeParticipantId,
        isLocked: state.isLocked,
        lastActiveAt: state.lastActiveAt,
        parentUnlockedUntil: state.parentUnlockedUntil,
      }),
    },
  ),
)

function useIsParentUnlocked(): boolean {
  const parentUnlockedUntil = useFamilySessionStore(
    (s) => s.parentUnlockedUntil,
  )
  return parentUnlockedUntil !== null && parentUnlockedUntil > Date.now()
}

export function useFamilySession() {
  const activeParticipantId = useFamilySessionStore(
    (s) => s.activeParticipantId,
  )
  const isLocked = useFamilySessionStore((s) => s.isLocked)
  const isParentUnlocked = useIsParentUnlocked()
  const setActiveParticipantId = useFamilySessionStore(
    (s) => s.setActiveParticipantId,
  )
  const lockSession = useFamilySessionStore((s) => s.lockSession)
  const touchActivity = useFamilySessionStore((s) => s.touchActivity)
  const grantParentUnlock = useFamilySessionStore((s) => s.grantParentUnlock)

  return {
    activeParticipantId,
    isLocked,
    isParentUnlocked,
    setActiveParticipantId,
    lockSession,
    touchActivity,
    grantParentUnlock,
  }
}

export function FamilySessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const activeParticipantId = useFamilySessionStore(
    (s) => s.activeParticipantId,
  )
  const isLocked = useFamilySessionStore((s) => s.isLocked)
  const setState = useFamilySessionStore.getState()

  useEffect(() => {
    if (!activeParticipantId || isLocked) return
    const handler = () => setState.touchActivity()
    window.addEventListener('click', handler)
    window.addEventListener('keydown', handler)
    window.addEventListener('touchstart', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('keydown', handler)
      window.removeEventListener('touchstart', handler)
    }
  }, [activeParticipantId, isLocked, setState])

  useEffect(() => {
    if (!activeParticipantId || isLocked) return
    const interval = window.setInterval(() => {
      const state = useFamilySessionStore.getState()
      const { lastActiveAt: last } = state
      if (last != null && Date.now() - last > AUTO_LOCK_MS) {
        state.lockSession()
      }
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [activeParticipantId, isLocked])

  return <>{children}</>
}
