# Feature Quality Review - Implementation Plan

This plan tracks implementation work for `DOCUMENTS/FEATURE_QUALITY_REVIEW.md`.

## Phase 1 - Specification Alignment
- [x] Confirm product decisions (roles, anonymity, visibility, scoring options).
- [x] Update feature specification with agreed behavior.

## Phase 2 - Data Model And Seed Data
- [x] Add review/evaluation enums in `prisma/schema.prisma`.
- [x] Add review/evaluation models in `prisma/schema.prisma`.
- [x] Add relations on existing models (`Card`, `BlockType`, `User`).
- [x] Add default review questions and mappings in `prisma/seed.ts`.
- [x] Apply schema changes with `prisma db push` (project uses db-push workflow).
- [x] Regenerate Prisma client successfully (`prisma generate`).

## Phase 3 - Core Backend Logic
- [x] Add shared quality-review domain helpers (role resolution, aggregation, divergence).
- [x] Implement review-cycle automation on card list transitions.
- [x] Implement lock/finalization/unlock behavior on Done transitions.

## Phase 4 - API Surface
- [x] Add review cycle endpoints.
- [x] Add evaluation submit/update/read endpoints.
- [x] Add pending-evaluations endpoint.
- [x] Add review question settings endpoints (Super Admin only).
- [x] Add metrics endpoints for velocity, user summary, and project summary.

## Phase 5 - UI
- [x] Add Evaluate entrypoint and modal in card UI.
- [x] Add Card Quality tab aggregated summary + confidence indicators.
- [x] Add User page quality summary.
- [x] Add Project Statistics quality summary in Planning and Project views.
- [x] Add Super Admin settings page for review questions.

## Phase 6 - Validation
- [x] Add tests for aggregation/divergence/confidence logic.
- [x] Validate permission and role constraints.
- [x] Run lint/type-check/tests and resolve regressions.

## Phase 7 - Extended Metrics API
- [x] Add `GET /api/metrics/quality-adjusted-velocity`.
- [x] Add `GET /api/metrics/iteration-distribution`.
- [x] Add shared quality metrics helpers and unit tests.
- [x] Run lint/type-check/tests after metrics endpoint implementation.

## Phase 8 - Metrics UI Wiring
- [x] Wire quality-adjusted velocity metrics into Planning view Project Statistics.
- [x] Wire iteration-distribution metrics into Planning view Project Statistics.
- [x] Mirror the same metrics wiring on Project detail Team Quality Summary.
- [x] Run lint/type-check/tests after UI wiring.

## Notes
- For cross-cutting performance/deployment guidance, see `DOCUMENTS/PERFORMANCE_RUNBOOK.md`.
- For related platform-level tracking, see `DOCUMENTS/TECH_DEBT.md` ("2026-02-19 Performance Stabilization Follow-Up").
- Active performance pattern: Project detail fetches use `GET /api/boards/:id?scope=project` (not full board payload).
- Active performance pattern: User/member pickers use `GET /api/users?scope=picker` and team picker scopes.
- Active performance pattern: Board/settings navigation uses predictive prefetch (hover + idle warmup).
- Evaluation eligibility is role-based (`LEAD`, `PO`, `HEAD_OF_ART`), not permission-based.
- Score visibility is aggregated/anonymized only.
- Quality summaries are visible only to users with `LEAD`, `PO`, or `HEAD_OF_ART` roles.
- Settings write access for review questions is Super Admin only.
- Migration baselining is optional here because this project currently uses `prisma db push`.
- Current validation status: `npm run lint`, `npm run type-check`, and `npm run test` pass.
