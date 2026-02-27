# Code Cleanup Rollback (February 24, 2026)

## Scope

This cleanup pass removed unused code/dependencies and consolidated duplicated UI/render logic across settings, timeline, user dialogs, and organization/team forms.

Patch file for this pass:

- `DOCUMENTS/PATCHSETS/cleanup-pass-2026-02-24.patch`

## Validation Run

The following checks passed after cleanup:

- `npm run lint`
- `npm run type-check`
- `npm test`

## Fast Rollback

Revert the entire cleanup pass in one step:

```powershell
git apply -R DOCUMENTS/PATCHSETS/cleanup-pass-2026-02-24.patch
```

Then reinstall dependencies to match the reverted lockfile:

```powershell
npm install
```

## Partial Rollback

Revert only specific files:

```powershell
git restore -- src/lib/utils.ts
git restore -- src/components/timeline/TodayIndicator.tsx
```

If a file was deleted in cleanup, `git restore` will restore it.

## If This Is Committed Later

If you commit this cleanup and want to undo it safely:

```powershell
git revert <cleanup_commit_sha>
```

## Notes

- The patch above is limited to cleanup changes and does not include unrelated local workspace changes.
- Keep this file and patch together so rollback remains one command.
