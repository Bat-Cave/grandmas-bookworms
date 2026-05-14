'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  timeRequired: string
  ageGroup: string
  activityType: 'reading' | 'activity'
  raffleValue: string
}

const EMPTY_ACTIVITY_FORM: ActivityFormState = {
  activityId: null,
  name: '',
  description: '',
  timeRequired: '',
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
  const [formError, setFormError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [activitySaving, setActivitySaving] = useState(false)
  const [activityDeletingId, setActivityDeletingId] =
    useState<Id<'baseActivities'> | null>(null)
  const [activityInitializing, setActivityInitializing] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)

  const canManage = membership?.role === 'admin'

  useEffect(() => {
    if (!canManage || activities === undefined || activities.length > 0) return
    if (activityInitializing) return

    let cancelled = false
    setActivityInitializing(true)
    setListError(null)

    ensureDefaults()
      .catch((err) => {
        if (!cancelled) {
          setListError(toUserErrorMessage(err, 'Failed to load base activities'))
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

  const closeFormModal = () => {
    setActivityForm(EMPTY_ACTIVITY_FORM)
    setFormError(null)
    setFormModalOpen(false)
  }

  const openAddModal = () => {
    setActivityForm(EMPTY_ACTIVITY_FORM)
    setFormError(null)
    setFormModalOpen(true)
  }

  const openEditModal = (activity: NonNullable<typeof activities>[number]) => {
    setFormError(null)
    setActivityForm({
      activityId: activity._id,
      name: activity.name,
      description: activity.description ?? '',
      timeRequired: activity.timeRequired ?? '',
      ageGroup: activity.ageGroup,
      activityType: activity.activityType,
      raffleValue: activity.raffleValue.toString(),
    })
    setFormModalOpen(true)
  }

  const handleSaveActivity = async () => {
    setFormError(null)
    setActivitySaving(true)
    try {
      const raffleValue = Number(activityForm.raffleValue.trim())
      if (!Number.isInteger(raffleValue) || raffleValue <= 0) {
        setFormError('Raffle value must be a positive whole number.')
        return
      }

      const timeTrimmed = activityForm.timeRequired.trim()
      const payload = {
        name: activityForm.name,
        description: activityForm.description,
        ...(timeTrimmed.length > 0 ? { timeRequired: timeTrimmed } : {}),
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

      closeFormModal()
    } catch (err) {
      setFormError(toUserErrorMessage(err, 'Failed to save activity'))
    } finally {
      setActivitySaving(false)
    }
  }

  const handleDeleteActivity = async (activityId: Id<'baseActivities'>) => {
    setListError(null)
    setActivityDeletingId(activityId)
    try {
      await removeActivity({ activityId })
      if (activityForm.activityId === activityId) {
        closeFormModal()
      }
    } catch (err) {
      setListError(toUserErrorMessage(err, 'Failed to delete activity'))
    } finally {
      setActivityDeletingId(null)
    }
  }

  const isEditing = activityForm.activityId !== null

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Base activities</CardTitle>
        <Button type="button" onClick={openAddModal} disabled={activitySaving}>
          Add activity
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {listError ? <p className="text-sm text-destructive">{listError}</p> : null}

        <Dialog
          open={formModalOpen}
          onOpenChange={(open) => {
            if (!open && !activitySaving) {
              closeFormModal()
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit activity' : 'Add activity'}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update this activity. It will be used for new bingo cards and when resolving details for existing squares.'
                  : "Create an activity for your organization's bingo pool."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="activityTimeRequired">Time required (optional)</Label>
                <Input
                  id="activityTimeRequired"
                  value={activityForm.timeRequired}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      timeRequired: event.target.value,
                    }))
                  }
                  placeholder="e.g. 15 minutes, 1 hour"
                />
                <p className="text-xs text-muted-foreground">
                  Shown on the card so readers know roughly how long the activity takes.
                </p>
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

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeFormModal}
                disabled={activitySaving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveActivity} disabled={activitySaving}>
                {activitySaving
                  ? isEditing
                    ? 'Saving...'
                    : 'Adding...'
                  : isEditing
                    ? 'Save changes'
                    : 'Add activity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                      {activity.timeRequired?.trim() ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Time:</span>{' '}
                          {activity.timeRequired.trim()}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(activity)}
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
