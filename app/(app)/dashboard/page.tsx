'use client'

import { useQuery } from 'convex/react'
import { ArrowBigRight, Grid3X3, MessageCircle, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useFamilySession } from '@/components/family/family-session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/convex/_generated/api'
import { getParticipantDisplayName } from '@/lib/participants'

export default function DashboardPage() {
  const account = useQuery(api.accounts.getMyAccount, {})
  const participants = useQuery(api.participants.listMyParticipants, {})
  const { activeParticipantId } = useFamilySession()
  const activeParticipant = participants?.find(
    (p) => p._id === activeParticipantId,
  )

  if (account === undefined || participants === undefined) {
    return <p className="text-muted-foreground">Loading...</p>
  }
  if (account === null) return null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">
        Welcome,{' '}
        {activeParticipant
          ? getParticipantDisplayName(activeParticipant)
          : account.displayName}
      </h1>

      <section className="grid gap-8 md:grid-cols-2">
        <Link href="/card" className="group">
          <Card className="bg-linear-to-br from-accent via-secondary to-accent animate-gradient bg-size-[400%_400%] text-foreground">
            <CardHeader>
              <CardTitle className="text-3xl">BINGO Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground text-lg font-semibold">
                Complete reading activities to get BINGO and earn raffle tickets
                and badges.
              </p>
              <Grid3X3 className="size-10 ml-auto group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/messages" className="group">
          <Card className="bg-linear-to-br from-sky-500 via-secondary to-sky-500 animate-gradient bg-size-[400%_400%] text-forground">
            <CardHeader>
              <CardTitle className="text-3xl">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground text-lg font-semibold">
                Send and receive positive messages from the book club.
              </p>
              <MessageCircle className="size-10 ml-auto group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </section>
      <Link href="/rewards" className="group">
        <Card className="bg-linear-to-br from-amber-500 via-orange-200 to-amber-500 animate-gradient bg-size-[400%_400%] text-forground">
          <CardHeader>
            <CardTitle className="text-3xl">Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-lg font-semibold">
              Raffle tickets and badges you&apos;ve earned.
            </p>
            <Trophy className="size-10 ml-auto group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
