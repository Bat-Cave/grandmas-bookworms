'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  type StartActivityValues,
  startActivitySchema,
} from '@/validators/start-activity'

type StartActivityFormProps = {
  loading?: boolean
  onSubmit: (values: StartActivityValues) => void | Promise<void>
}

export function StartActivityForm({
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
      <Button type="submit" disabled={loading}>
        {loading ? 'Starting…' : 'Start activity'}
      </Button>
    </form>
  )
}
