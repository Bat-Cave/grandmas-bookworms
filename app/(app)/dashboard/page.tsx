'use client'

import { useQuery } from 'convex/react'
import Link from 'next/link'
import { useFamilySession } from '@/components/family/family-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/convex/_generated/api'
import {
  getParticipantAgeGroup,
  getParticipantDisplayName,
} from '@/lib/participants'

export default function DashboardPage() {
  const account = useQuery(api.accounts.getMyAccount, {})
  const participants = useQuery(api.participants.listMyParticipants, {})
  const { activeParticipantId } = useFamilySession()
  const activeParticipant = participants?.find(
    (p) => p._id === activeParticipantId,
  )

  const isParent =
    activeParticipant?.role === 'owner' && account?.type === 'family'

  if (account === undefined || participants === undefined) {
    return <p className="text-muted-foreground">Loading...</p>
  }
  if (account === null) return null

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">
        Welcome,{' '}
        {activeParticipant
          ? getParticipantDisplayName(activeParticipant)
          : account.displayName}
      </h1>

      <section className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>BINGO Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Complete reading activities to get BINGO and earn raffle tickets
              and badges.
            </p>
            <Button asChild>
              <Link href="/card">View my card</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Send and receive positive messages from the book club.
            </p>
            <Button asChild variant="outline">
              <Link href="/messages">Go to messages</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {participants.length > 0 && isParent && (
        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {participants.map((p) => (
                <li key={p._id}>
                  {getParticipantDisplayName(p)} ({getParticipantAgeGroup(p)})
                  {account.type === 'family' && (
                    <span className="text-muted-foreground ml-2">
                      {p.role === 'owner' ? '— you' : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {account.type === 'family' && (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/family">Manage family</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            Raffle tickets and badges you&apos;ve earned.
          </p>
          <Button asChild variant="outline">
            <Link href="/rewards">View rewards</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
