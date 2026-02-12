# Grandma's Bookworms – App Overview

Reference document for AI tools and developers. This is a **family book club** app where kids and grandkids record reading activities on a BINGO card, earn raffle tickets and badges, and send positive messages to each other.

---

## Tech stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, ShadCN UI
- **Backend / DB**: Convex (real-time database, server functions, auth)
- **Auth**: Clerk (JWT passed to Convex via `ConvexProviderWithClerk`)

---

## Account types

| Type         | Description |
|--------------|-------------|
| **Individual** | One person (adult or older kid). One account → one participant. |
| **Family**     | Parent runs the account and can add **members** (sub-users, e.g. kids). One account → one **owner** participant + zero or more **member** participants. |

- Each **participant** (owner or member) has their own BINGO card, completions, raffle tickets, and badges.
- `ownerId` on `accounts` is the Clerk user id (`getUserIdentity().subject`).

---

## Age groups

Used for filtering activities, completion forms, and display. Defined in **`lib/ageGroups.ts`**.

| Label   | Color (hex) |
|---------|-------------|
| All     | #F87171     |
| 0 - 5   | #FB923C     |
| 6 - 8   | #FBBF24     |
| 9 - 11  | #4ADE80     |
| 12 - 14 | #38BDF8     |
| 15 - 18 | #A78BFA     |
| Adult   | #F472B6     |

- **Participants** have an optional `ageGroup` (and optional `birthday`; age can be derived via `getAgeGroupFromBirthday()` in `lib/ageGroups.ts`).
- **Base activities** have an `ageGroup` string (e.g. `"All"` or `"6 - 8,9 - 11"`); activities are filtered by whether the participant’s age group is included or `"All"`.

---

## Routes (App Router)

| Path | Purpose |
|------|---------|
| `/` | Landing (signed out) or redirect to `/dashboard` or `/onboarding` (signed in). |
| `/onboarding` | First-time setup: account type, display name, owner participant (name, age group, birthday), then for Family add kids. |
| `/(app)/dashboard` | Overview: BINGO card CTA, messages, participants list, rewards, seed button. |
| `/(app)/card` | BINGO card: participant selector, 5×5 grid (center FREE), start/complete activity. |
| `/(app)/messages` | Received / Sent / Send positive messages (club = all participants). |
| `/(app)/family` | Family accounts only: add kid, list members, edit member (name, age group, birthday). |
| `/(app)/rewards` | Raffle tickets per participant, badges and BINGO lines per selected participant. |
| `/server` | Demo of Convex server-side preload (optional). |

- **`(app)` layout**: Ensures user has an account; redirects to `/onboarding` if not.

---

## Convex schema (main tables)

- **accounts** – `ownerId`, `type` (individual | family), `displayName`, optional `isAdmin`. Index: `by_owner`.
- **participants** – `accountId`, optional `firstName` / `lastName` / `name`, optional `birthday`, optional `ageGroup`, `role` (owner | member), optional `avatarStorageId`. Indexes: `by_account`, `by_account_and_role`.
- **baseActivities** – `name`, `ageGroup` (string, comma-separated or "All"), `activityType` (reading | activity), `raffleValue`, optional `baseActivityId`.
- **bingoCards** – `participantId`, `periodKey` (e.g. `"current"`). Index: `by_participant_and_period`.
- **bingoSquares** – `bingoCardId`, `position` (0–24, row-major), optional `baseActivityId` (null = FREE at position 12). Index: `by_card`.
- **activityCompletions** – `bingoSquareId`, `participantId`, `startedAt`, optional `completedAt`, optional `formData`. Indexes: `by_square`, `by_participant`.
- **raffleTickets** – `participantId`, `periodKey`, `ticketCount`. Index: `by_participant_and_period`.
- **bingoLines** – `bingoCardId`, `participantId`, `lineType` (row | column | diagonal), `lineIndex`, `completedAt`. Indexes: `by_card`, `by_participant`.
- **badgeDefinitions** – `badgeId`, `name`, optional `description`, optional `icon`. Index: `by_badge_id`.
- **participantBadges** – `participantId`, `badgeId`, optional `periodKey`, `earnedAt`. Indexes: `by_participant`, `by_badge`.
- **messages** – `senderId`, `recipientId`, `body`. Indexes: `by_recipient`, `by_sender`.

---

## Convex modules (convex/)

| File | Purpose |
|------|---------|
| `schema.ts` | Table and index definitions. |
| `auth.config.ts` | Clerk JWT issuer config for Convex auth. |
| `accounts.ts` | `getMyAccount`, `createAccount`, `updateAccount`. |
| `participants.ts` | `listByAccount`, `listMyParticipants`, `listClubParticipants`, `createOwnerParticipant`, `addMember`, `updateParticipant`, etc. |
| `baseActivities.ts` | `listForAgeGroup`, `listAll`, `seedBaseActivities`. |
| `bingoCards.ts` | `getOrCreateForParticipant` (5×5, center FREE), `getCardForParticipant`, `getCardWithSquares`. |
| `activityCompletions.ts` | `startActivity`, `completeActivity` (updates raffle, BINGO lines, badges), `getCompletionForSquare`, `listCompletionsForCard`. |
| `messages.ts` | `sendMessage`, `listReceived`, `listSent` (helper badge on first send). |
| `rewards.ts` | `getRaffleTicketsForParticipant`, `getRaffleTicketsForMyParticipants`, `getBadgesForParticipant`, `getBingoLinesForParticipant`, `seedBadgeDefinitions`. |

---

## BINGO rules

- **Layout**: 5×5 grid; position **12** (center) is **FREE**; other 24 squares are random base activities valid for the participant’s age group.
- **Flow**: Click square → set start date → start activity → later open completion form (age-based) → submit → square marked complete, raffle tickets and BINGO lines/badges updated.

---

## Completion form (age-based)

- **Config-driven**: `lib/completionFormConfig.ts` defines fields per age group (e.g. book title, minutes, “completed with”, favorite part, summary).
- **Component**: Single form component iterates over config; `formData` stored on `activityCompletions`.

---

## Rewards

- **Raffle tickets**: Per participant per period; used by “mom” for a real-world raffle. Earned from activity `raffleValue` and +1 per BINGO line.
- **Badges**: Defined in `badgeDefinitions`; awarded into `participantBadges` (e.g. first activity, 10 activities, first line, helper for sending a message).

---

## Key frontend paths

- **App shell / nav**: `app/(app)/layout.tsx`
- **Landing / redirect**: `app/page.tsx`
- **Onboarding**: `app/onboarding/page.tsx`
- **Dashboard**: `app/(app)/dashboard/page.tsx`
- **BINGO card**: `app/(app)/card/page.tsx`
- **Messages**: `app/(app)/messages/page.tsx`
- **Family**: `app/(app)/family/page.tsx`
- **Rewards**: `app/(app)/rewards/page.tsx`
- **Constants / age groups**: `lib/ageGroups.ts`
- **Completion form config**: `lib/completionFormConfig.ts`
- **Providers**: `app/providers.tsx` (Clerk + Convex); `components/ConvexClientProvider.tsx` (Convex + Clerk auth).

---

## One-time setup

- **Convex**: Set `CLERK_JWT_ISSUER_DOMAIN` in Convex Dashboard (from Clerk “convex” JWT template issuer URL).
- **Clerk**: Create a JWT template named **convex** and use its issuer in Convex.
- **App**: On first use, run “Seed activities and badges” from the dashboard so BINGO and rewards work.
