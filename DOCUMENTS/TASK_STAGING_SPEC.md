# Staged Task Release Spec

Created: 2026-02-07
Status: Phase 3 Complete (Core)
Owner: Engineering

## Problem

Planning view user stories can generate a large number of connected tasks too early, causing overload in Tasks view.

## Goal

Allow connected tasks created from User Stories to be either:
1. Sent immediately to a Tasks-view list.
2. Staged in the planning context and released later.

Release rule (target behavior): staged tasks are automatically moved to the Tasks-view "To Do" list on the Friday before the start date of the User Story's planning list.

## Scope

### Phase 1 (this implementation)

- Add task staging metadata (JSON-based in `taskData`).
- Add destination selection in User Story -> Create Linked Task flow:
  - `Send now` (to Tasks list)
  - `Stage for later release` (stays in User Story's planning list)
- Server-side validation and schedule computation for staged mode.
- Persist metadata required for future automated transfer.

Out of scope for phase 1:
- Planning list split UI (top User Stories / bottom staged Tasks lane).
- Scheduled transfer job / cron execution.
- Backfill migration for existing tasks.

### Phase 2 (planned)

- Split planning lists into top (User Stories) and bottom (staged Tasks) sections.
- Show staged task badges/status and schedule date.
- Add manual release action in UI.

Phase 2 implementation status:
- Done: split list rendering with staged-task bottom section in Planning view.
- Done: staged task status/date badges on compact cards.
- Done: manual `Release now` action for staged tasks in Planning view.
- Pending: optional dedicated release audit view.

### Phase 3 (planned)

- Automatic transfer engine (cron + lazy fallback).
- Idempotent release processing and release audit fields.

Phase 3 implementation status:
- Done: shared release processor (`src/lib/task-release.ts`) for due staged tasks.
- Done: lazy fallback on board fetch (`GET /api/boards/[boardId]`).
- Done: secured cron endpoint (`/api/cron/release-staged-tasks`) with `CRON_SECRET`.
- Done: idempotent release updates using staged-mode guarded update.
- Done: automated tests for release processor logic (`src/lib/__tests__/task-release.test.ts`).
- Pending: optional release telemetry/dashboard.

## API Behavior (Phase 3)

### Automatic Release Processing

- Processor: `processDueStagedTasks` in `src/lib/task-release.ts`
- Due criteria:
  - `taskData.releaseMode === STAGED`
  - `taskData.releasedAt` is not set
  - `taskData.scheduledReleaseDate <= now`
- Action:
  - move card to `taskData.releaseTargetListId`
  - set `taskData.releaseMode = IMMEDIATE`
  - set `taskData.releasedAt = now`

### Lazy Fallback

- Triggered from `GET /api/boards/[boardId]` before returning board payload.
- Errors are logged and do not block board fetch.

### Cron Endpoint

- Endpoint: `GET|POST /api/cron/release-staged-tasks`
- Auth:
  - `Authorization: Bearer <CRON_SECRET>` or
  - `x-cron-secret: <CRON_SECRET>`
- Response includes scan/release counters for observability.

### Scheduling

- Recommended cadence: hourly.
- Repository config includes `vercel.json` cron:
  - path: `/api/cron/release-staged-tasks`
  - schedule: `0 * * * *`
- Deployment requirement: set `CRON_SECRET` in environment variables.

## Data Contract

Task metadata fields (stored in `Card.taskData` for `TASK` cards):

- `releaseMode`: `IMMEDIATE` | `STAGED`
- `stagedFromPlanningListId`: string | null
- `scheduledReleaseDate`: ISO string | null
- `releaseTargetListId`: string | null
- `releasedAt`: ISO string | null

Notes:
- No Prisma schema migration required (JSON field extension).
- Types are updated in `src/types/index.ts`.

## API Behavior (Phase 1)

### Endpoint

`POST /api/boards/[boardId]/cards`

### New optional request shape for TASK creation

- `taskDestination`:
  - `mode`: `IMMEDIATE` | `STAGED`
  - `immediateListId?`: string (required for `IMMEDIATE` if caller wants explicit target)

### Rules

If creating a TASK linked to a User Story (`taskData.linkedUserStoryId`):

1. `IMMEDIATE`
- Card is created in a Tasks-view list (explicit list or existing default behavior).
- Metadata:
  - `releaseMode = IMMEDIATE`
  - `releaseTargetListId = destination list id`
  - `releasedAt = now`
  - staged fields null.

2. `STAGED`
- Card is created in the linked User Story's planning list.
- Server computes `scheduledReleaseDate` as Friday before planning list start date.
- Server resolves release target list as first TASKS list with `phase = BACKLOG`.
- Metadata:
  - `releaseMode = STAGED`
  - `stagedFromPlanningListId = planning list id`
  - `scheduledReleaseDate = computed date`
  - `releaseTargetListId = resolved backlog list`
  - `releasedAt = null`

Validation:
- Linked User Story must exist in board.
- Linked planning list must have `startDate` for staged mode.
- Board must contain a valid backlog TASKS list for staged mode.

## UI Behavior (Phase 1)

In `CardModal` when current card type is `USER_STORY` and creating a linked task:

- Destination selector shown:
  - `Send now to Tasks list`
  - `Stage for Friday release`
- If `Send now`, user selects Tasks list.
- If `Stage`, list selection is hidden and informative text shows staging list and release rule.

## Risks and Mitigations

- Risk: staged tasks are invisible in Tasks view before release.
  - Mitigation: they remain visible in User Story connected task section; phase 2 adds dedicated staged lane.

- Risk: no auto-transfer yet in phase 1.
  - Mitigation: persisted metadata enables phase 3 transfer engine without data migration.

## Acceptance Criteria (Phase 1)

1. Creating linked task from User Story supports immediate/staged destinations.
2. Staged mode computes and stores schedule metadata server-side.
3. Immediate mode stores immediate metadata.
4. Type-check/lint/tests pass.
