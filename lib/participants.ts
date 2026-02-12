import { getAgeGroupFromBirthday } from "./ageGroups";

export function getParticipantDisplayName(p: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return fullName || "Unknown";
}

export function getParticipantAgeGroup(p: {
  birthday?: string | null;
}): string {
  return getAgeGroupFromBirthday(p.birthday);
}
