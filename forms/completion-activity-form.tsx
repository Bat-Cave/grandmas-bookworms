"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldConfig } from "@/lib/completionFormConfig";
import { buildCompletionActivitySchema } from "@/validators/completion-activity";

type CompletionActivityValues = Record<string, string | number | undefined>;

type CompletionActivityFormProps = {
  fields: FormFieldConfig[];
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CompletionActivityValues) => void | Promise<void>;
};

export function CompletionActivityForm({
  fields,
  loading,
  onCancel,
  onSubmit,
}: CompletionActivityFormProps) {
  const schema = useMemo(() => buildCompletionActivitySchema(fields), [fields]);
  const form = useForm<CompletionActivityValues>({
    resolver: zodResolver(schema) as Resolver<CompletionActivityValues>,
    defaultValues: fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = "";
      return acc;
    }, {}),
  });

  const handleSubmit = async (values: CompletionActivityValues) => {
    await onSubmit(values);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {fields.map((field) => {
        const error = form.formState.errors[field.key];
        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && " *"}
            </Label>
            {field.type === "textarea" ? (
              <Textarea
                id={field.key}
                placeholder={field.placeholder}
                className="mt-1 min-h-[80px]"
                {...form.register(field.key)}
              />
            ) : (
              <Input
                id={field.key}
                type={field.type}
                placeholder={field.placeholder}
                className="mt-1"
                {...form.register(field.key)}
              />
            )}
            {error && (
              <p className="text-sm text-destructive mt-1">
                {error.message as string}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Mark complete"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
