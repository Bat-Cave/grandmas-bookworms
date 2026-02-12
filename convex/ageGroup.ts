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
