"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export type DeleteConfirmationProps = {
  /** Element that opens the dialog when activated (use `asChild` semantics via Radix trigger). */
  children: React.ReactElement
  /** Shown as the dialog heading. */
  title?: string
  /** Supporting copy below the title. */
  description?: React.ReactNode
  /** Runs when the user confirms; may be async (dialog stays open until it settles). */
  onConfirm: () => void | Promise<void>
  label?: string
  cancelLabel?: string
  pendingLabel?: string
  disabled?: boolean
}

const DEFAULT_TITLE = "Delete this item?"
const DEFAULT_DESCRIPTION =
  "This action cannot be undone. Are you sure you want to continue?"

export function DeleteConfirmation({
  children,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  onConfirm,
  label = "Delete",
  cancelLabel = "Cancel",
  pendingLabel = "Deleting…",
  disabled = false,
}: DeleteConfirmationProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const handleConfirm = React.useCallback(async () => {
    setPending(true)
    try {
      await Promise.resolve(onConfirm())
      setOpen(false)
    } finally {
      setPending(false)
    }
  }, [onConfirm])

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) return
        setOpen(next)
      }}
    >
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? pendingLabel : label}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
