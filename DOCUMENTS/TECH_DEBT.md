# Tech Debt & Code Health

> Assessment date: 2026-02-03
> Last updated: 2026-02-06
> Status: Active — refer to this document before refactoring or adding shared utilities.

---

## Overview

The codebase is functionally solid but has accumulated duplication and pattern inconsistencies from rapid feature iteration. This document catalogs known issues, prioritizes them, and provides an implementation plan.

---

## 1. Duplicated Utility Functions

### 1.1 Business Day Calculations (`addBusinessDays`) ✅ RESOLVED

**Status:** Consolidated into `src/lib/date-utils.ts` (2026-02-05)

All implementations now import from the shared utility:
- `src/lib/list-templates.ts` — re-exports for backward compatibility
- `src/components/timeline/TimelineView.tsx` — uses shared import
- `src/app/api/boards/[boardId]/timeline/blocks/move-group/route.ts` — uses shared import

### 1.2 Monday Snapping (`getMonday` / `snapToMonday`) ✅ RESOLVED

**Status:** Consolidated into `src/lib/date-utils.ts` (2026-02-05)

All 7 implementations now use the shared utilities:
- `getMonday(date)` — returns the Monday of the week containing the date
- `snapToMonday(date)` — snaps to nearest valid Monday for block starts (different weekend handling)
- `getFriday(monday)` — returns Friday from a Monday
- `moveBlockDates(startDate, weeksDelta)` — moves blocks by weeks, returns Mon-Fri dates

### 1.3 Contrast Color (`getContrastColor`) ✅ RESOLVED

**Status:** Consolidated into `src/lib/color-utils.ts` (2026-02-05)

Both implementations now use the shared utility with caching:
- `src/components/timeline/TimelineBlock.tsx` — uses shared import
- `src/components/timeline/TimelineEvent.tsx` — uses shared import

### 1.4 Date Range Formatting (`formatDateRange`) — Partially Resolved

**Consolidated in `date-utils.ts`**, but local `formatDate` functions remain in 8 components:

| Location | Lines | Notes |
|----------|-------|-------|
| `src/lib/list-templates.ts` | 212-231 | ✅ Uses date-utils |
| `src/components/timeline/TimelineHeader.tsx` | 26-29 | Could use `formatMonthYear` from date-utils |
| `src/components/boards/List.tsx` | 123-129 | Could use `formatDateRange` from date-utils |
| `src/components/projects/ProjectCard.tsx` | 39 | Local `formatDate` — display formatting |
| `src/components/users/UserTimeStatsClient.tsx` | 133 | Local `formatDate` — display formatting |
| `src/components/cards/TimeLogSection.tsx` | 210 | Local `formatDate` — display formatting |
| `src/components/timeline/CreateProjectDialog.tsx` | 35 | Local `formatDateInput` — input field formatting |
| `src/components/timeline/TimelineEventsRow.tsx` | 186 | Local `formatDate` — tooltip formatting |
| `src/components/boards/views/TasksView.tsx` | 474 | Local `formatDate` — context menu formatting |
| `src/components/timeline/WeekAvailabilityPopup.tsx` | 53 | Local `formatDate` — popup formatting |

**Action:** Add `formatDisplayDate(dateStr)` to `date-utils.ts` and replace the 8 local implementations.

---

## 2. Repeated Boilerplate

### 2.1 Auth/Permission Checking — Mostly Resolved

Most API routes now use `requireAuth()` from `api-utils.ts`. However, **5 API files (9 handlers) still use raw `auth()` with manual error responses:**

| File | Handlers | Notes |
|------|----------|-------|
| `src/app/api/users/[userId]/time-logs/route.ts` | 1 | Also uses manual `NextResponse.json` errors |
| `src/app/api/users/[userId]/skills/route.ts` | 3 (GET, POST, DELETE) | 12 manual error responses |
| `src/app/api/upload/route.ts` | 1 | 4 manual error responses |
| `src/app/api/boards/[boardId]/spine-tracker/route.ts` | 2 (GET, PUT) | 6 manual error responses |
| `src/app/api/boards/[boardId]/spine-tracker/import/route.ts` | 1 | 4 manual error responses |
| `src/app/api/boards/[boardId]/spine-tracker/export/route.ts` | 1 | 4 manual error responses |

**Total: 37 manual `NextResponse.json` error responses** that should use `ApiErrors.*` helpers.

**Action:** Migrate these 5 files to use `requireAuth()` + `ApiErrors.*` pattern.

### 2.2 Block Type / Phase Matching

Hardcoded phase search terms duplicated in 4-5 API routes:

| Location | Context |
|----------|---------|
| `src/app/api/boards/route.ts` | Board creation with templates |
| `src/app/api/boards/[boardId]/lists/route.ts:51-52` | Phase validation |
| `src/app/api/boards/[boardId]/sync-timeline/route.ts` | Timeline sync |
| `src/app/api/boards/[boardId]/apply-dates/route.ts` | Date application |

**Risk:** Different routes include different phases in their search terms, leading to inconsistent behavior (e.g., one route recognizes 'QA' and 'MARKETING' phases, another doesn't).

---

## 3. Type Safety Issues

### 3.1 Explicit `any` Type

| Location | Issue |
|----------|-------|
| `src/app/api/boards/route.ts:126` | `Record<string, any>` for board settings (has eslint-disable comment) |

**Fix:** Use the existing `BoardSettings` type from `src/types/index.ts:205-224`.

### 3.2 Duplicate Type Definitions — Partially Resolved

TimelineView.tsx was fixed (uses `Pick<User, ...>` and imports `Team` from `@/types`).

**17 duplicate definitions remain across 12 component files:**

| Type | Duplicated In |
|------|---------------|
| `User` | `TeamSettingsModal.tsx:55`, `TeamSettingsButton.tsx:13`, `UsersPageClient.tsx:10`, `CreateTeamDialog.tsx:45`, `TimelineFilterPanel.tsx:16`, `UserDetailClient.tsx:38` |
| `Team` | `TeamSettingsModal.tsx:69`, `TeamSettingsButton.tsx:27`, `UsersPageClient.tsx:43`, `CreateProjectDialog.tsx:44`, `TimelineFilterPanel.tsx:10`, `UserDetailClient.tsx:17`, `EditUserDialog.tsx:28`, `CreateUserDialog.tsx:18` |
| `Board` | `UserTimeStatsClient.tsx:56` |
| `List` | `BlockEditModal.tsx:27`, `AddBlockDialog.tsx:19` |

**Action:** Replace with imports from `@/types`. Where the component needs a subset, use `Pick<User, 'id' | 'name' | ...>` instead of redefining.

### 3.3 JSON Data Casting

Multiple locations cast Prisma JSON fields with `as { field?: type }`:
- `src/app/api/boards/[boardId]/cards/[cardId]/route.ts:159`
- `src/components/boards/views/PlanningView.tsx:209`
- `src/components/boards/List.tsx:176`

Not a bug, but fragile if JSON structure changes without updating all cast sites.

---

## 4. API Route Gaps

### 4.1 No Pagination

All GET endpoints return full result sets. No `limit`, `offset`, or cursor parameters.

### 4.2 Inconsistent Cache Headers

Some routes set `Cache-Control: no-store` headers, others don't:
- **With headers:** `src/app/api/boards/[boardId]/route.ts`, `src/app/api/boards/[boardId]/cards/[cardId]/route.ts`
- **Without headers:** `src/app/api/boards/route.ts`, most other routes

### 4.3 Inconsistent Input Validation

Some routes validate request bodies thoroughly, others only check existence:
- **Good validation:** `src/app/api/boards/route.ts:78-82` (board name)
- **Minimal validation:** Card creation routes (no title/description content checks)

---

## 5. Testing Status

- **Test framework:** Vitest (installed and configured in `vitest.config.ts`)
- **Test setup:** `src/test/setup.ts` (mocks for Next.js router and Image)
- **Existing tests:** Zero application tests
- **Scripts available:** `npm test`, `npm run test:ui`, `npm run test:coverage`

---

## Implementation Plan

### Phase 1: Extract Shared Utilities (High Priority)

**Goal:** Eliminate all duplicated utility functions.

#### Step 1A: Create `src/lib/date-utils.ts` ✅ DONE

Created `src/lib/date-utils.ts` with:
- `addBusinessDays(date, days)` — add/subtract business days
- `getBusinessDaysBetween(start, end)` — count business days between dates
- `getMonday(date)` — get Monday of the week containing the date
- `snapToMonday(date)` — snap to nearest valid Monday for block starts
- `getFriday(monday)` — get Friday from a Monday
- `getBlockEndDate(startDate)` — alias for getFriday
- `moveBlockDates(startDate, weeksDelta)` — move a block by weeks, returns Mon-Fri dates
- `moveBlockByWeeks(startDate, weeks)` — simplified version returning just start date
- `formatDateRange(start, end, options?)` — format date range for display
- `formatMonthYear(date)` — format month/year for timeline headers

All consumers updated:
- ✅ `src/lib/list-templates.ts` — re-exports for backward compatibility
- ✅ `src/components/timeline/TimelineView.tsx` — uses shared imports
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/move-group/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/[blockId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/[blockId]/delete-and-shift/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/insert/route.ts`

#### Step 1B: Create `src/lib/color-utils.ts` ✅ DONE

Created `src/lib/color-utils.ts` with:
- `getContrastColor(hexColor)` — with caching optimization
- `clearContrastColorCache()` — for testing

All consumers updated:
- ✅ `src/components/timeline/TimelineBlock.tsx`
- ✅ `src/components/timeline/TimelineEvent.tsx`

#### Step 1C: Consolidate `formatDateRange` ✅ DONE

`formatDateRange` is now in `src/lib/date-utils.ts` and exported from `list-templates.ts` for backward compatibility.

**Remaining consumer updates (optional):**
- `src/components/boards/List.tsx` — could import from date-utils directly
- `src/components/timeline/TimelineHeader.tsx` — could use `formatMonthYear` from date-utils

### Phase 2: Extract API Helpers (High Priority) ✅ DONE

#### Step 2A: Create `src/lib/api-utils.ts` ✅ DONE

Created `src/lib/api-utils.ts` with:
- `requireAuth()` — returns session or 401 response
- `requireAdmin(userId)` — checks ADMIN/SUPER_ADMIN permission or 403
- `requireBoardMember(boardId, userId)` — checks board membership or 403
- `requireBoardAdmin(boardId, userId)` — checks board admin permission or 403
- `apiError(code, message, status)` — standard error response
- `apiSuccess(data, status?)` — standard success response
- `ApiErrors` object with common error shortcuts
- `hasPermission(userPermission, requiredPermission)` — permission hierarchy check
- Type definitions: `ApiErrorCode`, `ApiError`, `ApiResponse`, `PermissionLevel`

**All API routes migrated (2026-02-05):**

Settings routes:
- ✅ `src/app/api/settings/skills/route.ts`
- ✅ `src/app/api/settings/skills/[skillId]/route.ts`
- ✅ `src/app/api/settings/roles/route.ts`
- ✅ `src/app/api/settings/roles/[roleId]/route.ts`
- ✅ `src/app/api/settings/tags/route.ts`
- ✅ `src/app/api/settings/tags/[tagId]/route.ts`
- ✅ `src/app/api/settings/block-types/route.ts`
- ✅ `src/app/api/settings/block-types/[blockTypeId]/route.ts`
- ✅ `src/app/api/settings/event-types/route.ts`
- ✅ `src/app/api/settings/event-types/[eventTypeId]/route.ts`

Top-level routes:
- ✅ `src/app/api/boards/route.ts`
- ✅ `src/app/api/teams/route.ts`
- ✅ `src/app/api/studios/route.ts`
- ✅ `src/app/api/users/route.ts`

Entity detail routes:
- ✅ `src/app/api/boards/[boardId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/members/route.ts`
- ✅ `src/app/api/teams/[teamId]/route.ts`
- ✅ `src/app/api/teams/[teamId]/members/route.ts`
- ✅ `src/app/api/studios/[studioId]/route.ts`
- ✅ `src/app/api/users/[userId]/route.ts`

Board sub-routes:
- ✅ `src/app/api/boards/[boardId]/lists/route.ts`
- ✅ `src/app/api/boards/[boardId]/lists/[listId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/clone/route.ts`
- ✅ `src/app/api/boards/[boardId]/unarchive/route.ts`
- ✅ `src/app/api/boards/[boardId]/apply-dates/route.ts`
- ✅ `src/app/api/boards/[boardId]/sync-timeline/route.ts`

Card routes:
- ✅ `src/app/api/boards/[boardId]/cards/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/reorder/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/assignees/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/attachments/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/attachments/[attachmentId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/checklists/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/items/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/items/[itemId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/comments/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/comments/[commentId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/time-logs/route.ts`
- ✅ `src/app/api/boards/[boardId]/cards/[cardId]/time-logs/[logId]/route.ts`

Timeline routes:
- ✅ `src/app/api/boards/[boardId]/timeline/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/insert/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/move-group/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/[blockId]/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/[blockId]/delete-and-shift/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/[blockId]/assignments/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/events/route.ts`
- ✅ `src/app/api/boards/[boardId]/timeline/events/[eventId]/route.ts`

#### Step 2B: Centralize Phase/Block Type Constants ✅ DONE

Created `src/lib/constants.ts` with:
- `VALID_PHASES` — all valid ListPhase values
- `BLOCK_TYPE_TO_PHASE` — mapping from block type names to phases
- `PHASE_SEARCH_TERMS` — search terms for phase detection
- `PHASE_COLORS` — color codes for each phase
- `getPhaseFromBlockType(name)` — get phase from block type name
- `detectPhaseFromName(listName)` — detect phase from list name
- `isValidPhase(value)` — type guard for valid phases

All routes updated (2026-02-05):
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/route.ts` — uses `getPhaseFromBlockType`
- ✅ `src/app/api/boards/[boardId]/timeline/blocks/insert/route.ts` — uses `getPhaseFromBlockType`
- ✅ `src/app/api/boards/[boardId]/sync-timeline/route.ts` — uses `PHASE_SEARCH_TERMS`
- ✅ `src/app/api/boards/[boardId]/apply-dates/route.ts` — uses `PHASE_SEARCH_TERMS`

### Phase 3: Unit Tests (High Priority) ✅ DONE

All 113 unit tests pass (2026-02-05).

#### Step 3A: Date Utility Tests — `src/lib/__tests__/date-utils.test.ts` ✅ DONE

40 tests covering:
- `addBusinessDays`: forward/backward, crossing weekends, starting on weekend
- `getMonday`: all 7 days of week as input, edge cases (Jan 1, Dec 31)
- `getFriday`: verify always 4 days after Monday
- `moveBlockDates`: positive/negative weeks, verify Mon-Fri snapping
- `getBusinessDaysBetween`: same day, multi-week spans, weekend boundaries
- `snapToMonday`: different handling from getMonday for weekends
- `formatDateRange` / `formatMonthYear`: date formatting

#### Step 3B: Color Utility Tests — `src/lib/__tests__/color-utils.test.ts` ✅ DONE

9 tests covering:
- `getContrastColor`: white bg returns black, black bg returns white, mid-tones, cache behavior
- Common UI colors from the application
- Cache clearing functionality

#### Step 3C: API Utility Tests — `src/lib/__tests__/api-utils.test.ts` ✅ DONE

37 tests covering:
- `apiError` / `apiSuccess`: correct response format and status codes
- `ApiErrors.*`: all error helper methods with correct status codes
- `hasPermission`: full permission hierarchy matrix (16 combinations)

#### Step 3D: Phase Constants Tests — `src/lib/__tests__/constants.test.ts` ✅ DONE

27 tests covering:
- All phases have search terms
- No duplicate search terms across phases
- Search terms match expected block type names
- `getPhaseFromBlockType`: case handling, variations
- `detectPhaseFromName`: keyword detection
- `isValidPhase`: type guard functionality

### Phase 4: Type Safety Fixes (Medium Priority) — Partially Complete

#### Step 4A: Fix `any` Type ✅ DONE

Replaced `Record<string, any>` in `src/app/api/boards/route.ts` with:
- Used `Partial<BoardSettings>` for type checking during building
- Cast to `object` when passing to Prisma JSON field
- Also migrated hardcoded `phaseSearchTerms` to use `PHASE_SEARCH_TERMS` from constants

#### Step 4B: Remove Duplicate Type Definitions — Partially Done

- ✅ Added `Team` interface to `src/types/index.ts`
- ✅ Updated `src/components/timeline/TimelineView.tsx` to import `Team` and `User` from `@/types`
- ✅ Created local `TimelineUser = Pick<User, 'id' | 'name' | 'email' | 'image'>` for component props

**Remaining:** 17 duplicate definitions in 12 files (see Section 3.2 above for full list)

#### Step 4C: Standardize JSON Data Casting (Pending)

Lower priority. Create typed helper functions for accessing Prisma JSON fields:
- `getTaskData(card)` — typed accessor for task card JSON
- `getUserStoryData(card)` — typed accessor for user story JSON
- `getEpicData(card)` — typed accessor for epic JSON

### Phase 5: API Consistency (Medium Priority) ✅ DONE

#### Step 5A: Standardize Cache Headers ✅ SKIPPED (Not Needed)

Next.js App Router automatically sets `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` for all dynamic routes. Since all our API routes call `requireAuth()` which reads cookies via `auth()`, they are automatically marked as dynamic and properly cache-controlled.

#### Step 5B: Add Input Validation ✅ DONE

Added validation to card creation and update routes:
- **Title**: Required, max 500 characters
- **Description**: Max 10,000 characters
- **Card type**: Validated against allowed types (TASK, USER_STORY, EPIC, UTILITY)

Files updated:
- `src/app/api/boards/[boardId]/cards/route.ts` - POST validation
- `src/app/api/boards/[boardId]/cards/[cardId]/route.ts` - PATCH validation

---

## Files Created by This Plan

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/date-utils.ts` | Consolidated date/business day utilities | ✅ Created |
| `src/lib/color-utils.ts` | Color contrast utility with caching | ✅ Created |
| `src/lib/api-utils.ts` | Auth checking, error/success response helpers | ✅ Created |
| `src/lib/constants.ts` | Phase search terms, valid phases | ✅ Created |
| `src/lib/__tests__/date-utils.test.ts` | Unit tests for date utilities (40 tests) | ✅ Created |
| `src/lib/__tests__/color-utils.test.ts` | Unit tests for color utilities (9 tests) | ✅ Created |
| `src/lib/__tests__/api-utils.test.ts` | Unit tests for API helpers (37 tests) | ✅ Created |
| `src/lib/__tests__/constants.test.ts` | Unit tests for phase constants (27 tests) | ✅ Created |

## Files Modified by This Plan

| File | Changes | Status |
|------|---------|--------|
| `src/lib/list-templates.ts` | Re-exports date-utils, removed duplicated functions | ✅ Done |
| `src/components/timeline/TimelineView.tsx` | Import from date-utils, removed inline helpers | ✅ Done |
| `src/components/timeline/TimelineBlock.tsx` | Import from color-utils, removed local function | ✅ Done |
| `src/components/timeline/TimelineEvent.tsx` | Import from color-utils, removed local function | ✅ Done |
| `src/components/timeline/TimelineHeader.tsx` | Import formatDateRange from date-utils | Optional |
| `src/components/boards/List.tsx` | Import formatDateRange from date-utils | Optional |
| `src/app/api/boards/[boardId]/timeline/blocks/move-group/route.ts` | Import from date-utils | ✅ Done |
| `src/app/api/boards/[boardId]/timeline/blocks/route.ts` | Import from date-utils | ✅ Done |
| `src/app/api/boards/[boardId]/timeline/blocks/[blockId]/route.ts` | Import from date-utils | ✅ Done |
| `src/app/api/boards/[boardId]/timeline/blocks/[blockId]/delete-and-shift/route.ts` | Import from date-utils | ✅ Done |
| `src/app/api/boards/[boardId]/timeline/blocks/insert/route.ts` | Import from date-utils | ✅ Done |
| `src/app/api/boards/route.ts` | Fix `any` type; use phase constants; use api-utils | ✅ Done |
| `src/app/api/boards/[boardId]/lists/route.ts` | Use phase constants | ✅ Done |
| `src/app/api/boards/[boardId]/sync-timeline/route.ts` | Use phase constants | ✅ Done |
| `src/app/api/boards/[boardId]/apply-dates/route.ts` | Use phase constants | ✅ Done |
| Most API route files (~48) | Replace auth boilerplate with api-utils helpers | ✅ Done |
| 5 remaining API files | Spine tracker, upload, skills, time-logs still use raw `auth()` | Pending |

---

## 6. Performance: Client-Side Fetching (Option C) ✅ DONE (2026-02-06)

### Problem

Every page navigation required a full server round-trip: auth → Prisma queries → data transformation → HTML. This caused 3-10 second load times between pages.

### Solution

Converted 5 heaviest pages to **hybrid server shell + client-side TanStack Query** fetching:
- Server components handle auth only (thin shell: `auth()` check → pass `isAdmin`/`userId` → render client component)
- Client components fetch data via API + TanStack Query, showing skeletons while loading
- Revisiting a page shows cached data instantly (1min staleTime configured in `providers.tsx`)

### Pages Converted

| Page | Server Shell | Client Component | Hook/API |
|------|-------------|-----------------|----------|
| Timeline | `timeline/page.tsx` | `TimelinePageClient.tsx` | `useTimelineData()` → `GET /api/timeline` |
| Boards list | `boards/page.tsx` | `BoardsPageClient.tsx` | `useBoards()` + `useArchivedBoards()` → `GET /api/boards` |
| Board detail | `boards/[boardId]/page.tsx` | `BoardDetailClient.tsx` | `useBoard(id)` → `GET /api/boards/[boardId]` |
| Projects list | `projects/page.tsx` | `ProjectsPageClient.tsx` | `useProjects()` → `GET /api/boards?projects=true` |
| Project detail | `projects/[projectId]/page.tsx` | `ProjectDetailPageClient.tsx` | `apiFetch` → `GET /api/boards/[boardId]` |

### New Infrastructure Files

| File | Purpose |
|------|---------|
| `src/lib/api-client.ts` | Thin `apiFetch<T>()` wrapper that unwraps `{success, data, error}` envelope |
| `src/hooks/api/use-boards.ts` | `useBoards()`, `useArchivedBoards()`, `useBoard(id)` hooks |
| `src/hooks/api/use-timeline.ts` | `useTimelineData()` hook |
| `src/hooks/api/use-projects.ts` | `useProjects()` hook |
| `src/app/api/timeline/route.ts` | New aggregate timeline GET endpoint |
| `src/components/timeline/TimelineSkeleton.tsx` | Timeline loading skeleton |
| `src/components/boards/BoardsSkeleton.tsx` | Boards list loading skeleton |
| `src/components/boards/BoardSkeleton.tsx` | Board detail loading skeleton |

### API Changes

| Endpoint | Change |
|----------|--------|
| `GET /api/boards` | Added `?archived=true` and `?projects=true` query params |
| `GET /api/boards/[boardId]` | Now includes `weeklyProgress` in response |
| `GET /api/timeline` | **New** — aggregate endpoint for all boards' timeline data |

### Earlier Quick Fixes (2026-02-06)

Before Option C, these quick fixes were applied:
- Removed redundant permission DB queries from 8 pages (use `session.user.permission` from JWT)
- Parallelized sequential DB queries on timeline and boards pages (`Promise.all`)
- Removed unnecessary `force-dynamic` exports from timeline and board detail pages
- Reduced Prisma dev logging (removed `'query'` from log levels)
- Added `src/app/(dashboard)/loading.tsx` — dashboard-level loading spinner

---

*Last updated: 2026-02-06*
