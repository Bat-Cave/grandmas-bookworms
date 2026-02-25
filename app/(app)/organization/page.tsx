'use client'

import { useMutation, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { toUserErrorMessage } from '@/lib/error-messages'

function formatDateTime(value: number) {
  return new Date(value).toLocaleString()
}

export default function OrganizationPage() {
  const membership = useQuery(api.organizations.getMyMembership, {})
  const invites = useQuery(
    api.organizations.listMyOrganizationInvites,
    membership?.role === 'admin' ? {} : 'skip',
  )
  const createInvite = useMutation(api.organizations.createInvite)
  const revokeInvite = useMutation(api.organizations.revokeInvite)

  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [latestCode, setLatestCode] = useState<string | null>(null)
  const [copiedInviteId, setCopiedInviteId] = useState<Id<'organizationInvites'> | null>(
    null,
  )
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<Id<'organizationInvites'> | null>(
    null,
  )

  const canManage = membership?.role === 'admin'

  const inviteStats = useMemo(() => {
    const all = invites ?? []
    const active = all.filter((invite) => !invite.isRevoked && !invite.isExpired)
    return {
      total: all.length,
      active: active.length,
    }
  }, [invites])

  if (
    membership === undefined ||
    (membership?.role === 'admin' && invites === undefined)
  ) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!membership) {
    return <p className="text-muted-foreground">Join an organization first.</p>
  }

  if (!canManage) {
    return (
      <p className="text-muted-foreground">
        Only organization admins can manage invites.
      </p>
    )
  }

  const handleCreateInvite = async () => {
    if (!membership) return

    setError(null)
    setCreating(true)
    try {
      const parsedMaxUses = maxUses.trim() ? Number(maxUses.trim()) : undefined
      if (parsedMaxUses !== undefined) {
        if (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0) {
          setError('Max uses must be a positive whole number.')
          return
        }
      }

      const parsedExpiresAt = expiresAt.trim()
        ? new Date(expiresAt.trim()).getTime()
        : undefined
      if (parsedExpiresAt !== undefined) {
        if (Number.isNaN(parsedExpiresAt)) {
          setError('Expiration must be a valid date/time.')
          return
        }
        if (parsedExpiresAt <= Date.now()) {
          setError('Expiration must be in the future.')
          return
        }
      }

      const result = await createInvite({
        organizationId: membership.organizationId,
        maxUses: parsedMaxUses,
        expiresAt: parsedExpiresAt,
      })
      setLatestCode(result.code)
      setCopied(false)
      setMaxUses('')
      setExpiresAt('')
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to create invite'))
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLatestCode = async () => {
    if (!latestCode) return
    try {
      await navigator.clipboard.writeText(latestCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy invite code. Please copy it manually.')
    }
  }

  const handleCopyInviteCode = async (
    inviteId: Id<'organizationInvites'>,
    code?: string,
  ) => {
    if (!code) {
      setError('This older invite does not have a stored code.')
      return
    }
    try {
      await navigator.clipboard.writeText(code)
      setCopiedInviteId(inviteId)
      setTimeout(() => setCopiedInviteId(null), 1500)
    } catch {
      setError('Could not copy invite code. Please copy it manually.')
    }
  }

  const handleRevoke = async (inviteId: Id<'organizationInvites'>) => {
    setError(null)
    setRevokingId(inviteId)
    try {
      await revokeInvite({ inviteId })
    } catch (err) {
      setError(toUserErrorMessage(err, 'Failed to revoke invite'))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organization Invites</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max uses (optional)</Label>
              <Input
                id="maxUses"
                inputMode="numeric"
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires at (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>

          {latestCode ? (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">Share this invite code now</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-semibold">{latestCode}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLatestCode}
                  disabled={creating}
                >
                  {copied ? 'Copied' : 'Copy code'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Invite codes are only shown once for security.
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={handleCreateInvite} disabled={creating || revokingId !== null}>
            {creating ? 'Creating...' : 'Create invite'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Invites ({inviteStats.active} active / {inviteStats.total} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            You can copy invite codes from this list at any time.
          </p>
          {(invites ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            <ul className="space-y-3">
              {(invites ?? []).map((invite) => {
                const exhausted =
                  invite.maxUses !== undefined && invite.useCount >= invite.maxUses
                const status = invite.isRevoked
                  ? 'Revoked'
                  : invite.isExpired
                    ? 'Expired'
                    : exhausted
                      ? 'Exhausted'
                      : 'Active'

                return (
                  <li key={invite._id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 text-sm">
                        <p>
                          Code:{' '}
                          <span className="font-mono">
                            {invite.code ?? 'Unavailable'}
                          </span>
                        </p>
                        <p>Status: {status}</p>
                        <p>Created: {formatDateTime(invite.createdAt)}</p>
                        <p>
                          Uses: {invite.useCount}
                          {invite.maxUses !== undefined
                            ? ` / ${invite.maxUses}`
                            : ' / unlimited'}
                        </p>
                        <p>
                          Expires:{' '}
                          {invite.expiresAt
                            ? formatDateTime(invite.expiresAt)
                            : 'never'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!invite.code || creating}
                          onClick={() => handleCopyInviteCode(invite._id, invite.code)}
                        >
                          {copiedInviteId === invite._id ? 'Copied' : 'Copy code'}
                        </Button>
                        {!invite.isRevoked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={revokingId === invite._id || creating}
                            onClick={() => handleRevoke(invite._id)}
                          >
                            {revokingId === invite._id ? 'Revoking...' : 'Revoke'}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
