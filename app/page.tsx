'use client'

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  useAuth,
} from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'

export default function Home() {
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
      return
    }
    router.replace('/dashboard')
  }, [isSignedIn, membership, account, router])

  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
          <h1 className="text-2xl font-bold">Grandma&apos;s Bookworms</h1>
          <p className="text-muted-foreground text-center max-w-sm">
            Sign in or create an account to get started.
          </p>
          <div className="flex gap-4">
            <SignInButton mode="modal">
              <Button variant="outline">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Sign up</Button>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </SignedIn>
    </>
  )
}
