import { z } from "zod/v3";

export const familyMemberAddSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    birthday: z
      .string()
      .trim()
      .min(1, "Birthday is required")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date"),
    unlockType: z.enum(["pin", "emoji"]),
    unlockValue: z.string().trim().min(1, "Unlock is required"),
  })
  .superRefine((values, ctx) => {
    if (values.unlockType === "pin") {
      if (!/^\d{4,6}$/.test(values.unlockValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PIN must be 4-6 digits",
          path: ["unlockValue"],
        });
      }
    }
    if (values.unlockType === "emoji") {
      const count = values.unlockValue.split("-").filter(Boolean).length;
      if (count < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick at least 3 emojis",
          path: ["unlockValue"],
        });
      }
    }
  });

export type FamilyMemberAddValues = z.infer<typeof familyMemberAddSchema>;
