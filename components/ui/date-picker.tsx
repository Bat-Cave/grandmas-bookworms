'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type DatePickerSimpleProps = {
  label: string
  id?: string
  /** When provided, the picker is controlled (e.g. for use with react-hook-form). */
  value?: Date
  defaultValue?: Date
  onChange?: (date: Date | undefined) => void
}

export function DatePickerSimple(props: DatePickerSimpleProps) {
  const { label, id = 'date', value, defaultValue, onChange } = props
  const isControlled = 'value' in props
  const [open, setOpen] = React.useState(false)
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    defaultValue,
  )
  const date = isControlled ? value : internalDate

  React.useEffect(() => {
    if (isControlled && value === undefined) {
      setInternalDate(undefined)
    }
  }, [isControlled, value])

  return (
    <Field className="mx-auto w-44">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="justify-start font-normal"
          >
            {date ? date.toLocaleDateString() : 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            onSelect={(selected) => {
              setInternalDate(selected)
              onChange?.(selected)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
