# Rewards MVP Rollout Checklist

This document is the repo-specific rollout and validation sequence for the rewards MVP.

It assumes the code in the current branch already contains:

- rewards schema changes
- login tracking
- weekly snapshots
- badge evaluation
- home/profile rewards UI
- admin rewards settings and debug tooling
- rewards backfill tooling

## 1. Current Status

The rewards MVP foundation is already deployed to the shared database:

- rewards Prisma migration applied
- rewards runtime seed applied
- admin rewards settings and debug tooling visible in the app
- first narrow historical backfill executed successfully

The remaining MVP work is now operational validation:

- assign user seniority
- validate snapshot accuracy against fresh live data
- document real historical backfill gaps
- complete rollout QA and production monitoring

## 2. Required Environment

Rewards rollout depends on:

- `DATABASE_URL`
- `CRON_SECRET`
- `CRON_BASE_URL` for local use of `npm run cron:rewards:backfill`

General app auth/session variables still need to be correct for the deployment, but they are not rewards-specific.

## 3. Pre-Launch Blocking Checklist

Complete these before any staging or production backfill:

- [x] Generate the Prisma migration for the rewards MVP schema
- [ ] Review the migration SQL carefully before applying it anywhere shared
- [ ] Apply the migration in staging
- [ ] Run seed in staging
- [ ] Confirm rewards settings load for an admin user
- [ ] Confirm user create/edit still works with the new `seniority` field
- [ ] Confirm task Done/reopen transitions are still working with `completedAt`

### 3.1 Migration Commands

Local migration creation:

```bash
npx prisma migrate dev --name rewards_mvp_foundation
```

Shared environment apply:

```bash
npx prisma migrate deploy
```

Seed:

```bash
npm run db:seed
```

Rewards-only seed:

```bash
npm run db:seed:rewards
```

Expected seed behavior:

- `SeniorityConfig` is upserted
- MVP `BadgeDefinition` rows are upserted
- existing default seed data continues to be upserted

Recommended for rewards rollout:

- use `npm run db:seed:rewards` if you only want the rewards runtime data
- avoid `npm run db:seed` unless you also intend to refresh the broader app seed data

Repeatable local narrow backfill command:

```bash
npm run rewards:backfill:slice -- 2026-02-09 2026-02-16
```

## 4. Staging Smoke Test

Use staging before any production rollout.

### 4.1 Schema and Seed Smoke Test

- [ ] `User.seniority` exists and is editable
- [ ] `Card.completedAt` is present in the database
- [ ] `BadgeDefinition` rows exist after seed
- [ ] `SeniorityConfig` rows exist for `JUNIOR`, `MID`, `SENIOR`

### 4.2 App Smoke Test

- [ ] Admin can open `/settings/rewards`
- [ ] Admin can edit and save seniority thresholds
- [ ] Admin rewards overview loads
- [ ] Admin filter controls work
- [ ] Selected-user history drill-down works
- [ ] Home rewards card loads for a normal user
- [ ] User profile trophy case loads where the profile is already accessible

### 4.3 Login Tracking Smoke Test

- [ ] First authenticated app visit creates one daily login record
- [ ] Reloading the app the same day does not create duplicates
- [ ] `/api/login/streak` reflects the stored streak correctly

### 4.4 Completion Timestamp Smoke Test

- [ ] Moving a `TASK` into Done sets `completedAt`
- [ ] Reopening the same `TASK` clears `completedAt`
- [ ] Non-task cards do not affect rewards attribution

## 5. Manual Cron Verification

Before scheduling anything automatically, call the rewards cron routes manually in staging.

### 5.1 Weekly Snapshot Cron

Manual request:

```bash
curl -X POST "$BASE_URL/api/cron/rewards/weekly-snapshot" ^
  -H "Authorization: Bearer %CRON_SECRET%" ^
  -H "Content-Type: application/json" ^
  -d "{\"weekStartDate\":\"2026-02-23\"}"
```

Expected response checks:

- `createdCount` is reasonable
- `skippedExistingCount` behaves as expected on rerun
- `warnings` is empty or understood
- badge evaluation returns non-error counts

### 5.2 Backfill Cron

Use the local helper script for controlled backfill:

```bash
set CRON_BASE_URL=https://your-env.example.com
set CRON_SECRET=your-secret
npm run cron:rewards:backfill
```

Optional scoped backfill:

```bash
set REWARDS_START_WEEK=2026-01-05
set REWARDS_END_WEEK=2026-02-23
set REWARDS_USER_IDS=userId1,userId2
npm run cron:rewards:backfill
```

Expected response checks:

- weeks process oldest to newest
- reruns skip existing snapshots instead of duplicating
- badge awards stay idempotent
- streak progression is rebuilt chronologically

## 6. Recommended Backfill Order

Do not start with a full-history all-user backfill.

Use this order:

1. One known user, 2 to 4 weeks
2. One known user, wider historical range
3. Small group of mixed users across seniorities and reviewer roles
4. One recent month for all users
5. Full historical range for all users

For each step, review:

- snapshot counts
- warning counts
- badge counts by category
- selected-user history in `/settings/rewards`

## 7. Silent Validation Period

Recommended duration:

- 2 to 3 weeks in a shared environment before broad rollout messaging

Goals:

- verify weekly snapshot math against live data
- quantify historical backfill gaps
- confirm badge/streak behavior matches expected user stories

### 7.1 What To Compare

Compare rewards data against:

- `/api/metrics/velocity`
- existing quality summary routes
- user-level profile expectations from known sample users

### 7.2 Validation Sample Set

Check at least:

- one junior creative user
- one mid creative user
- one senior creative user
- one lead or head reviewer-heavy user
- one user with sparse activity

### 7.3 What To Watch

- skipped tasks because of invalid assignment state
- historical tasks missing trustworthy `completedAt`
- reviewer eligibility mismatches
- unexpectedly high or low badge volume
- streak resets that look wrong in admin history

### 7.4 Current Historical Backfill Findings

The first narrow backfill was run on February 28, 2026 for:

- `2026-02-09` to `2026-02-15`
- `2026-02-16` to `2026-02-22`

Observed output:

- `26` weekly snapshots created
- `0` badge awards created
- `0` active streak rows created
- `0` zero-assignee warnings
- `0` multi-assignee warnings

Observed data readiness in the current shared environment:

- `13` active users exist
- `0` active users currently have `seniority` assigned
- `0` cards currently have `completedAt` populated
- `0` submitted evaluations currently exist

Operational conclusion:

- the rewards code path is functioning correctly
- the current historical dataset does not yet contain reward-eligible weekly completion or review history
- login rewards can start accumulating immediately from current usage
- weekly velocity, quality, combined, and reviewer badges require seniority assignment plus new forward-looking task/review activity

## 8. Launch Criteria

Move from validation to full MVP rollout only when all of these are true:

- [ ] Migration has been applied successfully in the target environment
- [ ] Seed completed successfully
- [ ] Admin rewards settings page works
- [ ] Login tracking is idempotent in real usage
- [ ] Weekly snapshot cron succeeds without unexplained warnings
- [ ] Backfill has been run for the intended historical window
- [ ] Snapshot outputs are close enough to existing metrics to explain any differences
- [ ] Trophy case and home rewards UI behave correctly for real users
- [ ] Permissions are correct for profile/trophy-case visibility

## 9. Post-Launch Monitoring

During the first weeks after rollout, monitor:

- weekly cron success/failure
- admin debug counts for snapshots, awards, and active streaks
- duplicate or suspicious login records
- repeated warnings about invalid task assignment data
- user complaints about incorrect streak resets or missing badges

Recommended admin checks after each weekly cron:

- open `/settings/rewards`
- verify the latest snapshot week advanced
- spot-check recent badge awards
- spot-check one or two user history drill-downs

## 10. Known Operational Limitations

These should be understood before launch:

- historical `completedAt` coverage may be incomplete for older tasks
- if no users have assigned seniority, weekly badge evaluation will remain inactive even when snapshots are created
- invalid historical task assignment data can reduce attribution quality
- the current system is additive; there is no formal destructive reset workflow for rewards data
- the current MVP does not yet have export/reporting for rewards history
- the current MVP does not yet have feature-flagged rollout controls for hiding rewards while keeping collection on

## 11. Production Rollout Sequence

Recommended production order:

1. Deploy application code
2. Apply Prisma migration
3. Run `npm run db:seed:rewards`
4. Assign seniority for active users
5. Smoke test `/settings/rewards` as admin
6. Smoke test one user login record
7. Run a narrow scoped backfill
8. Review admin rewards overview and selected-user history
9. Run broader backfill only if historical data quality justifies it
10. Enable scheduled weekly rewards cron
11. Start validation monitoring

## 12. If Something Looks Wrong

Preferred containment steps:

1. Stop the weekly rewards cron schedule
2. Stop any ongoing backfill runs
3. Use `/settings/rewards` and selected-user history to isolate whether the issue is login, snapshot, or badge evaluation
4. Fix code or data assumptions before rerunning backfill

Avoid destructive cleanup of rewards data unless a dedicated corrective script has been reviewed first.
