# Badges and Rewards MVP Implementation Plan

This document turns the feature ideas in `FEATURE_SPECIFICATION_BADGES_AND_COINS.md` and `BADGE_LIST.md` into a repo-specific MVP plan for this codebase.

Operational rollout and validation steps are documented separately in `REWARDS_ROLLOUT_CHECKLIST.md`.

It reflects the current product decisions that have been agreed for MVP:

- Coins are out of scope for MVP.
- Specialist per-dimension quality badges are deferred.
- Logging in to the app is itself a meaningful activity and can grant a modest reward once per day.
- Trophy cases follow existing profile access rules.
- Public leaderboards are intended to be broadly visible later, but leaderboards are not part of MVP.
- Streak badges are re-earnable after resets.

## 1. MVP Scope

### In scope

- Seniority as a separate axis on users
- Daily login tracking
- Login streak tracking
- Immutable weekly per-user snapshots
- Core badge evaluation and badge awards
- Trophy case and current streak UI
- Admin-configurable seniority thresholds
- Admin rewards settings and debug overview
- Completion timestamp hardening for reliable weekly snapshot calculations
- `HEAD_OF_ANIMATION` support in evaluator role handling

### Out of scope

- Coins
- Cosmetics shop
- Perks
- Team/studio goals
- Game performance metrics and imports
- Leaderboards
- Head Pick
- Economy balancing UI
- Badge CRUD admin UI

## 2. Locked Product Decisions

### 2.1 Task ownership

- `TASK` cards are the only cards with direct story points.
- `USER_STORY` and `EPIC` cards only summarize connected task story points.
- `TASK` cards should have exactly one assignee by business rule.
- Snapshot attribution assumes one assignee per task.

### 2.2 Seniority

- Seniority is separate from company role.
- Seniority values for MVP: `JUNIOR`, `MID`, `SENIOR`.
- Seniority is stored directly on `User`.
- Seniority is admin-editable.
- Future role naming in the UI can present seniority as a sub-role, but the data model should remain `role + seniority`.

### 2.3 Login activity

- Opening the app while authenticated counts as meaningful activity.
- No extra action is required beyond daily app access.
- Daily login reward/tracking is limited to once per calendar day per user.
- The first authenticated app visit of the day is the event that should be recorded.

### 2.4 Trophy case and visibility

- A user can only view trophy cases on profiles they can already access.
- Public leaderboards, when implemented later, can be visible broadly.
- Leaderboards are not part of MVP.

### 2.5 Streaks and re-earning

- Streak badges are re-earnable after a streak resets.
- Historical milestone awards and current streak state are separate concepts.
- `BadgeAward` must therefore allow multiple awards of the same badge definition for the same user over time.

### 2.6 Specialist quality badges

- Specialist per-dimension badges are deferred from MVP.
- Reason: the current review dimension system is configurable and does not yet have stable system-level identifiers suitable for long-term badge mapping.

## 3. Existing Codebase Inputs

The current codebase already contains most of the raw data needed for the MVP:

- `Card`, `List`, and `taskData.storyPoints` for task completion and velocity
- `ReviewCycle`, `Evaluation`, and `EvaluationScore` for quality and reviewer activity
- quality aggregation helpers in `src/lib/quality-review.ts`
- week bucketing helper in `src/lib/quality-review-api.ts`
- existing metrics routes for comparison and validation
- cron route patterns secured by `CRON_SECRET`
- user, team, studio, and role relationships in Prisma
- user detail and home UI surfaces that can host reward summaries

What does not exist yet and must be introduced:

- Seniority on users
- Reliable task `completedAt`
- Daily login tracking
- Weekly per-user snapshots
- Badge definitions, live streak state, and historical badge awards

## 4. MVP Badge Set

### Ship in MVP

- Login streak badges
  - First Week
  - Two-Weeker
  - Month Strong
  - Dedicated
  - Quarterly Regular
  - Half-Year Hero
  - Year One

- Login milestone badges
  - Getting Started
  - Regular
  - Centurion Login
  - Power User
  - Institution

- Velocity streak badges
  - Warm-Up
  - Steady Hand
  - In the Flow
  - On a Roll
  - Powerhouse
  - Force of Nature
  - Each with Bronze, Silver, Gold, Platinum, Diamond, Legendary milestone levels

- Velocity milestone badges
  - Big Week
  - Monster Week
  - Studio Legend
  - Centurion

- Quality consistency badges
  - Craft Conscious
  - Quality Standard
  - Master Craftsperson
  - Sharp Eye
  - Studio Benchmark

- Combined quality + velocity badges
  - Balanced Act
  - The Complete Package
  - Studio MVP
  - Untouchable

- Reviewer badges
  - First Reviews
  - Dedicated Reviewer
  - Review Veteran
  - Always Watching
  - Quality Guardian
  - Calibrated Eye

### Deferred from MVP

- Specialist per-dimension quality badges
- Efficiency badges
- Special / rare badges
- Team / studio goal badges
- Game performance badges
- Head Pick badges

## 5. Prisma Schema Changes

Update `prisma/schema.prisma`.

### 5.1 Enums

Add:

```prisma
enum Seniority {
  JUNIOR
  MID
  SENIOR
}

enum BadgeCategory {
  LOGIN
  VELOCITY_STREAK
  VELOCITY_MILESTONE
  QUALITY_CONSISTENCY
  QUALITY_VELOCITY_COMBINED
  REVIEWER
}
```

Extend:

```prisma
enum EvaluatorRole {
  LEAD
  PO
  HEAD_OF_ART
  HEAD_OF_ANIMATION
}
```

### 5.2 Existing model updates

Add to `User`:

```prisma
seniority Seniority?
```

Add to `Card`:

```prisma
completedAt DateTime?
```

### 5.3 New models

Add:

- `SeniorityConfig`
- `DailyLoginRecord`
- `LoginStreak`
- `WeeklySnapshot`
- `BadgeDefinition`
- `BadgeAward`
- `UserStreak`

Important notes:

- `BadgeAward` must not enforce uniqueness on `[userId, badgeDefinitionId]`.
- `UserStreak` represents current live streak state only.
- `BadgeAward` represents historical earned milestones.

## 6. Required Data Rules

### 6.1 Single task assignee

App-level enforcement is required:

- task create flow should require one assignee
- task assignee update flow should reject multiple assignees
- snapshot builder should treat zero-assignee tasks as invalid for per-user attribution
- snapshot builder should log or fail loudly on multi-assignee task data depending on environment

### 6.2 Completion timestamp

`completedAt` must be treated as the authoritative task completion timestamp.

- Set `completedAt` when a task enters a Done list
- Clear `completedAt` when a task leaves Done
- Never use `updatedAt` for weekly reward calculations

### 6.3 Snapshot source-of-truth

The weekly snapshot is the source of truth for weekly badge evaluation.

- Historical snapshots are immutable
- Threshold evaluation should use `seniorityAtSnapshot`
- Later profile and dashboard UI should read from snapshots and awards, not recompute from live task tables

## 7. Reward Domain Module Layout

Create a dedicated reward domain under:

- `src/lib/rewards/`

Recommended files:

- `src/lib/rewards/seniority.ts`
- `src/lib/rewards/login-tracking.ts`
- `src/lib/rewards/snapshot-builder.ts`
- `src/lib/rewards/snapshot-types.ts`
- `src/lib/rewards/thresholds.ts`
- `src/lib/rewards/streak-engine.ts`
- `src/lib/rewards/badge-engine.ts`
- `src/lib/rewards/badge-seed-data.ts`

Recommended responsibilities:

### `seniority.ts`

- load and validate `SeniorityConfig`
- compute effective expected points and quality thresholds
- determine whether a user participates in artist-track badge paths

### `login-tracking.ts`

- record first authenticated app visit of day
- create `DailyLoginRecord`
- update `LoginStreak`
- evaluate login streak and login milestone badges
- remain idempotent for repeated calls in the same day

### `snapshot-builder.ts`

- build weekly snapshot rows per user
- gather completed tasks by `completedAt`
- aggregate quality from final review cycles
- aggregate reviewer metrics
- return both persisted snapshots and debug/validation output

### `thresholds.ts`

- turn seniority config into actual per-user weekly thresholds
- resolve velocity tier thresholds
- resolve quality expectations

### `streak-engine.ts`

- update `UserStreak` rows from new weekly snapshots
- reset or advance streaks
- keep current and longest counts

### `badge-engine.ts`

- evaluate badge qualification from login updates and weekly snapshots
- write `BadgeAward` rows
- treat streak milestones as historical awards
- allow re-earning after resets

### `badge-seed-data.ts`

- canonical MVP badge definitions
- slugs, names, categories, tiers, descriptions, icon references

## 8. CompletedAt Integration Plan

Modify task transition handling in:

- `src/lib/quality-review.ts`
- `src/app/api/boards/[boardId]/cards/[cardId]/route.ts`

When `handleCardListTransition()` determines:

- `movedToDone`: set `Card.completedAt = now`
- `reopenedFromDone`: set `Card.completedAt = null`

This should happen inside the same transaction as review cycle closing/finalization.

### Backfill guidance

Historical backfill should be conservative.

- If a task is currently in Done and there is a trustworthy final-cycle or transition timestamp, use it.
- If no trustworthy completion timing exists, leave `completedAt` null rather than inventing dates.
- Weekly snapshot validation should explicitly measure how much historical data is incomplete.

## 9. Weekly Snapshot Design

Each `WeeklySnapshot` should contain:

- `storyPointsCompleted`
- `cardsCompleted`
- `avgQualityScore`
- `avgTechnicalQuality`
- `avgArtDirection`
- `avgContextFit`
- `avgDelivery`
- `scoredCardCount`
- `firstPassCount`
- `firstPassRate`
- `avgReviewCycles`
- `evaluationsSubmitted`
- `evaluationEligible`
- `evaluationRate`
- `seniorityAtSnapshot`

### Week boundaries

- Monday 00:00 UTC to Sunday 23:59:59 UTC
- Reuse the existing week normalization approach already present in `src/lib/quality-review-api.ts`

### Velocity source

- `TASK` cards only
- `completedAt` within the week
- one valid assignee
- story points from `taskData.storyPoints`

### Quality source

- final review cycle only
- aggregated average across the completed task's final evaluation scores

### Reviewer source

- submitted evaluations during the week
- eligible reviews based on review opportunities assigned to the reviewer in the same week

### Efficiency fields

Efficiency data can still be captured in snapshots during MVP even if efficiency badges are deferred.

## 10. Badge Evaluation Design

MVP should use code-driven evaluator families rather than a fully generic JSON rule engine.

`BadgeDefinition.conditions` can still exist as metadata, but badge qualification should live in code for now.

Recommended evaluator families:

- login streak evaluator
- login milestone evaluator
- velocity streak evaluator
- velocity milestone evaluator
- quality consistency evaluator
- combined quality + velocity evaluator
- reviewer badge evaluator

### Streak storage model

Use `UserStreak` for live state with example keys such as:

- `velocity_warm_up`
- `velocity_steady_hand`
- `velocity_in_the_flow`
- `velocity_on_a_roll`
- `velocity_powerhouse`
- `velocity_force_of_nature`
- `quality_expected`
- `quality_above_expected`
- `quality_velocity_expected`
- `quality_velocity_mvp`
- `quality_velocity_untouchable`
- `reviewer_completion_90`
- `login_daily`

Historical awards should be stored in `BadgeAward`.

## 11. API Plan

### New routes

Login:

- `POST /api/login/record`
- `GET /api/login/streak`

Badges and streaks:

- `GET /api/badges`
- `GET /api/badges/my`
- `GET /api/badges/user/:userId`
- `GET /api/streaks/my`
- `GET /api/streaks/user/:userId`

Admin:

- `GET /api/admin/seniority-config`
- `PATCH /api/admin/seniority-config/:seniority`
- `GET /api/admin/rewards/overview`
- `GET /api/admin/rewards/users/:userId/history`

Cron:

- `POST /api/cron/rewards/weekly-snapshot`
- `POST /api/cron/rewards/backfill-snapshots`

### Existing route updates

Update:

- `src/app/api/users/route.ts`
- `src/app/api/users/[userId]/route.ts`

Add `seniority` to:

- create user payloads
- update user payloads
- user list responses
- user detail responses

Optionally extend:

- `src/app/api/me/home/route.ts`

with:

- current login streak
- active weekly streak summary
- recent badge awards

## 12. UI Plan

### User create/edit

Extend:

- `src/components/users/CreateUserDialog.tsx`
- `src/components/users/EditUserDialog.tsx`
- `src/components/users/UserFormSections.tsx`

Add:

- seniority selector in admin-managed user forms

### User detail

Extend:

- `src/components/users/UserDetailClient.tsx`

Add sections for:

- seniority display
- trophy case
- recent badge history
- current active streaks

### Home

Extend:

- `src/components/home/HomePageClient.tsx`

Add a lightweight rewards summary card showing:

- current login streak
- active weekly streaks
- latest badge awards

### Settings

Extend:

- `src/app/(dashboard)/settings/rewards/page.tsx`
- `src/components/settings/RewardsSettingsClient.tsx`

Add:

- seniority threshold editing for admins
- rewards counts and debug overview
- recent snapshots, badge awards, and active streak rows
- debug filters for user, week range, badge category, and streak type
- selected-user weekly history drill-down with snapshot-triggered badge awards

### Team / organization

No required MVP UI changes.

## 13. Permissions

For MVP:

- authenticated users can view their own badges and streaks
- a user can view another user's trophy case only if they can access that profile already
- admin/super-admin can configure seniority thresholds
- admin/super-admin can edit user seniority
- cron routes must use the existing `CRON_SECRET` auth pattern

## 14. Seed and Data Setup

Seed:

- default `SeniorityConfig` rows
- MVP `BadgeDefinition` rows

Operational note:

- use `npm run db:seed:rewards` to seed only rewards runtime data without also running the broader app seed setup

Recommended initial seniority defaults:

- `JUNIOR`: expected points `10`, expected quality `1.5`
- `MID`: expected points `15`, expected quality `2.0`
- `SENIOR`: expected points `20`, expected quality `2.5`

Recommended velocity ratios:

- warm-up points: `1`
- steady hand: `0.5`
- in the flow: `1.0`
- on a roll: `1.5`
- powerhouse: `2.0`
- force of nature: `2.5`

## 15. Rollout Plan

### Phase 1: Foundation

- add Prisma schema changes
- add `completedAt`
- add `HEAD_OF_ANIMATION`
- add reward tables
- add user seniority admin support

### Phase 2: Login tracking

- implement `POST /api/login/record`
- make it idempotent per day
- update home UI with login streak status

### Phase 3: Snapshot pipeline

- implement weekly snapshot builder
- add cron route
- run silently for 2 to 3 weeks
- compare results against current velocity and quality metrics

### Phase 4: Badge engine

- seed MVP badge definitions
- evaluate login badges
- evaluate snapshot-based badges
- add user trophy case and current streak UI

### Phase 5: Validation and polish

- add notifications for new badge awards if desired
- document backfill gaps
- add admin debug tooling for rewards verification
- finalize deferred scope for post-MVP

## 15.1 Operational Workflow

### Weekly run

- `POST /api/cron/rewards/weekly-snapshot`
- builds immutable weekly snapshots
- evaluates weekly badge awards and streak state immediately after snapshot creation

### Historical backfill

- `POST /api/cron/rewards/backfill-snapshots`
- processes weeks in chronological order
- accepts optional `startWeekDate`, `endWeekDate`, and `userIds`
- safe to rerun because snapshot creation skips existing rows and weekly badge writes are idempotent

### Local trigger script

- `npm run cron:rewards:backfill`
- uses `CRON_BASE_URL` and `CRON_SECRET`
- optional environment variables:
  - `REWARDS_START_WEEK`
  - `REWARDS_END_WEEK`
  - `REWARDS_USER_IDS`

### Local direct database script

- `npm run rewards:backfill:slice -- 2026-02-09 2026-02-16`
- runs a bounded backfill directly from the repo against the configured database
- useful for narrow validation without routing through the deployed cron endpoint

## 16. Testing Plan

### Unit tests

- seniority threshold calculations
- login streak progression and idempotency
- velocity threshold classification
- velocity streak advancement and reset
- quality badge qualification
- combined badge qualification
- reviewer badge qualification
- streak re-earning behavior
- `completedAt` set and clear logic

### Integration tests

- moving a task to Done sets `completedAt`
- reopening a task clears `completedAt`
- `POST /api/login/record` creates one record per day at most
- weekly snapshot includes correct completed tasks and evaluations
- badge evaluator writes correct awards for a sample dataset

### Validation period

Before broad release:

- run weekly snapshots silently
- compare outputs with:
  - `src/app/api/metrics/velocity/route.ts`
  - current quality summary routes
- record mismatches and resolve them before enabling snapshot-driven badges for users

## 17. Known Risks

### Historical completion dates

Some existing tasks may not have enough trustworthy data to backfill `completedAt`.

Current observed environment status:

- no historical `completedAt` rows were available during the first narrow backfill
- this means historical weekly velocity/quality snapshots are currently mostly empty until fresh forward-looking data is collected

### Task assignment integrity

If any historical tasks have zero or multiple assignees, they will distort user-level snapshots unless handled explicitly.

### Reviewer eligibility counting

The definition of "eligible review" must be implemented carefully and consistently or reviewer badges will be noisy.

### Scope creep

Coins, leaderboard, team goals, and special badges should remain out of MVP unless the MVP itself is already stable.

### Seniority readiness

If users do not have seniority assigned, weekly badge evaluation will remain inactive even when weekly snapshots exist.

## 18. Post-MVP Follow-Ups

After MVP is stable, the next likely additions are:

- coins and ledger
- efficiency badges
- specialist per-dimension quality badges with stable dimension identifiers
- special / rare badges
- team / studio goals
- game performance inputs
- leaderboard
- perks and cosmetics

## 19. Implementation Checklist

- [x] Add `Seniority` enum and `User.seniority`
- [x] Add `Card.completedAt`
- [x] Add `HEAD_OF_ANIMATION` to evaluator roles and role resolution
- [x] Add reward MVP tables
- [x] Extend user create/edit API payloads with seniority
- [x] Extend user create/edit dialogs with seniority
- [x] Enforce single assignee for `TASK` cards
- [x] Set and clear `completedAt` on Done transitions
- [x] Add reward domain modules under `src/lib/rewards`
- [x] Implement login tracking route and service
- [x] Implement weekly snapshot cron route and builder
- [x] Seed default seniority configs
- [x] Seed MVP badge definitions
- [x] Implement badge evaluator families
- [x] Add home rewards summary
- [x] Add user trophy case and active streak UI
- [x] Run first narrow backfill and inspect the output
- [ ] Run silent validation period for snapshots
- [x] Document current backfill limitations from the shared environment
