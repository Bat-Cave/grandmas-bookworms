import { z } from "zod/v3";

export const messageSendSchema = z.object({
  recipientId: z.string().min(1, "Choose a recipient"),
  body: z.string().trim().min(1, "Message is required"),
});

export type MessageSendValues = z.infer<typeof messageSendSchema>;
