"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  onboardingAccountSchema,
  type OnboardingAccountFormValues,
} from "@/validators/onboarding-account";

type OnboardingAccountFormProps = {
  defaultValues?: Partial<OnboardingAccountFormValues>;
  loading?: boolean;
  submitError?: string | null;
  onSubmit: (values: OnboardingAccountFormValues) => void;
};

export function OnboardingAccountForm({
  defaultValues,
  loading,
  submitError,
  onSubmit,
}: OnboardingAccountFormProps) {
  const form = useForm<OnboardingAccountFormValues>({
    resolver: zodResolver(onboardingAccountSchema),
    defaultValues: {
      accountType: defaultValues?.accountType ?? "",
      displayName: defaultValues?.displayName ?? "",
      parentPasscode: defaultValues?.parentPasscode ?? "",
      parentPasscodeConfirm: defaultValues?.parentPasscodeConfirm ?? "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Account type</Label>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="individual"
              {...form.register("accountType")}
              className="h-4 w-4"
            />
            <span>Individual</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="family"
              {...form.register("accountType")}
              className="h-4 w-4"
            />
            <span>Family</span>
          </label>
        </div>
        {form.formState.errors.accountType && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.accountType.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          placeholder="e.g. Grandma, The Smiths"
          className="mt-1"
          {...form.register("displayName")}
        />
        {form.formState.errors.displayName && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.displayName.message}
          </p>
        )}
      </div>
      {form.watch("accountType") === "family" && (
        <>
          <div>
            <Label htmlFor="parentPasscode">Parent passcode</Label>
            <Input
              id="parentPasscode"
              placeholder="4-6 digits"
              className="mt-1"
              type="password"
              inputMode="numeric"
              {...form.register("parentPasscode")}
            />
            {form.formState.errors.parentPasscode && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.parentPasscode.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="parentPasscodeConfirm">Confirm passcode</Label>
            <Input
              id="parentPasscodeConfirm"
              placeholder="Repeat passcode"
              className="mt-1"
              type="password"
              inputMode="numeric"
              {...form.register("parentPasscodeConfirm")}
            />
            {form.formState.errors.parentPasscodeConfirm && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.parentPasscodeConfirm.message}
              </p>
            )}
          </div>
        </>
      )}
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Continue"}
      </Button>
    </form>
  );
}
