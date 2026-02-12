"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/convex/_generated/dataModel";
import { getParticipantAgeGroup, getParticipantDisplayName } from "@/lib/participants";
import {
  messageSendSchema,
  type MessageSendValues,
} from "@/validators/message-send";

type ParticipantOption = {
  _id: Id<"participants">;
  firstName?: string | null;
  lastName?: string | null;
  birthday?: string | null;
};

type MessageSendFormProps = {
  participants: ParticipantOption[];
  loading?: boolean;
  onSubmit: (values: MessageSendValues) => void | Promise<void>;
};

export function MessageSendForm({
  participants,
  loading,
  onSubmit,
}: MessageSendFormProps) {
  const form = useForm<MessageSendValues>({
    resolver: zodResolver(messageSendSchema),
    mode: "onChange",
    defaultValues: {
      recipientId: "",
      body: "",
    },
  });

  const handleSubmit = async (values: MessageSendValues) => {
    await onSubmit(values);
    form.reset({ recipientId: "", body: "" });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label>To</Label>
        <select
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          {...form.register("recipientId")}
        >
          <option value="">Select a person…</option>
          {participants.map((p) => (
            <option key={p._id} value={p._id}>
              {getParticipantDisplayName(p)} ({getParticipantAgeGroup(p)})
            </option>
          ))}
        </select>
        {form.formState.errors.recipientId && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.recipientId.message}
          </p>
        )}
      </div>
      <div>
        <Label>Message</Label>
        <Textarea
          placeholder="Write something kind..."
          className="mt-1 min-h-[100px]"
          {...form.register("body")}
        />
        {form.formState.errors.body && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.body.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={loading || !form.formState.isValid}
      >
        {loading ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
