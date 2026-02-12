"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

const STORAGE_KEYS = {
  activeParticipantId: "gbw.activeParticipantId",
  locked: "gbw.sessionLocked",
  lastActiveAt: "gbw.lastActiveAt",
  parentUnlockedUntil: "gbw.parentUnlockedUntil",
};

const AUTO_LOCK_MS = 30 * 60 * 1000;
const PARENT_UNLOCK_MS = 10 * 60 * 1000;

type FamilySessionContextValue = {
  activeParticipantId: Id<"participants"> | null;
  isLocked: boolean;
  isParentUnlocked: boolean;
  setActiveParticipantId: (id: Id<"participants"> | null) => void;
  lockSession: () => void;
  touchActivity: () => void;
  grantParentUnlock: () => void;
};

const FamilySessionContext = createContext<FamilySessionContextValue | null>(null);

export function FamilySessionProvider({ children }: { children: React.ReactNode }) {
  const [activeParticipantId, setActiveParticipantId] = useState<Id<"participants"> | null>(
    null
  );
  const [isLocked, setIsLocked] = useState(false);
  const [lastActiveAt, setLastActiveAt] = useState<number | null>(null);
  const [parentUnlockedUntil, setParentUnlockedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedParticipant = window.localStorage.getItem(STORAGE_KEYS.activeParticipantId);
    const storedLocked = window.localStorage.getItem(STORAGE_KEYS.locked);
    const storedLast = window.localStorage.getItem(STORAGE_KEYS.lastActiveAt);
    const storedParent = window.localStorage.getItem(STORAGE_KEYS.parentUnlockedUntil);
    if (storedParticipant) {
      setActiveParticipantId(storedParticipant as Id<"participants">);
    }
    if (storedLocked) {
      setIsLocked(storedLocked === "true");
    }
    if (storedLast) {
      const parsed = Number(storedLast);
      if (!Number.isNaN(parsed)) setLastActiveAt(parsed);
    }
    if (storedParent) {
      const parsed = Number(storedParent);
      if (!Number.isNaN(parsed)) setParentUnlockedUntil(parsed);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeParticipantId) {
      window.localStorage.setItem(STORAGE_KEYS.activeParticipantId, activeParticipantId);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.activeParticipantId);
    }
    window.localStorage.setItem(STORAGE_KEYS.locked, String(isLocked));
    if (lastActiveAt) {
      window.localStorage.setItem(STORAGE_KEYS.lastActiveAt, String(lastActiveAt));
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.lastActiveAt);
    }
    if (parentUnlockedUntil) {
      window.localStorage.setItem(
        STORAGE_KEYS.parentUnlockedUntil,
        String(parentUnlockedUntil)
      );
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.parentUnlockedUntil);
    }
  }, [activeParticipantId, isLocked, lastActiveAt, parentUnlockedUntil]);

  const touchActivity = useCallback(() => {
    setLastActiveAt(Date.now());
  }, []);

  useEffect(() => {
    if (!activeParticipantId || isLocked) return;
    const handler = () => touchActivity();
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [activeParticipantId, isLocked, touchActivity]);

  useEffect(() => {
    if (!activeParticipantId || isLocked) return;
    const interval = window.setInterval(() => {
      if (!lastActiveAt) return;
      if (Date.now() - lastActiveAt > AUTO_LOCK_MS) {
        setIsLocked(true);
        setActiveParticipantId(null);
        setParentUnlockedUntil(null);
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [activeParticipantId, isLocked, lastActiveAt]);

  const lockSession = useCallback(() => {
    setIsLocked(true);
    setActiveParticipantId(null);
    setParentUnlockedUntil(null);
  }, []);

  const grantParentUnlock = useCallback(() => {
    setParentUnlockedUntil(Date.now() + PARENT_UNLOCK_MS);
  }, []);

  const handleSetActive = useCallback(
    (id: Id<"participants"> | null) => {
      setActiveParticipantId(id);
      setIsLocked(false);
      setLastActiveAt(Date.now());
      setParentUnlockedUntil(null);
    },
    []
  );

  const isParentUnlocked = useMemo(() => {
    if (!parentUnlockedUntil) return false;
    return parentUnlockedUntil > Date.now();
  }, [parentUnlockedUntil]);

  const value = useMemo<FamilySessionContextValue>(
    () => ({
      activeParticipantId,
      isLocked,
      isParentUnlocked,
      setActiveParticipantId: handleSetActive,
      lockSession,
      touchActivity,
      grantParentUnlock,
    }),
    [activeParticipantId, handleSetActive, isLocked, isParentUnlocked, lockSession, touchActivity, grantParentUnlock]
  );

  return (
    <FamilySessionContext.Provider value={value}>
      {children}
    </FamilySessionContext.Provider>
  );
}

export function useFamilySession() {
  const ctx = useContext(FamilySessionContext);
  if (!ctx) {
    throw new Error("useFamilySession must be used within FamilySessionProvider");
  }
  return ctx;
}
