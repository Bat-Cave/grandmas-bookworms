import { z } from "zod/v3";

export const familyMemberSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  birthday: z
    .string()
    .trim()
    .min(1, "Birthday is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date"),
});

export type FamilyMemberValues = z.infer<typeof familyMemberSchema>;
