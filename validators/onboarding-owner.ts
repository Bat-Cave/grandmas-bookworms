import { z } from "zod/v3";

export const onboardingOwnerSchema = z.object({
  ownerFirstName: z.string().trim().min(1, "First name is required"),
  ownerLastName: z.string().trim().min(1, "Last name is required"),
  ownerBirthday: z
    .string()
    .trim()
    .min(1, "Birthday is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date"),
});

export type OnboardingOwnerValues = z.infer<typeof onboardingOwnerSchema>;
