export type FieldType = "text" | "number" | "date" | "textarea";

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Omit when completing a non-reading square (e.g. crafts, games). */
  readingOnly?: boolean;
}

export interface AgeGroupFormConfig {
  ageGroup: string;
  fields: FormFieldConfig[];
}

const bookTitleField: FormFieldConfig = {
  key: "bookTitle",
  label: "Book or story title",
  type: "text",
  required: true,
  placeholder: "e.g. The Cat in the Hat",
  readingOnly: true,
};

const bookAuthorField: FormFieldConfig = {
  key: "bookAuthor",
  label: "Book author (optional)",
  type: "text",
  required: false,
  placeholder: "e.g. Dr. Seuss — leave blank if you are not sure",
  readingOnly: true,
};

const baseFields: FormFieldConfig[] = [
  bookTitleField,
  bookAuthorField,
  {
    key: "minutes",
    label: "Minutes spent",
    type: "number",
    required: false,
    placeholder: "10",
  },
];

const completedWith: FormFieldConfig = {
  key: "completedWith",
  label: "Completed with (e.g. mom, dad)",
  type: "text",
  required: false,
  placeholder: "Mom",
};

const favoritePart: FormFieldConfig = {
  key: "favoritePart",
  label: "What was your favorite part?",
  type: "textarea",
  required: false,
  placeholder: "Tell us a little bit!",
};

const summary: FormFieldConfig = {
  key: "summary",
  label: "Short summary or thoughts (optional)",
  type: "textarea",
  required: false,
  placeholder: "Anything you want to share",
};

export const completionFormConfigByAgeGroup: AgeGroupFormConfig[] = [
  { ageGroup: "All", fields: [...baseFields, completedWith] },
  { ageGroup: "0 - 5", fields: [...baseFields, completedWith] },
  { ageGroup: "6 - 8", fields: [...baseFields, completedWith, favoritePart] },
  { ageGroup: "9 - 11", fields: [...baseFields, completedWith, favoritePart] },
  { ageGroup: "12 - 14", fields: [...baseFields, favoritePart, summary] },
  { ageGroup: "15 - 18", fields: [...baseFields, favoritePart, summary] },
  { ageGroup: "Adult", fields: [...baseFields, summary] },
];

/** How the bingo square was categorized when the card was built (or from live base activity). */
export type CompletionActivityKind = "reading" | "activity" | null;

export function getFormConfigForAgeGroup(
  ageGroup: string,
  activityKind?: CompletionActivityKind,
): FormFieldConfig[] {
  const config = completionFormConfigByAgeGroup.find(
    (c) => c.ageGroup === ageGroup
  );
  const fields = config?.fields ?? completionFormConfigByAgeGroup[0]!.fields;

  if (activityKind === "activity") {
    return fields.filter((field) => !field.readingOnly);
  }

  return fields;
}
