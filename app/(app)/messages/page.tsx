'use client'

import { useMutation, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { useFamilySession } from '@/components/family/family-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { MessageSendForm } from '@/forms/message-send-form'
import { cn } from '@/lib/utils'

type ThreadMessage = {
  _id: Id<'messages'>
  _creationTime: number
  body: string
  direction: 'in' | 'out'
  otherName: string
}

type Contact = {
  participantId: Id<'participants'>
  name: string
  lastActivity: number
  lastPreview: string
}

export default function MessagesPage() {
  const received = useQuery(api.messages.listReceived, {})
  const sent = useQuery(api.messages.listSent, {})
  const clubParticipants = useQuery(api.participants.listMessageRecipients, {})
  const myParticipants = useQuery(api.participants.listMyParticipants, {})
  const account = useQuery(api.accounts.getMyAccount, {})
  const sendMessage = useMutation(api.messages.sendMessage)
  const { activeParticipantId } = useFamilySession()

  const [selectedContactId, setSelectedContactId] =
    useState<Id<'participants'> | null>(null)
  const [sending, setSending] = useState(false)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')

  const myParticipantIds = new Set((myParticipants ?? []).map((p) => p._id))
  const otherParticipants = (clubParticipants ?? []).filter(
    (p) => !myParticipantIds.has(p._id),
  )
  const visibleReceived =
    account?.type === 'family' && activeParticipantId
      ? (received ?? []).filter((m) => m.recipientId === activeParticipantId)
      : (received ?? [])
  const visibleSent =
    account?.type === 'family' && activeParticipantId
      ? (sent ?? []).filter((m) => m.senderId === activeParticipantId)
      : (sent ?? [])

  const currentSenderId =
    account?.type === 'family'
      ? activeParticipantId
      : (myParticipants?.[0]?._id ?? null)

  const contacts: Contact[] = useMemo(() => {
    const byId = new Map<
      Id<'participants'>,
      { name: string; lastActivity: number; lastPreview: string }
    >()
    for (const m of visibleReceived) {
      const existing = byId.get(m.senderId)
      if (!existing || m._creationTime > existing.lastActivity) {
        byId.set(m.senderId, {
          name: m.senderName,
          lastActivity: m._creationTime,
          lastPreview: m.body,
        })
      }
    }
    for (const m of visibleSent) {
      const existing = byId.get(m.recipientId)
      if (!existing || m._creationTime > existing.lastActivity) {
        byId.set(m.recipientId, {
          name: m.recipientName,
          lastActivity: m._creationTime,
          lastPreview: m.body,
        })
      }
    }
    return Array.from(byId.entries())
      .map(([participantId, { name, lastActivity, lastPreview }]) => ({
        participantId,
        name,
        lastActivity,
        lastPreview,
      }))
      .sort((a, b) => b.lastActivity - a.lastActivity)
  }, [visibleReceived, visibleSent])

  const threadMessages: ThreadMessage[] = useMemo(() => {
    if (!selectedContactId) return []
    const incoming = visibleReceived
      .filter((m) => m.senderId === selectedContactId)
      .map((m) => ({
        _id: m._id,
        _creationTime: m._creationTime,
        body: m.body,
        direction: 'in' as const,
        otherName: m.senderName,
      }))
    const outgoing = visibleSent
      .filter((m) => m.recipientId === selectedContactId)
      .map((m) => ({
        _id: m._id,
        _creationTime: m._creationTime,
        body: m.body,
        direction: 'out' as const,
        otherName: m.recipientName,
      }))
    return [...incoming, ...outgoing].sort(
      (a, b) => a._creationTime - b._creationTime,
    )
  }, [selectedContactId, visibleReceived, visibleSent])

  const selectedContact = contacts.find(
    (c) => c.participantId === selectedContactId,
  )

  const handleSendNew = async (values: {
    recipientId: string
    body: string
  }) => {
    if (!currentSenderId) return
    setSending(true)
    try {
      await sendMessage({
        recipientId: values.recipientId as Id<'participants'>,
        senderId: currentSenderId,
        body: values.body.trim(),
      })
      setSelectedContactId(values.recipientId as Id<'participants'>)
      setShowNewMessage(false)
    } finally {
      setSending(false)
    }
  }

  const handleReply = async () => {
    if (!currentSenderId || !selectedContactId || !replyDraft.trim()) return
    setSending(true)
    try {
      await sendMessage({
        recipientId: selectedContactId,
        senderId: currentSenderId,
        body: replyDraft.trim(),
      })
      setReplyDraft('')
    } finally {
      setSending(false)
    }
  }

  const isLoading = received === undefined || sent === undefined

  return (
    <div className="max-w-4xl mx-auto flex h-[calc(100vh-8rem)] flex-col gap-4 md:flex-row md:gap-6">
      <Card className="flex w-full shrink-0 gap-0 flex-col md:w-72">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Messages</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowNewMessage(true)
              setSelectedContactId(null)
            }}
          >
            New message
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          {isLoading ? (
            <p className="px-6 pb-4 text-sm text-muted-foreground">Loading…</p>
          ) : showNewMessage ? (
            <div className="px-4 pb-4">
              <MessageSendForm
                participants={otherParticipants}
                loading={sending}
                onSubmit={handleSendNew}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setShowNewMessage(false)}
              >
                Cancel
              </Button>
            </div>
          ) : contacts.length === 0 ? (
            <p className="px-6 pb-4 text-sm text-muted-foreground">
              No conversations yet. Send a message to get started.
            </p>
          ) : (
            <div className="grow overflow-y-auto">
              <ul className="space-y-0">
                {contacts.map((c) => (
                  <li key={c.participantId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContactId(c.participantId)
                        setShowNewMessage(false)
                      }}
                      className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted/80 ${
                        selectedContactId === c.participantId ? 'bg-muted' : ''
                      }`}
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {c.lastPreview}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col">
        {selectedContactId && selectedContact ? (
          <>
            <CardHeader>
              <CardTitle className="text-lg">
                Conversation with {selectedContact.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-0">
              <div className="flex-1 overflow-y-auto px-6">
                <ul className="space-y-4 pb-4">
                  {threadMessages.map((m) => (
                    <li
                      key={m._id}
                      className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2 ${
                          m.direction === 'out'
                            ? 'bg-primary text-primary-foreground'
                            : 'border bg-muted/50'
                        }`}
                      >
                        <p
                          className={cn(
                            'text-xs opacity-90',
                            m.direction === 'out'
                              ? 'text-primary-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {m.direction === 'out' ? 'You' : m.otherName}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t px-6 py-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Reply…"
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    className="min-h-[80px] flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleReply()
                      }
                    }}
                  />
                  <Button
                    onClick={handleReply}
                    disabled={sending || !replyDraft.trim()}
                    className="shrink-0 self-end"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : !showNewMessage ? (
          <CardContent className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">
              Select a conversation or start a new message.
            </p>
          </CardContent>
        ) : null}
      </Card>
    </div>
  )
}
