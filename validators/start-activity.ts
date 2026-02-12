import { z } from "zod/v3";

export const startActivitySchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
});

export type StartActivityValues = z.infer<typeof startActivitySchema>;
