"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePickerSimple } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  onboardingOwnerSchema,
  type OnboardingOwnerValues,
} from "@/validators/onboarding-owner";

type OnboardingOwnerFormProps = {
  defaultValues?: Partial<OnboardingOwnerValues>;
  loading?: boolean;
  submitError?: string | null;
  accountType?: "individual" | "family";
  onSubmit: (values: OnboardingOwnerValues) => void;
};

export function OnboardingOwnerForm({
  defaultValues,
  loading,
  submitError,
  accountType,
  onSubmit,
}: OnboardingOwnerFormProps) {
  const form = useForm<OnboardingOwnerValues>({
    resolver: zodResolver(onboardingOwnerSchema),
    defaultValues: {
      ownerFirstName: defaultValues?.ownerFirstName ?? "",
      ownerLastName: defaultValues?.ownerLastName ?? "",
      ownerBirthday: defaultValues?.ownerBirthday ?? "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="ownerFirstName">First name</Label>
        <Input
          id="ownerFirstName"
          placeholder="First name"
          className="mt-1"
          {...form.register("ownerFirstName")}
        />
        {form.formState.errors.ownerFirstName && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.ownerFirstName.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="ownerLastName">Last name</Label>
        <Input
          id="ownerLastName"
          placeholder="Last name"
          className="mt-1"
          {...form.register("ownerLastName")}
        />
        {form.formState.errors.ownerLastName && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.ownerLastName.message}
          </p>
        )}
      </div>
      <div>
        <DatePickerSimple
          id="ownerBirthday"
          label="Birthday"
          value={
            form.watch("ownerBirthday")
              ? new Date(form.watch("ownerBirthday") as string)
              : undefined
          }
          onChange={(date) =>
            form.setValue(
              "ownerBirthday",
              date ? date.toISOString().split("T")[0] ?? "" : "",
            )
          }
        />
        {form.formState.errors.ownerBirthday && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.ownerBirthday.message}
          </p>
        )}
      </div>
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      <Button type="submit" disabled={loading}>
        {loading
          ? "Saving…"
          : accountType === "family"
            ? "Continue to add kids"
            : "Finish"}
      </Button>
    </form>
  );
}
