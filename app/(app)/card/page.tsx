'use client'

import confetti from 'canvas-confetti'
import { useMutation, useQuery } from 'convex/react'
import { Check } from 'lucide-react'
import { motion, useAnimate } from 'motion/react'
import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'
import { useFamilySession } from '@/components/family/family-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { CompletionActivityForm } from '@/forms/completion-activity-form'
import { StartActivityForm } from '@/forms/start-activity-form'
import {
  getAbsoluteHueDifference,
  getHexHue,
  getHueDifference,
  stringToColor,
} from '@/lib/colors'
import {
  type CompletionActivityKind,
  getFormConfigForAgeGroup,
} from '@/lib/completionFormConfig'
import {
  getParticipantAgeGroup,
  getParticipantDisplayName,
} from '@/lib/participants'
import { cn } from '@/lib/utils'

export default function CardPage() {
  const account = useQuery(api.accounts.getMyAccount, {})
  const participants = useQuery(api.participants.listMyParticipants, {})
  const { activeParticipantId } = useFamilySession()

  const currentParticipantId =
    account?.type === 'family'
      ? activeParticipantId
      : (participants?.[0]?._id ?? null)
  const cardId = useQuery(
    api.bingoCards.getCardForParticipant,
    currentParticipantId ? { participantId: currentParticipantId } : 'skip',
  )
  const cardWithSquares = useQuery(
    api.bingoCards.getCardWithSquares,
    cardId?._id ? { bingoCardId: cardId._id } : 'skip',
  )
  const completions = useQuery(
    api.activityCompletions.listCompletionsForCard,
    cardId?._id ? { bingoCardId: cardId._id } : 'skip',
  )
  const bingoLines = useQuery(
    api.rewards.getBingoLinesForParticipant,
    currentParticipantId ? { participantId: currentParticipantId } : 'skip',
  )

  const linesByCard =
    bingoLines === undefined
      ? undefined
      : bingoLines
          .reduce(
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
          .filter((c) => c.bingoCardId === cardId?._id)
  const getOrCreateCard = useMutation(api.bingoCards.getOrCreateForParticipant)
  const startActivity = useMutation(api.activityCompletions.startActivity)
  const completeActivity = useMutation(api.activityCompletions.completeActivity)

  const [loading, setLoading] = useState(false)
  const [squareModal, setSquareModal] = useState<{
    squareId: Id<'bingoSquares'>
    activityName: string
    activityDescription: string | null
    activityTimeRequired: string | null
    position: number
    participantId: Id<'participants'>
    participantAgeGroup: string
  } | null>(null)
  const [completionIdToFinish, setCompletionIdToFinish] = useState<{
    completionId: Id<'activityCompletions'>
    squareId: Id<'bingoSquares'>
    activityName: string
    participantId: Id<'participants'>
    participantAgeGroup: string
    activityKind: CompletionActivityKind
  } | null>(null)

  if (participants === undefined) {
    return <p className="text-muted-foreground">Loading...</p>
  }
  if (participants.length === 0) {
    return (
      <div>
        <p className="text-muted-foreground">
          No participants yet. Complete onboarding or add family members.
        </p>
      </div>
    )
  }

  const participant = participants.find((p) => p._id === currentParticipantId)
  const participantAgeGroup = participant
    ? getParticipantAgeGroup(participant)
    : 'All'

  const ensureCard = async () => {
    if (!currentParticipantId) return
    setLoading(true)
    try {
      await getOrCreateCard({ participantId: currentParticipantId })
    } finally {
      setLoading(false)
    }
  }

  const completionBySquare = new Map(
    (completions ?? []).map((c) => [c.bingoSquareId, c]),
  )

  const percentCompleted =
    (completions?.length ?? 0) / (cardWithSquares?.squares.length ?? 0)

  return (
    <div className="space-y-6 flex flex-col w-full max-w-prose mx-auto">
      <div className="w-full flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Bingo Card</h1>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {(percentCompleted * 100).toFixed(0)}% completed
          </p>
        </div>
      </div>

      {account?.type !== 'family' && participants.length > 1 && (
        <div className="text-sm text-muted-foreground">
          Viewing as{' '}
          {participant ? getParticipantDisplayName(participant) : 'Unknown'}
        </div>
      )}

      {!cardId && (
        <Card>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Get your BINGO card to start logging reading activities.
            </p>
            <Button onClick={ensureCard} disabled={loading}>
              {loading ? 'Creating…' : 'Get my BINGO card'}
            </Button>
          </CardContent>
        </Card>
      )}

      {cardWithSquares && (
        <div className="grid relative overflow-hidden grid-cols-5 border border-black bg-linear-to-br from-accent via-primary to-accent animate-gradient bg-size-[400%_400%] rounded-lg">
          {cardWithSquares.squares.map((sq, idx) => {
            const comp = completionBySquare.get(sq._id)
            const isCompleted = comp?.completedAt != null
            const isStarted = comp != null
            return (
              <SquareButton
                key={sq._id}
                square={sq}
                isCompleted={isCompleted}
                isStarted={isStarted}
                onClick={() => {
                  if (isCompleted) return
                  if (isStarted) {
                    setCompletionIdToFinish({
                      completionId: comp.completionId,
                      squareId: sq._id,
                      activityName: sq.activityName ?? 'Activity',
                      participantId: cardWithSquares.card.participantId,
                      participantAgeGroup,
                      activityKind: sq.activityType ?? 'reading',
                    })
                  } else {
                    setSquareModal({
                      squareId: sq._id,
                      activityName: sq.activityName ?? 'Activity',
                      activityDescription: sq.activityDescription ?? null,
                      activityTimeRequired: sq.activityTimeRequired ?? null,
                      position: sq.position,
                      participantId: cardWithSquares.card.participantId,
                      participantAgeGroup,
                    })
                  }
                }}
                idx={idx}
              />
            )
          })}
          {linesByCard?.map((card) => {
            // Remove to show the lines
            return false

            return card.lines.map((line, lineIndex) => {
              if (line.lineType === 'row') {
                return (
                  <div
                    key={line.bingoCardId + '-' + lineIndex}
                    style={{
                      top: `${(line.lineIndex * 100) / 5 + 10}%`,
                      borderColor: stringToColor(
                        line.lineType + '-' + lineIndex * 100,
                      ),
                    }}
                    className="absolute h-px border-b-4 border-dashed w-full bg-transparent left-0 -translate-y-1/2"
                  />
                )
              }
              if (line.lineType === 'column') {
                return (
                  <div
                    key={line.bingoCardId + '-' + lineIndex}
                    style={{
                      left: `${(line.lineIndex * 100) / 5 + 10}%`,
                      borderColor: stringToColor(
                        line.lineType + '-' + lineIndex * 20,
                      ),
                    }}
                    className="absolute h-full w-0 border-dashed border-r-4 bg-transparent top-0 -translate-x-1/2"
                  />
                )
              }
              if (line.lineType === 'diagonal') {
                return (
                  <div
                    key={line.bingoCardId + '-' + lineIndex}
                    style={{
                      borderColor: stringToColor(
                        line.lineType + '-' + lineIndex * 150,
                      ),
                    }}
                    className={cn(
                      'absolute h-[200%] w-px border-r-4 border-dashed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                      line.lineIndex === 0 ? '-rotate-45' : 'rotate-45',
                    )}
                  />
                )
              }
            })
          })}
        </div>
      )}

      <Dialog
        open={!!squareModal}
        onOpenChange={(open) => !open && setSquareModal(null)}
      >
        <DialogContent className="max-h-[90vh] min-h-[30vh] overflow-y-auto flex flex-col justify-start">
          <DialogHeader>
            <DialogTitle>{squareModal?.activityName ?? ''}</DialogTitle>
          </DialogHeader>
          {squareModal && (
            <StartActivityForm
              activityDescription={squareModal.activityDescription}
              activityTimeRequired={squareModal.activityTimeRequired}
              loading={loading}
              onSubmit={async () => {
                setLoading(true)
                try {
                  await startActivity({
                    bingoSquareId: squareModal.squareId,
                    participantId: squareModal.participantId,
                    startedAt: new Date().getTime(),
                  })
                  setSquareModal(null)
                } finally {
                  setLoading(false)
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {completionIdToFinish && (
        <CompletionFormModal
          completionId={completionIdToFinish.completionId}
          activityName={completionIdToFinish.activityName}
          ageGroup={completionIdToFinish.participantAgeGroup}
          activityKind={completionIdToFinish.activityKind}
          onClose={() => setCompletionIdToFinish(null)}
          completeActivity={completeActivity}
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </div>
  )
}

function SquareButton({
  square,
  isCompleted,
  isStarted,
  onClick,
  idx,
}: {
  square: NonNullable<
    ReturnType<typeof useQuery<typeof api.bingoCards.getCardWithSquares>>
  >['squares'][number]
  isCompleted: boolean
  isStarted: boolean
  onClick: () => void
  idx: number
}) {
  const containerRef = useRef<HTMLButtonElement>(null)
  const homeLeft = useMemo(() => {
    return `calc(50% + ${(-16 + Math.min(32, square.activityName?.length ?? 0)) / 2}px)`
  }, [square.activityName])
  const homeTop = useMemo(() => {
    return `calc(50% + ${(-16 + Math.min(32, square.activityName?.length ?? 0)) / 2}px)`
  }, [square.activityName])

  const cellColor = useMemo(() => {
    return stringToColor(square.activityName ?? '', {
      lightnessMin: 40,
      lightnessMax: 41,
    })
  }, [square.activityName])

  const hue = useMemo(() => {
    return getHexHue(cellColor)
  }, [cellColor])

  const hueDifference = useMemo(() => {
    return getHueDifference(getHexHue('#A558E2'), hue)
  }, [hue])

  return (
    <button
      key={square._id}
      type="button"
      ref={containerRef}
      onClick={() => onClick()}
      className={cn(
        'group aspect-square relative border-black bg-white border-b border-r p-3 text-center text-base leading-snug font-semibold text-black transition',
        idx === 0 && 'rounded-tl-lg',
        idx === 4 && 'rounded-tr-lg',
        idx === 20 && 'rounded-bl-lg',
        idx === 24 && 'rounded-br-lg',
        (idx + 1) % 5 === 0 ? 'border-r-0' : '',
        idx + 1 > 20 ? 'border-b-0' : '',
      )}
      style={{
        boxShadow: `inset 0 0 10px 2px ${cellColor}`,
      }}
    >
      <span className="font-medium line-clamp-3 text-pretty">
        {square.activityName}
      </span>
      {isCompleted && (
        <motion.div
          drag
          dragConstraints={containerRef}
          whileHover={{
            scale: 1.1,
            zIndex: 100 + idx,
          }}
          dragElastic={0.9}
          style={{
            zIndex: 10 + idx,
            left: homeLeft,
            top: homeTop,
            filter: `hue-rotate(${hueDifference}deg) grayscale(.5)`,
          }}
          className="size-28 absolute cursor-grab active:cursor-grabbing top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
        >
          <Image
            src="/images/coins/purple-coin.webp"
            width={112}
            height={112}
            className="size-full [image-rendering:pixelated] pointer-events-none"
            alt="Coin"
          />
        </motion.div>
      )}
      {isStarted && !isCompleted && (
        <Image
          src="/images/coins/purple-coin-animated.webp"
          width={36}
          height={36}
          style={{
            filter: `hue-rotate(${hueDifference}deg)`,
          }}
          className="size-9 group-hover:opacity-20 opacity-100 transition-opacity pointer-events-none absolute top-6 left-6 -translate-x-1/2 -translate-y-1/2 [image-rendering:pixelated]"
          alt="Coin"
        />
      )}
    </button>
  )
}

function CompletionFormModal({
  completionId,
  activityName,
  ageGroup,
  activityKind,
  onClose,
  completeActivity,
  loading,
  setLoading,
}: {
  completionId: Id<'activityCompletions'>
  activityName: string
  ageGroup: string
  activityKind: CompletionActivityKind
  onClose: () => void
  completeActivity: (args: {
    completionId: Id<'activityCompletions'>
    completedAt: number
    formData?: Record<string, unknown>
  }) => Promise<null>
  loading: boolean
  setLoading: (v: boolean) => void
}) {
  const fields = getFormConfigForAgeGroup(ageGroup, activityKind)
  const handleConfetti = () => {
    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
    }
    const shoot = () => {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        shapes: ['star'],
      })
      confetti({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
        shapes: ['circle'],
      })
    }
    setTimeout(shoot, 0)
    setTimeout(shoot, 100)
    setTimeout(shoot, 200)
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete: {activityName}</DialogTitle>
        </DialogHeader>
        <CompletionActivityForm
          fields={fields}
          loading={loading}
          onCancel={onClose}
          onSubmit={async (values) => {
            setLoading(true)
            try {
              const hasValues = Object.values(values).some(
                (value) =>
                  value !== undefined && value !== '' && value !== null,
              )
              await completeActivity({
                completionId,
                completedAt: Date.now(),
                formData: hasValues ? values : undefined,
              })
              handleConfetti()
              onClose()
            } finally {
              setLoading(false)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
