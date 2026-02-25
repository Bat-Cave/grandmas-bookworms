'use client'

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  useAuth,
} from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/convex/_generated/api'
import { toUserErrorMessage } from '@/lib/error-messages'

export default function JoinPage() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const membership = useQuery(api.organizations.getMyMembership, {})
  const account = useQuery(api.accounts.getMyAccount, {})
  const joinOrganizationByInvite = useMutation(
    api.organizations.joinOrganizationByInvite,
  )
  const createOrganization = useMutation(api.organizations.createOrganization)

  const [inviteCode, setInviteCode] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [joining, setJoining] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSignedIn || membership === undefined || account === undefined) return

    if (membership !== null) {
      if (account === null) {
        router.replace('/onboarding')
        return
      }
      router.replace('/dashboard')
    }
  }, [isSignedIn, membership, account, router])

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = inviteCode.trim()
    if (!code) {
      setJoinError('Invite code is required')
      return
    }

    setJoinError(null)
    setJoining(true)
    try {
      await joinOrganizationByInvite({ code })
      router.replace('/onboarding')
    } catch (error) {
      setJoinError(toUserErrorMessage(error, 'Failed to join organization'))
    } finally {
      setJoining(false)
    }
  }

  const handleCreateOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = organizationName.trim()
    if (!name) {
      setCreateError('Organization name is required')
      return
    }

    setCreateError(null)
    setCreating(true)
    try {
      await createOrganization({ name })
      router.replace('/onboarding')
    } catch (error) {
      setCreateError(toUserErrorMessage(error, 'Failed to create organization'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
          <h1 className="text-2xl font-bold">Join Grandma&apos;s Bookworms</h1>
          <p className="max-w-md text-center text-muted-foreground">
            Sign in first, then join with an invite code or create your own book
            club organization.
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
        {membership === undefined || account === undefined ? (
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : membership !== null ? null : (
          <div className="mx-auto grid max-w-4xl gap-6 p-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Join an organization</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleJoin}>
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Invite code</Label>
                    <Input
                      id="inviteCode"
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      placeholder="ABCDE-12345"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  {joinError ? (
                    <p className="text-sm text-red-600">{joinError}</p>
                  ) : null}
                  <Button type="submit" disabled={joining || creating}>
                    {joining ? 'Joining...' : 'Join organization'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create a new organization</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateOrganization}>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization name</Label>
                    <Input
                      id="organizationName"
                      value={organizationName}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      placeholder="The Friday Book Club"
                    />
                  </div>
                  {createError ? (
                    <p className="text-sm text-red-600">{createError}</p>
                  ) : null}
                  <Button type="submit" disabled={creating || joining}>
                    {creating ? 'Creating...' : 'Create organization'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </SignedIn>
    </>
  )
}
