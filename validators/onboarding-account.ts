import { z } from "zod/v3";

export const onboardingAccountSchema = z.object({
  accountType: z
    .enum(["individual", "family"])
    .or(z.literal(""))
    .refine((value) => value !== "", { message: "Choose an account type" }),
  displayName: z.string().trim().min(1, "Display name is required"),
  parentPasscode: z.string().trim().optional(),
  parentPasscodeConfirm: z.string().trim().optional(),
}).superRefine((values, ctx) => {
  if (values.accountType === "family") {
    if (!values.parentPasscode || !/^\d{4,6}$/.test(values.parentPasscode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Parent passcode must be 4-6 digits",
        path: ["parentPasscode"],
      });
    }
    if (values.parentPasscode !== values.parentPasscodeConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passcodes do not match",
        path: ["parentPasscodeConfirm"],
      });
    }
  }
});

export type OnboardingAccountFormValues = z.input<typeof onboardingAccountSchema>;
export type OnboardingAccountValues = z.infer<typeof onboardingAccountSchema>;
