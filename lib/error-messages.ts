const ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Please sign in and try again.',
  FORBIDDEN: 'You do not have permission to do that.',
  MEMBERSHIP_REQUIRED: 'Join or create an organization first.',
  NO_ACCOUNT: 'Finish account onboarding before continuing.',
  ACCOUNT_ALREADY_EXISTS: 'An account already exists for this user.',
  ALREADY_IN_ORGANIZATION: 'You are already in an organization.',
  ORG_MISMATCH: 'That action is not allowed outside your organization.',
  PARTICIPANT_NOT_FOUND: 'Participant not found.',
  SQUARE_NOT_FOUND: 'Activity square was not found.',
  COMPLETION_NOT_FOUND: 'Activity completion was not found.',
  ACTIVITY_ALREADY_STARTED: 'This activity was already started.',
  ALREADY_COMPLETED: 'This activity has already been completed.',
  INSUFFICIENT_ACTIVITIES_FOR_AGE_GROUP:
    'Not enough activities are configured for this age group.',
  ONLY_FAMILY_CAN_ADD_MEMBERS: 'Only family accounts can add members.',
  OWNER_PARTICIPANT_ALREADY_EXISTS: 'Owner participant already exists.',
  PARENT_PASSCODE_NOT_SET: 'Set a parent passcode first.',
  INCORRECT_PARENT_PASSCODE: 'Parent passcode is incorrect.',
  INVITE_INVALID: 'That invite code is invalid.',
  INVITE_EXPIRED: 'That invite code has expired.',
  INVITE_EXHAUSTED: 'That invite code has reached its usage limit.',
  INVITE_REVOKED: 'That invite code has been revoked.',
  INVITE_NOT_FOUND: 'Invite was not found.',
  ACTIVITY_NOT_FOUND: 'Activity was not found.',
  MEMBER_NOT_FOUND: 'Organization member was not found.',
  CANNOT_REMOVE_YOURSELF: 'You cannot remove your own admin access.',
  LAST_ADMIN_CANNOT_BE_REMOVED: 'This organization must keep at least one admin.',
  INVALID_ACTIVITY_NAME: 'Activity name is required.',
  INVALID_ACTIVITY_DESCRIPTION: 'Activity description is too long.',
  INVALID_ACTIVITY_TIME_REQUIRED: 'Time required must be at most 120 characters.',
  INVALID_ACTIVITY_AGE_GROUP: 'Choose at least one valid age group.',
  INVALID_ACTIVITY_RAFFLE_VALUE: 'Raffle value must be a positive whole number.',
  SENDER_NOT_FOUND: 'Sender profile was not found.',
  RECIPIENT_NOT_FOUND: 'Recipient profile was not found.',
}

function getErrorText(error: unknown): string | null {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return null
}

export function getErrorCode(error: unknown): string | null {
  const message = getErrorText(error)
  if (!message) return null

  const match = message.match(/[A-Z][A-Z0-9_]+/g)
  if (!match || match.length === 0) return null

  for (let index = match.length - 1; index >= 0; index -= 1) {
    const code = match[index]!
    if (ERROR_MESSAGES[code]) return code
  }

  return null
}

export function toUserErrorMessage(error: unknown, fallback: string): string {
  const code = getErrorCode(error)
  if (code) return ERROR_MESSAGES[code]

  const message = getErrorText(error)
  if (!message) return fallback
  return message
}
