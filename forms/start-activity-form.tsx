"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePickerSimple } from "@/components/ui/date-picker";
import {
  startActivitySchema,
  type StartActivityValues,
} from "@/validators/start-activity";

type StartActivityFormProps = {
  loading?: boolean;
  onSubmit: (values: StartActivityValues) => void | Promise<void>;
};

export function StartActivityForm({
  loading,
  onSubmit,
}: StartActivityFormProps) {
  const form = useForm<StartActivityValues>({
    resolver: zodResolver(startActivitySchema),
    defaultValues: {
      startDate: "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <DatePickerSimple
          id="startDate"
          label="Start date"
          value={
            form.watch("startDate")
              ? new Date(form.watch("startDate") as string)
              : undefined
          }
          onChange={(date) =>
            form.setValue(
              "startDate",
              date ? date.toISOString().split("T")[0] ?? "" : "",
            )
          }
        />
        {form.formState.errors.startDate && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.startDate.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Starting…" : "Start activity"}
      </Button>
    </form>
  );
}
