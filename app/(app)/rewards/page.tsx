'use client'

import { useQuery } from 'convex/react'
import { Ticket } from 'lucide-react'
import { Badge } from '@/components/badge'
import { useFamilySession } from '@/components/family/family-session'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { getBadgeDisplayInfo } from '@/convex/badges/config'
import { getBadgeIcon } from '@/lib/badges/icons'
import { stringToColor } from '@/lib/colors'
import { cn } from '@/lib/utils'

export default function RewardsPage() {
  const account = useQuery(api.accounts.getMyAccount, {})
  const participants = useQuery(api.participants.listMyParticipants, {})
  const raffleByParticipant = useQuery(
    api.rewards.getRaffleTicketsForMyParticipants,
    {},
  )
  const { activeParticipantId } = useFamilySession()

  const currentId =
    account?.type === 'family'
      ? activeParticipantId
      : (participants?.[0]?._id ?? null)
  const badges = useQuery(
    api.rewards.getBadgesForParticipant,
    currentId ? { participantId: currentId } : 'skip',
  )
  const bingoLines = useQuery(
    api.rewards.getBingoLinesForParticipant,
    currentId ? { participantId: currentId } : 'skip',
  )

  const linesByCard =
    bingoLines === undefined
      ? undefined
      : bingoLines.reduce(
          (acc, l) => {
            const card = acc.find((c) => c.bingoCardId === l.bingoCardId)
            if (card) {
              card.lines.push(l)
            } else {
              acc.push({ bingoCardId: l.bingoCardId, lines: [l] })
            }
            return acc
          },
          [] as Array<{
            bingoCardId: Id<'bingoCards'>
            lines: (typeof bingoLines)[number][]
          }>,
        )

  const raffleRows =
    raffleByParticipant === undefined
      ? undefined
      : account?.type === 'family' && currentId
        ? raffleByParticipant.filter((r) => r.participantId === currentId)
        : raffleByParticipant

  const ticketCount =
    raffleRows === undefined
      ? undefined
      : raffleRows.reduce((sum, r) => sum + r.ticketCount, 0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Rewards</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex flex-wrap items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-help"
            >
              <Ticket className="size-10 shrink-0 text-muted-foreground" />
              {raffleByParticipant === undefined ? (
                <span className="text-muted-foreground">Loading…</span>
              ) : raffleByParticipant.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  No participants yet.
                </span>
              ) : (
                <span className="text-2xl font-semibold tabular-nums">
                  {ticketCount}
                  <span className="ml-1.5 text-base font-normal text-muted-foreground">
                    {ticketCount === 1 ? 'ticket' : 'tickets'}
                  </span>
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="max-w-xs text-left leading-snug"
          >
            Tickets are used by Grandma for the raffle. Complete activities and
            get BINGO lines to earn more.
          </TooltipContent>
        </Tooltip>
      </div>

      {participants && participants.length > 0 && currentId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent>
              {badges === undefined ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : badges.length === 0 ? (
                <p className="text-muted-foreground">
                  No badges yet. Complete activities and get BINGO to earn some!
                </p>
              ) : (
                <ul className="flex flex-wrap gap-4">
                  {badges.map((b) => {
                    const info = getBadgeDisplayInfo(b.badgeId)
                    const name = info?.name ?? b.badgeId
                    const description = info?.description
                    const tier = info?.tier ?? 'base'
                    const Icon = info ? getBadgeIcon(info.icon) : null
                    return (
                      <li
                        key={`${b.badgeId}-${b.earnedAt}`}
                        className="rounded-lg border p-4 text-center min-w-[120px] max-w-40 flex flex-col items-center"
                      >
                        <div className="max-w-24 w-full mx-auto">
                          <Badge
                            content={
                              Icon ? (
                                <Icon className="size-[30cqw] shrink-0" />
                              ) : (
                                <span className="text-[30cqw]">★</span>
                              )
                            }
                            label={name}
                            variant={tier}
                          />
                        </div>
                        <p className="font-medium mt-1">{name}</p>
                        {description && (
                          <p className="text-muted-foreground text-xs mt-1">
                            {description}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>BINGO lines</CardTitle>
            </CardHeader>
            <CardContent>
              {linesByCard === undefined ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : linesByCard.length === 0 ? (
                <p className="text-muted-foreground">No BINGO lines yet.</p>
              ) : (
                <ul className="space-y-1">
                  {linesByCard.map((card) => (
                    <li
                      key={card.bingoCardId}
                      className="size-40 rounded border-primary border-2"
                    >
                      <AspectRatio className="grid grid-cols-5 overflow-hidden">
                        {Array(5)
                          .fill(0)
                          .map((_, columnIndex) => (
                            <div
                              key={columnIndex}
                              className={cn(
                                'grid grid-rows-5 border-r',
                                columnIndex === 4 && 'border-r-0',
                              )}
                            >
                              {Array(5)
                                .fill(0)
                                .map((_, rowIndex) => (
                                  <div
                                    key={rowIndex}
                                    className="flex items-center justify-center border-b last:border-b-0"
                                  />
                                ))}
                            </div>
                          ))}
                        {card.lines.map((line, lineIndex) => {
                          if (line.lineType === 'row') {
                            return (
                              <div
                                key={line.bingoCardId + '-' + lineIndex}
                                style={{
                                  top: `${(line.lineIndex * 100) / 5 + 10}%`,
                                  backgroundColor: stringToColor(
                                    line.lineType + '-' + lineIndex * 100,
                                  ),
                                }}
                                className="absolute h-2 w-full bg-primary left-0 -translate-y-1/2"
                              />
                            )
                          }
                          if (line.lineType === 'column') {
                            return (
                              <div
                                key={line.bingoCardId + '-' + lineIndex}
                                style={{
                                  left: `${(line.lineIndex * 100) / 5 + 10}%`,
                                  backgroundColor: stringToColor(
                                    line.lineType + '-' + lineIndex * 20,
                                  ),
                                }}
                                className="absolute h-full w-2 bg-primary top-0 -translate-x-1/2"
                              />
                            )
                          }
                          if (line.lineType === 'diagonal') {
                            return (
                              <div
                                key={line.bingoCardId + '-' + lineIndex}
                                style={{
                                  backgroundColor: stringToColor(
                                    line.lineType + '-' + lineIndex * 150,
                                  ),
                                }}
                                className={cn(
                                  'absolute h-[200%] w-2 bg-primary top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                                  line.lineIndex === 0
                                    ? '-rotate-45'
                                    : 'rotate-45',
                                )}
                              />
                            )
                          }
                        })}
                      </AspectRatio>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
