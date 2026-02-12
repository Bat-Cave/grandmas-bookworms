'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DatePickerSimple } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmojiSequenceInput } from '@/components/family/emoji-sequence-input'
import {
  type OnboardingKidsValues,
  onboardingKidsSchema,
} from '@/validators/onboarding-kids'

type OnboardingKidsFormProps = {
  defaultValues?: OnboardingKidsValues
  loading?: boolean
  submitError?: string | null
  onSubmit: (values: OnboardingKidsValues) => void
  onSkip: () => void
}

const DEFAULT_KID = {
  firstName: '',
  lastName: '',
  birthday: '',
  unlockType: 'pin' as const,
  unlockValue: '',
}

export function OnboardingKidsForm({
  defaultValues,
  loading,
  submitError,
  onSubmit,
  onSkip,
}: OnboardingKidsFormProps) {
  const form = useForm<OnboardingKidsValues>({
    resolver: zodResolver(onboardingKidsSchema),
    defaultValues: defaultValues ?? { kids: [DEFAULT_KID] },
  })

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'kids',
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {fields.map((field, i) => (
        <div key={field.id} className="rounded-lg border p-4 space-y-3">
          <div>
            <Label>First name</Label>
            <Input
              placeholder="First name"
              className="mt-1"
              {...form.register(`kids.${i}.firstName`)}
            />
            {form.formState.errors.kids?.[i]?.firstName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.kids?.[i]?.firstName?.message}
              </p>
            )}
          </div>
          <div>
            <Label>Last name</Label>
            <Input
              placeholder="Last name"
              className="mt-1"
              {...form.register(`kids.${i}.lastName`)}
            />
            {form.formState.errors.kids?.[i]?.lastName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.kids?.[i]?.lastName?.message}
              </p>
            )}
          </div>
          <div>
            <DatePickerSimple
              id={`kid-birthday-${i}`}
              label="Birthday"
              value={
                form.watch(`kids.${i}.birthday`)
                  ? new Date(form.watch(`kids.${i}.birthday`) as string)
                  : undefined
              }
              onChange={(date) =>
                form.setValue(
                  `kids.${i}.birthday`,
                  date ? (date.toISOString().split('T')[0] ?? '') : '',
                )
              }
            />
            {form.formState.errors.kids?.[i]?.birthday && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.kids?.[i]?.birthday?.message}
              </p>
            )}
          </div>
          <div>
            <Label>Quick unlock</Label>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="pin"
                  {...form.register(`kids.${i}.unlockType`)}
                  className="h-4 w-4"
                />
                <span>PIN</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="emoji"
                  {...form.register(`kids.${i}.unlockType`)}
                  className="h-4 w-4"
                />
                <span>Emoji</span>
              </label>
            </div>
          </div>
          {form.watch(`kids.${i}.unlockType`) === 'pin' ? (
            <div>
              <Label>PIN</Label>
              <Input
                placeholder="e.g. 1234"
                className="mt-1"
                inputMode="numeric"
                type="password"
                {...form.register(`kids.${i}.unlockValue`)}
              />
              {form.formState.errors.kids?.[i]?.unlockValue && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.kids?.[i]?.unlockValue?.message}
                </p>
              )}
            </div>
          ) : (
            <div>
              <Label>Emoji sequence</Label>
              <input type="hidden" {...form.register(`kids.${i}.unlockValue`)} />
              <EmojiSequenceInput
                value={form.watch(`kids.${i}.unlockValue`) ?? ''}
                onChange={(value) =>
                  form.setValue(`kids.${i}.unlockValue`, value)
                }
              />
              {form.formState.errors.kids?.[i]?.unlockValue && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.kids?.[i]?.unlockValue?.message}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => append(DEFAULT_KID)}
      >
        Add another kid
      </Button>
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Go to dashboard'}
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </form>
  )
}
