# Dynamic Badge System — Plan

## Current state

- **Badges awarded in 3 places**, with hardcoded checks:
  - **`activityCompletions.ts`**: `first_activity` (any first completion), `ten_activities` (totalCompleted ≥ 10), `first_line` (lineCount > 0).
  - **`messages.ts`**: `helper` (first message sent).
  - **`first_bingo`**: referenced in ideas/rewards but not yet awarded anywhere (would need to run when card is fully completed).
- **Storage**: `participantBadges` (participantId, badgeId, periodKey?, earnedAt); `badgeDefinitions` (badgeId, name, description?, icon?, iconStorageId) — used by `getBadgesForParticipant` for display.
- **UI**: `Badge` in `components/badge.tsx` has `variant`: `base` | `rare` | `epic` | `legendary`, but rewards page currently passes `variant="legendary"` for all badges.

You want badges to **update dynamically** for any N (e.g. 5, 10, 25, 50, 100 activities; 1, 2, 5 messages; 1, 2 lines; etc.) and to **style by significance** (using your existing variant system).

---

## 1. Badge definition model (dynamic + significance)

Move from “one hardcoded badge per idea” to a **metric + threshold + tier** model so adding new milestones doesn’t require scattered code changes.

### 1.1 Metrics (what we count)

| Metric              | Source / how to get count                         | Example badges                          |
|---------------------|----------------------------------------------------|-----------------------------------------|
| `activity_count`    | Count completed `activityCompletions` (per participant) | 1, 10, 25, 50, 100 activities           |
| `line_count`        | Count `bingoLines` (per participant)              | 1 line, 2 lines, both diagonals, etc.   |
| `message_count`     | Count `messages` sent (per participant)           | 1 message (helper), 5 (super helper)    |
| `bingo_count`       | Full card completions (blackout)                  | First BINGO                              |
| (Optional later)    | `streak_days`, `activity_types_count`             | Week warrior, variety reader            |

### 1.2 Two kinds of badges

- **Threshold badges**: “Earn when metric ≥ N.”  
  - e.g. `activity_count` ≥ 10 → “10 activities”, ≥ 25 → “25 activities”.  
  - `badgeId` can be deterministic: e.g. `activities_10`, `activities_25`, `messages_1`, `messages_5`, `lines_1`, `lines_2`.
- **One-off / special**: first BINGO, “both diagonals”, “all four corners”.  
  - Can still be expressed as threshold (e.g. lines with a special “line type” or a single “bingo_count” threshold) or as separate badge types if you prefer.

### 1.3 Significance (tier) for styling

Map each badge to a **tier** so the UI can pass `variant` into your existing `Badge` component:

- **base** — small milestones (e.g. first activity, first message, 10 activities).
- **rare** — next step (e.g. 25 activities, 2 lines, 5 messages).
- **epic** — big milestones (e.g. 50 activities, first BINGO).
- **legendary** — top tier (e.g. 100 activities, blackout, super helper).

Store `tier` (or `significance`) on the badge definition so the backend and frontend both know how to style it.

---

## 2. Single source of truth: milestone config

Define milestones in one place (code or DB), then derive badge IDs and names from it.

**Option A — Config in code (simplest):**

```ts
// e.g. lib/badges/milestones.ts or convex/badges/config.ts
export const ACTIVITY_MILESTONES = [
  { threshold: 1,   name: 'First activity',        tier: 'base' },
  { threshold: 10,  name: '10 activities',         tier: 'base' },
  { threshold: 25,  name: '25 activities',         tier: 'rare' },
  { threshold: 50,  name: '50 activities',         tier: 'epic' },
  { threshold: 100, name: 'Reading champion',       tier: 'legendary' },
] as const

export const LINE_MILESTONES = [
  { threshold: 1, name: 'First line',     tier: 'base' },
  { threshold: 2, name: 'Two lines',      tier: 'rare' },
  // optional: special badges for diagonals, corners, blackout
]

export const MESSAGE_MILESTONES = [
  { threshold: 1, name: 'Helped a friend',   tier: 'base' },
  { threshold: 5, name: 'Super helper',      tier: 'rare' },
]
```

- `badgeId`: e.g. `activities_1`, `activities_10`, `lines_1`, `messages_1`.  
- Names and tiers come from this config; you can still keep a separate `badgeDefinitions` table for icon/description/iconStorageId if you want, keyed by `badgeId`.

**Option B — Full definitions in DB:**  
Store metric, threshold, name, tier, description, icon in `badgeDefinitions`. Then a single “evaluate badges” function can query all definitions and award any that are newly satisfied. More flexible, but requires seeding and maintaining definitions in Convex.

Recommendation: start with **Option A** (config in code) so you can add many milestones without touching the DB schema; later you can move to Option B if you want non-developers to edit milestones.

---

## 3. Backend: unified “evaluate badges” flow

- **Where to run:**  
  After any mutation that changes a metric:
  - Complete activity → activity_count, possibly line_count (and bingo_count if you add blackout detection).
  - Send message → message_count.
- **Logic (single helper or small module):**
  1. Load **current counts** for the participant (activity completions, bingo lines, messages sent, full bingos if you track that).
  2. For each **metric** that might have changed, get the list of threshold badges (from config or DB).
  3. For each threshold where `count >= threshold`:
     - Compute `badgeId` (e.g. `activities_10`).
     - If the participant does **not** already have that `badgeId` in `participantBadges`, insert a row (participantId, badgeId, periodKey?, earnedAt).

This replaces the current scattered `if (!hasFirstActivity) ...`, `if (!hasTen && totalCompleted >= 10) ...`, etc., with one loop over milestones.

- **Backward compatibility:**  
  Keep existing `badgeId`s for already-awarded badges. Map old IDs to new ones if you change naming (e.g. `first_activity` → `activities_1`), or keep awarding both `first_activity` and `activities_1` and treat them as the same in the UI (e.g. only show one).

---

## 4. Schema / storage

- **participantBadges:** Keep as is (participantId, badgeId, periodKey?, earnedAt).
- **badgeDefinitions (optional):**  
  - If you use Option A, you can keep this table for display only: name override, description, icon/iconStorageId, and **tier** (so the UI doesn’t need to duplicate tier logic).  
  - If a badge is missing from `badgeDefinitions`, fall back to config-driven name and a default tier (e.g. `base`).

If you want to avoid storing images per badge, you can derive icon from tier or badgeId (e.g. Lucide icon name from `badge-ideas.ts`) and render it in the existing `Badge` component (content = icon, label = name).

---

## 5. Frontend: dynamic list + significance styling

- **Data:**  
  `getBadgesForParticipant` already returns badgeId, name, description, icon, earnedAt. Extend the return type (or the definition source) to include **tier** (base | rare | epic | legendary).
- **Rewards page:**  
  For each badge, pass `variant={badge.tier ?? 'base'}` (and content/label as now) so the existing `Badge` component drives style from significance.
- **Badge component:**  
  No change required; you already support `variant`. Optionally add more distinctive styling per variant (e.g. stronger iridescence for legendary, subtle gradient for rare).

---

## 6. Implementation order

1. **Add milestone config** (Option A) and a small `convex/badges/` (or shared) module that:
   - Exports milestone arrays and a function `getBadgeId(metric, threshold)` (e.g. `activities_10`).
   - Exports tier for a given badgeId (from config).
2. **Add “evaluate badges” helper** that, given participantId and current counts (activity, line, message, bingo), computes which badgeIds should be earned and inserts missing rows into `participantBadges`. Call this from `completeActivity` and `sendMessage` (and later from any place that grants a full BINGO).
3. **Refactor `completeActivity`**:  
   - Compute activity_count and line_count (and bingo_count if applicable).  
   - Call the evaluate-badges helper instead of the current first_activity / ten_activities / first_line blocks.
4. **Refactor `sendMessage`**:  
   - Compute message_count, call evaluate-badges for message milestones.
5. **Add first BINGO / blackout detection** (when completed squares = 25 for a card), and call evaluate-badges for `bingo_count >= 1`.
6. **Ensure badge definitions (or getBadgesForParticipant) expose tier** and update the rewards page to pass `variant={tier}`. If you use Lucide icons by name from `badge-ideas.ts`, wire `content` to the correct icon component from the badgeId/metric/threshold.

---

## 7. Optional: “progress to next badge”

With thresholds in one place, you can add a “progress” query: for each metric, return current count, next threshold, and the next badge name. That powers “You’re 3 activities away from 25 activities!” on the dashboard or rewards page.

---

## Summary

- **Dynamic:** One config (or DB table) of metrics + thresholds; backend evaluates all relevant badges after each action and grants any newly reached milestone.
- **Styling:** Each badge definition (or config entry) has a **tier**; the existing `Badge` component’s `variant` is set from that tier so significance drives the look.
- **Backward compatible:** Keep existing badgeIds or map them so current users don’t lose badges; new badges use a consistent naming scheme (e.g. `activities_10`, `lines_1`, `messages_5`).

If you tell me whether you prefer config-in-code (Option A) or full DB-driven definitions (Option B), I can outline the exact TypeScript types and Convex function signatures next, or we can start implementing the config + evaluate-badges flow step by step.
