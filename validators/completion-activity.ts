import { z } from "zod/v3";
import type { FormFieldConfig } from "@/lib/completionFormConfig";

function optionalText(required: boolean) {
  const base = z.string().trim();
  return required ? base.min(1, "Required") : base.optional().or(z.literal(""));
}

function optionalDate(required: boolean) {
  const base = z.string();
  return required ? base.min(1, "Required") : base.optional().or(z.literal(""));
}

function optionalNumber(required: boolean) {
  const numberBase = z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    z.number({ invalid_type_error: "Must be a number" })
  );

  return required ? numberBase : numberBase.optional();
}

export function buildCompletionActivitySchema(
  fields: FormFieldConfig[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (field.type === "number") {
      shape[field.key] = optionalNumber(field.required);
      continue;
    }
    if (field.type === "date") {
      shape[field.key] = optionalDate(field.required);
      continue;
    }
    shape[field.key] = optionalText(field.required);
  }

  return z.object(shape);
}
