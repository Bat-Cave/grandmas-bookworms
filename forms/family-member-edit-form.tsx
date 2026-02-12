"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePickerSimple } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  familyMemberSchema,
  type FamilyMemberValues,
} from "@/validators/family-member";

type FamilyMemberEditFormProps = {
  defaultValues: FamilyMemberValues;
  onCancel: () => void;
  onSubmit: (values: FamilyMemberValues) => void | Promise<void>;
};

export function FamilyMemberEditForm({
  defaultValues,
  onCancel,
  onSubmit,
}: FamilyMemberEditFormProps) {
  const form = useForm<FamilyMemberValues>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-4">
      <div>
        <Label>First name</Label>
        <Input className="mt-1 w-40" {...form.register("firstName")} />
        {form.formState.errors.firstName && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.firstName.message}
          </p>
        )}
      </div>
      <div>
        <Label>Last name</Label>
        <Input className="mt-1 w-40" {...form.register("lastName")} />
        {form.formState.errors.lastName && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.lastName.message}
          </p>
        )}
      </div>
      <div>
        <DatePickerSimple
          id="birthday"
          label="Birthday"
          value={
            form.watch("birthday")
              ? new Date(form.watch("birthday") as string)
              : undefined
          }
          onChange={(date) =>
            form.setValue(
              "birthday",
              date ? date.toISOString().split("T")[0] ?? "" : "",
            )
          }
        />
        {form.formState.errors.birthday && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.birthday.message}
          </p>
        )}
      </div>
      <Button type="submit" size="sm">
        Save
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
