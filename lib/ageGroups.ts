const ageGroups = [
  { label: "All", color: "#F87171" },
  { label: "0 - 5", color: "#FB923C" },
  { label: "6 - 8", color: "#FBBF24" },
  { label: "9 - 11", color: "#4ADE80" },
  { label: "12 - 14", color: "#38BDF8" },
  { label: "15 - 18", color: "#A78BFA" },
  { label: "Adult", color: "#F472B6" },
];

export default ageGroups;

export const AGE_GROUP_LABELS = ageGroups.map((g) => g.label);

export function getAgeGroupFromBirthday(
  birthday?: string | null,
  now: Date = new Date()
): string {
  if (!birthday) return "All";
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return "All";

  let age = now.getFullYear() - date.getFullYear();
  const monthDelta = now.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }

  if (age < 0) return "All";
  if (age <= 5) return "0 - 5";
  if (age <= 8) return "6 - 8";
  if (age <= 11) return "9 - 11";
  if (age <= 14) return "12 - 14";
  if (age <= 18) return "15 - 18";
  return "Adult";
}
