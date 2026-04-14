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
  loading?: boolean
  onSubmit: (values: StartActivityValues) => void | Promise<void>
}

export function StartActivityForm({
  activityDescription,
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {activityDescription ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Before you start</p>
          <Textarea
            value={activityDescription}
            readOnly
            className="min-h-24 resize-none"
          />
        </div>
      ) : null}
      <Button type="submit" disabled={loading}>
        {loading ? 'Starting…' : 'Start activity'}
      </Button>
    </form>
  )
}
