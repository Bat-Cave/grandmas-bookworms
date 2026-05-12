'use client'

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { Book, Home, MessageCircle, Shield, Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FamilyGate } from '@/components/family/family-gate'
import {
  FamilySessionProvider,
  useFamilySession,
} from '@/components/family/family-session'
import { Button, buttonVariants } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { getParticipantDisplayName } from '@/lib/participants'
import { cn } from '@/lib/utils'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const membership = useQuery(api.organizations.getMyMembership, {})
  const account = useQuery(api.accounts.getMyAccount, {})

  useEffect(() => {
    if (!isSignedIn || membership === undefined || account === undefined) return
    if (membership === null) {
      router.replace('/join')
      return
    }
    if (account === null) {
      router.replace('/onboarding')
    }
  }, [isSignedIn, membership, account, router])

  if (membership === undefined || account === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <Show when="signed-out">
        <div className="flex min-h-screen flex-col">
          <nav className="border-b px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
            <Link href="/" className="font-medium hover:underline">
              Grandma&apos;s Bookworms
            </Link>
            <div className="flex items-center gap-4">
              <SignInButton mode="modal">
                <Button variant="outline">Sign in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Sign up</Button>
              </SignUpButton>
            </div>
          </nav>
          <main className="flex flex-1 items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-sm">
              <p className="text-muted-foreground">
                Sign in or create an account to access the app.
              </p>
              <div className="flex gap-4 justify-center">
                <SignInButton mode="modal">
                  <Button variant="outline">Sign in</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button>Sign up</Button>
                </SignUpButton>
              </div>
            </div>
          </main>
        </div>
      </Show>
      <Show when="signed-in">
        {membership === null || account === null ? null : (
          <FamilySessionProvider>
            <FamilyGate>
              <AppFrame
                isOrgAdmin={membership.role === 'admin'}
                accountType={account.type}
              >
                {children}
              </AppFrame>
            </FamilyGate>
          </FamilySessionProvider>
        )}
      </Show>
    </>
  )
}

function AppFrame({
  isOrgAdmin,
  accountType,
  children,
}: {
  isOrgAdmin: boolean
  accountType: 'individual' | 'family'
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const participants = useQuery(api.participants.listMyParticipants, {})
  const { activeParticipantId, lockSession } = useFamilySession()
  const activeParticipant = participants?.find(
    (p) => p._id === activeParticipantId,
  )

  const isFamily = accountType === 'family'
  const isParent = activeParticipant?.role === 'owner' && isFamily
  const canAccessOrganization = isOrgAdmin && (!isFamily || isParent)

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-1 w-full">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({
                variant: pathname === '/dashboard' ? 'default' : 'ghost',
              }),
            )}
          >
            <Home className="size-4" /> Dashboard
          </Link>
          <Link
            href="/card"
            className={cn(
              buttonVariants({
                variant: pathname === '/card' ? 'default' : 'ghost',
              }),
            )}
          >
            <Book className="size-4" /> My Card
          </Link>
          <Link
            href="/messages"
            className={cn(
              buttonVariants({
                variant: pathname === '/messages' ? 'default' : 'ghost',
              }),
            )}
          >
            <MessageCircle className="size-4" /> Messages
          </Link>
          <Link
            href="/rewards"
            className={cn(
              buttonVariants({
                variant: pathname === '/rewards' ? 'default' : 'ghost',
              }),
            )}
          >
            <Trophy className="size-4" /> Rewards
          </Link>
          {canAccessOrganization && (
            <Link
              href="/organization"
              className={cn(
                buttonVariants({
                  variant: pathname.startsWith('/organization')
                    ? 'default'
                    : 'ghost',
                }),
              )}
            >
              <Shield className="size-4" /> Organization
            </Link>
          )}
          {isParent && (
            <Link
              href="/family"
              className={cn(
                buttonVariants({
                  variant: pathname === '/family' ? 'default' : 'ghost',
                }),
              )}
            >
              <Users className="size-4" /> Family
            </Link>
          )}

          <div className="ml-auto flex justify-end items-center p-4 gap-4 h-16">
            {accountType === 'family' && activeParticipantId && (
              <div className="flex items-center gap-3">
                {activeParticipant && (
                  <span className="text-sm text-muted-foreground">
                    Playing as {getParticipantDisplayName(activeParticipant)}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={lockSession}>
                  Done
                </Button>
              </div>
            )}
            {(!isFamily || isParent) && (
              <>
                <Show when="signed-out">
                  <SignInButton />
                  <SignUpButton>
                    <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
