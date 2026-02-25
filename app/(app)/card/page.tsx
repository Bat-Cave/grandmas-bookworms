'use client'

import { useMutation, useQuery } from 'convex/react'
import { Check } from 'lucide-react'
import { useState } from 'react'
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
import { stringToColor } from '@/lib/colors'
import { getFormConfigForAgeGroup } from '@/lib/completionFormConfig'
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
  const getOrCreateCard = useMutation(api.bingoCards.getOrCreateForParticipant)
  const startActivity = useMutation(api.activityCompletions.startActivity)
  const completeActivity = useMutation(api.activityCompletions.completeActivity)

  const [loading, setLoading] = useState(false)
  const [squareModal, setSquareModal] = useState<{
    squareId: Id<'bingoSquares'>
    activityName: string
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

  const percentCompmleted =
    (completions?.length ?? 0) / (cardWithSquares?.squares.length ?? 0)

  return (
    <div className="space-y-6 flex flex-col w-full max-w-prose mx-auto">
      <div className="w-full flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Bingo Card</h1>
        <p className="text-sm text-muted-foreground">
          {(percentCompmleted * 100).toFixed(0)}% completed
        </p>
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
        <div className="grid grid-cols-5 border border-black rounded-lg overflow-hidden">
          {cardWithSquares.squares.map((sq, idx) => {
            const comp = completionBySquare.get(sq._id)
            const isCompleted = comp?.completedAt != null
            const isStarted = comp != null
            return (
              <button
                key={sq._id}
                type="button"
                onClick={() => {
                  if (isCompleted) return
                  if (isStarted) {
                    setCompletionIdToFinish({
                      completionId: comp.completionId,
                      squareId: sq._id,
                      activityName: sq.activityName ?? 'Activity',
                      participantId: cardWithSquares.card.participantId,
                      participantAgeGroup,
                    })
                  } else {
                    setSquareModal({
                      squareId: sq._id,
                      activityName: sq.activityName ?? 'Activity',
                      position: sq.position,
                      participantId: cardWithSquares.card.participantId,
                      participantAgeGroup,
                    })
                  }
                }}
                className={cn(
                  'aspect-square relative border-black border-b border-r p-3 text-center text-base leading-snug font-semibold text-black transition',
                  (idx + 1) % 5 === 0 ? 'border-r-0' : '',
                  idx + 1 > 20 ? 'border-b-0' : '',
                  isCompleted ? 'text-green-900' : '',
                )}
                style={{
                  boxShadow: `inset 0 0 ${!isCompleted ? '10px' : '60px'} 2px ${
                    isCompleted
                      ? '#00c950'
                      : stringToColor(sq.activityName ?? '', {
                          lightnessMin: 40,
                          lightnessMax: 41,
                        })
                  }`,
                }}
              >
                <span className="font-medium line-clamp-3 text-pretty">
                  {sq.activityName}
                </span>
                {isCompleted && (
                  <span className="absolute top-1 left-1 gap-1 flex items-center justify-center text-xs">
                    <Check className="size-4" />
                    Done
                  </span>
                )}
                {isStarted && !isCompleted && (
                  <span className="text-xs block mt-1 left-1/2 -translate-x-1/2 w-max absolute bottom-full mx-auto translate-y-1/2 bg-sky-600 rounded-sm text-sky-100 px-2 py-px">
                    <span className="animate-pulse">In progress</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!squareModal}
        onOpenChange={(open) => !open && setSquareModal(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{squareModal?.activityName ?? ''}</DialogTitle>
          </DialogHeader>
          {squareModal && (
            <StartActivityForm
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
          onClose={() => setCompletionIdToFinish(null)}
          completeActivity={completeActivity}
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </div>
  )
}

function CompletionFormModal({
  completionId,
  activityName,
  ageGroup,
  onClose,
  completeActivity,
  loading,
  setLoading,
}: {
  completionId: Id<'activityCompletions'>
  activityName: string
  ageGroup: string
  onClose: () => void
  completeActivity: (args: {
    completionId: Id<'activityCompletions'>
    completedAt: number
    formData?: Record<string, unknown>
  }) => Promise<null>
  loading: boolean
  setLoading: (v: boolean) => void
}) {
  const fields = getFormConfigForAgeGroup(ageGroup)
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
