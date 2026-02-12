"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePickerSimple } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  familyMemberAddSchema,
  type FamilyMemberAddValues,
} from "@/validators/family-member-add";
import { EmojiSequenceInput } from "@/components/family/emoji-sequence-input";

type FamilyMemberAddFormProps = {
  loading?: boolean;
  onSubmit: (values: FamilyMemberAddValues) => void | Promise<void>;
};

export function FamilyMemberAddForm({
  loading,
  onSubmit,
}: FamilyMemberAddFormProps) {
  const form = useForm<FamilyMemberAddValues>({
    resolver: zodResolver(familyMemberAddSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      birthday: "",
      unlockType: "pin",
      unlockValue: "",
    },
  });

  const handleSubmit = async (values: FamilyMemberAddValues) => {
    await onSubmit(values);
    form.reset({
      firstName: "",
      lastName: "",
      birthday: "",
      unlockType: "pin",
      unlockValue: "",
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-w-sm">
      <div>
        <Label>First name</Label>
        <Input
          placeholder="First name"
          className="mt-1"
          {...form.register("firstName")}
        />
        {form.formState.errors.firstName && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.firstName.message}
          </p>
        )}
      </div>
      <div>
        <Label>Last name</Label>
        <Input
          placeholder="Last name"
          className="mt-1"
          {...form.register("lastName")}
        />
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
      <div>
        <Label>Quick unlock</Label>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="pin"
              {...form.register("unlockType")}
              className="h-4 w-4"
            />
            <span>PIN (4-6 digits)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="emoji"
              {...form.register("unlockType")}
              className="h-4 w-4"
            />
            <span>Emoji sequence</span>
          </label>
        </div>
      </div>
      {form.watch("unlockType") === "pin" ? (
        <div>
          <Label>PIN</Label>
          <Input
            placeholder="e.g. 1234"
            className="mt-1"
            inputMode="numeric"
            type="password"
            {...form.register("unlockValue")}
          />
          {form.formState.errors.unlockValue && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.unlockValue.message}
            </p>
          )}
        </div>
      ) : (
        <div>
          <Label>Emoji sequence</Label>
          <input type="hidden" {...form.register("unlockValue")} />
          <EmojiSequenceInput
            value={form.watch("unlockValue")}
            onChange={(value) => form.setValue("unlockValue", value)}
          />
          {form.formState.errors.unlockValue && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.unlockValue.message}
            </p>
          )}
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
