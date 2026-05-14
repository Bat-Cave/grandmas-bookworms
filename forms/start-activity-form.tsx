'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  type StartActivityValues,
  startActivitySchema,
} from '@/validators/start-activity'

type StartActivityFormProps = {
  activityDescription?: string | null
  activityTimeRequired?: string | null
  loading?: boolean
  onSubmit: (values: StartActivityValues) => void | Promise<void>
}

export function StartActivityForm({
  activityDescription,
  activityTimeRequired,
  loading,
  onSubmit,
}: StartActivityFormProps) {
  const form = useForm<StartActivityValues>({
    resolver: zodResolver(startActivitySchema),
    defaultValues: {
      startDate: new Date().getTime().toString(),
    },
  })

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 h-full flex flex-col grow"
    >
      {activityDescription ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{activityDescription}</p>
        </div>
      ) : null}
      {activityTimeRequired?.trim() ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Time required</p>
          <p className="text-sm text-muted-foreground">
            {activityTimeRequired.trim()}
          </p>
        </div>
      ) : null}
      <Button type="submit" disabled={loading} className="mt-auto">
        {loading ? 'Starting…' : 'Start activity'}
      </Button>
    </form>
  )
}
