'use client'

import { useMutation, useQuery } from 'convex/react'
import { ArrowRight, KeyRound, Shapes } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/convex/_generated/api'
import { toUserErrorMessage } from '@/lib/error-messages'

export default function OrganizationPage() {
  const membership = useQuery(api.organizations.getMyMembership, {})
  const roster = useQuery(
    api.organizations.getMyOrganizationRoster,
    membership?.role === 'admin' ? {} : 'skip',
  )
  const revokeMember = useMutation(api.organizations.revokeMember)
  const [removingOwnerId, setRemovingOwnerId] = useState<string | null>(null)
  const [memberError, setMemberError] = useState<string | null>(null)

  if (
    membership === undefined ||
    (membership?.role === 'admin' && roster === undefined)
  ) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!membership) {
    return <p className="text-muted-foreground">Join an organization first.</p>
  }

  if (membership.role !== 'admin') {
    return (
      <p className="text-muted-foreground">
        Only organization admins can access organization settings.
      </p>
    )
  }

  const handleRemoveMember = async (ownerId: string) => {
    setMemberError(null)
    setRemovingOwnerId(ownerId)
    try {
      await revokeMember({ ownerId })
    } catch (error) {
      setMemberError(toUserErrorMessage(error, 'Failed to remove member'))
    } finally {
      setRemovingOwnerId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Organization Admin</h1>
        <p className="text-muted-foreground">
          Choose what you want to manage for {membership.organizationName}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/organization/activities" className="block">
          <Card className="h-full transition hover:border-foreground/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shapes className="size-5" />
                Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add, edit, or delete the activities that appear on future bingo
                cards.
              </p>
              <p className="text-sm font-medium flex items-center gap-2">
                Open activities
                <ArrowRight className="size-4" />
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/organization/invites" className="block">
          <Card className="h-full transition hover:border-foreground/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-5" />
                Invite Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Create and revoke invite codes for families and members joining
                the organization.
              </p>
              <p className="text-sm font-medium flex items-center gap-2">
                Open invites
                <ArrowRight className="size-4" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {memberError ? (
            <p className="text-sm text-destructive">{memberError}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Accounts</p>
              <p className="text-xl font-semibold">
                {roster?.totals.accounts ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Families</p>
              <p className="text-xl font-semibold">
                {roster?.totals.families ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Individuals</p>
              <p className="text-xl font-semibold">
                {roster?.totals.individuals ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Participants</p>
              <p className="text-xl font-semibold">
                {roster?.totals.participants ?? 0}
              </p>
            </div>
          </div>

          {(roster?.families.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Families</h3>
              <ul className="space-y-2">
                {(roster?.families ?? []).map((family) => (
                  <li
                    key={family.accountId}
                    className="rounded-md border p-3 text-sm"
                  >
                    {(() => {
                      const isCurrentUser =
                        family.ownerId === membership.ownerId
                      return (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{family.displayName}</p>
                            <p className="text-muted-foreground">
                              {family.participantCount} participants
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {family.members
                                .map((member) =>
                                  member.role === 'owner'
                                    ? `${member.name} (owner${family.ownerId === membership.ownerId ? ', me' : ''})`
                                    : member.name,
                                )
                                .join(', ')}
                            </p>
                          </div>
                          {isCurrentUser ? (
                            <span className="text-xs text-muted-foreground">
                              Current user
                            </span>
                          ) : (
                            <DeleteConfirmation
                              title="Remove this member?"
                              description="They will lose access to your organization and its activities."
                              label="Remove"
                              pendingLabel="Removing…"
                              onConfirm={() =>
                                handleRemoveMember(family.ownerId)
                              }
                              disabled={
                                removingOwnerId !== null &&
                                removingOwnerId !== family.ownerId
                              }
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  removingOwnerId === family.ownerId
                                }
                              >
                                {removingOwnerId === family.ownerId
                                  ? 'Removing...'
                                  : 'Remove'}
                              </Button>
                            </DeleteConfirmation>
                          )}
                        </div>
                      )
                    })()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(roster?.individuals.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Individuals</h3>
              <ul className="space-y-2">
                {(roster?.individuals ?? []).map((individual) => (
                  <li
                    key={individual.accountId}
                    className="rounded-md border p-3 text-sm"
                  >
                    {(() => {
                      const isCurrentUser =
                        individual.ownerId === membership.ownerId
                      return (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {individual.displayName}
                            </p>
                            <p className="text-muted-foreground">
                              {individual.members[0]?.name ?? 'Unknown'} (owner
                              {individual.ownerId === membership.ownerId
                                ? ', me'
                                : ''}
                              )
                            </p>
                          </div>
                          {isCurrentUser ? (
                            <span className="text-xs text-muted-foreground">
                              Current user
                            </span>
                          ) : (
                            <DeleteConfirmation
                              title="Remove this member?"
                              description="They will lose access to your organization and its activities."
                              label="Remove"
                              pendingLabel="Removing…"
                              onConfirm={() =>
                                handleRemoveMember(individual.ownerId)
                              }
                              disabled={
                                removingOwnerId !== null &&
                                removingOwnerId !== individual.ownerId
                              }
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  removingOwnerId === individual.ownerId
                                }
                              >
                                {removingOwnerId === individual.ownerId
                                  ? 'Removing...'
                                  : 'Remove'}
                              </Button>
                            </DeleteConfirmation>
                          )}
                        </div>
                      )
                    })()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
