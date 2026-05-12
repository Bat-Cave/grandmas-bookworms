'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { AGE_GROUP_LABELS } from '@/lib/ageGroups'
import { toUserErrorMessage } from '@/lib/error-messages'

type ActivityFormState = {
  activityId: Id<'baseActivities'> | null
  name: string
  description: string
  ageGroup: string
  activityType: 'reading' | 'activity'
  raffleValue: string
}

const EMPTY_ACTIVITY_FORM: ActivityFormState = {
  activityId: null,
  name: '',
  description: '',
  ageGroup: 'All',
  activityType: 'reading',
  raffleValue: '1',
}

export function ActivityManager() {
  const membership = useQuery(api.organizations.getMyMembership, {})
  const activities = useQuery(
    api.baseActivities.listAll,
    membership?.role === 'admin' ? {} : 'skip',
  )
  const ensureDefaults = useMutation(api.baseActivities.ensureDefaults)
  const createActivity = useMutation(api.baseActivities.create)
  const updateActivity = useMutation(api.baseActivities.update)
  const removeActivity = useMutation(api.baseActivities.remove)

  const [activityForm, setActivityForm] =
    useState<ActivityFormState>(EMPTY_ACTIVITY_FORM)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [activitySaving, setActivitySaving] = useState(false)
  const [activityDeletingId, setActivityDeletingId] =
    useState<Id<'baseActivities'> | null>(null)
  const [activityInitializing, setActivityInitializing] = useState(false)

  const canManage = membership?.role === 'admin'

  useEffect(() => {
    if (!canManage || activities === undefined || activities.length > 0) return
    if (activityInitializing) return

    let cancelled = false
    setActivityInitializing(true)
    setActivityError(null)

    ensureDefaults()
      .catch((err) => {
        if (!cancelled) {
          setActivityError(toUserErrorMessage(err, 'Failed to load base activities'))
        }
      })
      .finally(() => {
        if (!cancelled) setActivityInitializing(false)
      })

    return () => {
      cancelled = true
    }
  }, [activities, activityInitializing, canManage, ensureDefaults])

  if (membership === undefined || (canManage && activities === undefined)) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!membership) {
    return <p className="text-muted-foreground">Join an organization first.</p>
  }

  if (!canManage) {
    return (
      <p className="text-muted-foreground">
        Only organization admins can manage activities.
      </p>
    )
  }

  const resetActivityForm = () => {
    setActivityForm(EMPTY_ACTIVITY_FORM)
    setActivityError(null)
  }

  const handleEditActivity = (activity: NonNullable<typeof activities>[number]) => {
    setActivityError(null)
    setActivityForm({
      activityId: activity._id,
      name: activity.name,
      description: activity.description ?? '',
      ageGroup: activity.ageGroup,
      activityType: activity.activityType,
      raffleValue: activity.raffleValue.toString(),
    })
  }

  const handleSaveActivity = async () => {
    setActivityError(null)
    setActivitySaving(true)
    try {
      const raffleValue = Number(activityForm.raffleValue.trim())
      if (!Number.isInteger(raffleValue) || raffleValue <= 0) {
        setActivityError('Raffle value must be a positive whole number.')
        return
      }

      const payload = {
        name: activityForm.name,
        description: activityForm.description,
        ageGroup: activityForm.ageGroup,
        activityType: activityForm.activityType,
        raffleValue,
      }

      if (activityForm.activityId) {
        await updateActivity({
          activityId: activityForm.activityId,
          ...payload,
        })
      } else {
        await createActivity(payload)
      }

      resetActivityForm()
    } catch (err) {
      setActivityError(toUserErrorMessage(err, 'Failed to save activity'))
    } finally {
      setActivitySaving(false)
    }
  }

  const handleDeleteActivity = async (activityId: Id<'baseActivities'>) => {
    setActivityError(null)
    setActivityDeletingId(activityId)
    try {
      await removeActivity({ activityId })
      if (activityForm.activityId === activityId) {
        resetActivityForm()
      }
    } catch (err) {
      setActivityError(toUserErrorMessage(err, 'Failed to delete activity'))
    } finally {
      setActivityDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base activities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-md border p-4">
          <div className="space-y-2">
            <Label htmlFor="activityName">Activity name</Label>
            <Input
              id="activityName"
              value={activityForm.name}
              onChange={(event) =>
                setActivityForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Read with grandma for 15 minutes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityDescription">Description</Label>
            <Textarea
              id="activityDescription"
              value={activityForm.description}
              onChange={(event) =>
                setActivityForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Helpful details participants should see before they start."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="activityAgeGroup">Age groups</Label>
              <Input
                id="activityAgeGroup"
                value={activityForm.ageGroup}
                onChange={(event) =>
                  setActivityForm((current) => ({
                    ...current,
                    ageGroup: event.target.value,
                  }))
                }
                placeholder="All or 6 - 8,9 - 11"
              />
              <p className="text-xs text-muted-foreground">
                Use `All` or a comma-separated list from {AGE_GROUP_LABELS.join(', ')}.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityType">Type</Label>
              <select
                id="activityType"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                value={activityForm.activityType}
                onChange={(event) =>
                  setActivityForm((current) => ({
                    ...current,
                    activityType: event.target.value as 'reading' | 'activity',
                  }))
                }
              >
                <option value="reading">Reading</option>
                <option value="activity">Activity</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityRaffleValue">Raffle tickets</Label>
              <Input
                id="activityRaffleValue"
                inputMode="numeric"
                value={activityForm.raffleValue}
                onChange={(event) =>
                  setActivityForm((current) => ({
                    ...current,
                    raffleValue: event.target.value,
                  }))
                }
                placeholder="1"
              />
            </div>
          </div>

          {activityError ? (
            <p className="text-sm text-destructive">{activityError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveActivity} disabled={activitySaving}>
              {activitySaving
                ? activityForm.activityId
                  ? 'Saving...'
                  : 'Adding...'
                : activityForm.activityId
                  ? 'Save changes'
                  : 'Add activity'}
            </Button>
            {activityForm.activityId ? (
              <Button
                variant="outline"
                onClick={resetActivityForm}
                disabled={activitySaving}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {activities?.length ?? 0} activities available for new bingo cards.
            </p>
            {activityInitializing ? (
              <p className="text-xs text-muted-foreground">
                Loading default activities...
              </p>
            ) : null}
          </div>

          {(activities ?? []).length === 0 && !activityInitializing ? (
            <p className="text-sm text-muted-foreground">No activities configured yet.</p>
          ) : (
            <ul className="space-y-3">
              {(activities ?? []).map((activity) => (
                <li key={activity._id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{activity.name}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {activity.activityType}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {activity.ageGroup}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {activity.raffleValue} tickets
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {activity.description || 'No description yet.'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditActivity(activity)}
                        disabled={activitySaving || activityDeletingId !== null}
                      >
                        Edit
                      </Button>
                      <DeleteConfirmation
                        title="Delete this activity?"
                        description="It will no longer appear on new bingo cards for your organization."
                        onConfirm={() => handleDeleteActivity(activity._id)}
                        disabled={
                          activitySaving ||
                          (activityDeletingId !== null &&
                            activityDeletingId !== activity._id)
                        }
                        pendingLabel="Deleting…"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            activitySaving ||
                            activityDeletingId === activity._id
                          }
                        >
                          {activityDeletingId === activity._id
                            ? 'Deleting...'
                            : 'Delete'}
                        </Button>
                      </DeleteConfirmation>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
