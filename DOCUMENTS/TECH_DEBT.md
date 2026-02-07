# Tech Debt & Code Health

> Created: 2026-02-07
> Scope: Follow-up cleanup pass based on code review findings
> Completed: 2026-02-07
> Status: Completed

## Goals

1. Close security and validation gaps in user time logs API.
2. Finish migration to standardized API helper patterns.
3. Remove duplicated component type definitions.
4. Consolidate repeated date formatting helpers.
5. Resolve high-risk hook dependency issues flagged by lint.
6. Make test script behavior deterministic in CI/non-interactive environments.

## Findings to Address

### A. Security and Validation
- `src/app/api/users/[userId]/time-logs/route.ts`
  - Missing authorization check for reading another user's logs.
  - `limit` query param is not validated/clamped.

### B. Remaining API Helper Migration
- `src/app/api/users/[userId]/skills/route.ts`
- `src/app/api/users/[userId]/time-logs/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/boards/[boardId]/spine-tracker/route.ts`
- `src/app/api/boards/[boardId]/spine-tracker/import/route.ts`
- `src/app/api/boards/[boardId]/spine-tracker/export/route.ts`

### C. Duplicate Types
- Local duplicate `User`, `Team`, `Board`, `List` interfaces across component files; replace with imports from `@/types` and `Pick` where needed.

### D. Date Formatting Duplication
- Repeated local `formatDate` helpers in timeline/user/card/project components.

### E. Hook Dependency Risks
- Lint warnings with stale-closure risk in:
  - `src/components/boards/BoardMembersModal.tsx`
  - `src/components/boards/views/BurnUpChart.tsx`
  - `src/components/boards/views/TasksView.tsx`
  - `src/components/boards/views/PlanningView.tsx`
  - `src/components/cards/AttachmentSection.tsx`
  - `src/components/cards/ConnectionPicker.tsx`
  - `src/components/cards/TimeLogSection.tsx`

### F. Test Script Behavior
- `npm test` currently launches watch-mode behavior by default in this environment.

## Implementation Plan

### Phase 1: API correctness and consistency (High)
1. Fix authorization + `limit` validation in `users/[userId]/time-logs`.
2. Migrate remaining raw-auth routes to `requireAuth`, `requireAdmin`, `requireBoardMember`, `ApiErrors`, and `apiSuccess`.
3. Keep behavior unchanged except response consistency and explicit validations.

### Phase 2: Type and utility cleanup (Medium)
1. Replace duplicated component interfaces with shared `@/types` imports.
2. Add a shared display date formatter in `src/lib/date-utils.ts`.
3. Replace local date format helpers where equivalent.

### Phase 3: Hook dependency stabilization (Medium)
1. Refactor unstable functions to `useCallback` where effects depend on them.
2. Add missing dependencies and preserve existing UX behavior.

### Phase 4: Tooling and verification (Medium)
1. Set `package.json` `test` script to `vitest run`.
2. Add explicit `test:watch` script for local watch mode.
3. Run:
   - `npm run type-check`
   - `npm run lint`
   - `npm test`

## Success Criteria

- No remaining raw `auth()` usage in API routes except auth provider route.
- User time logs endpoint enforces authorization and safe `limit` bounds.
- Duplicate component type definitions removed from targeted files.
- Shared date formatter used instead of repeated local helpers.
- Hook dependency warnings reduced for targeted high-risk files.
- `npm test` runs to completion in non-interactive mode.

## Completion Notes

- Completed all planned phases.
- Verification results:
  - `npm run type-check`: pass
  - `npm run lint`: pass (warnings only)
  - `npm test`: pass (113 tests)
- Residual lint warnings are unrelated to this pass and mostly about `<img>` usage and minor unused variables.
