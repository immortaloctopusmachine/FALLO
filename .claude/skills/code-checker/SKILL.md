---
name: code-checker
description: Check codebase for consistency issues, tech debt patterns, and code quality problems. Use this skill when reviewing code before commits, after significant changes, or when looking for patterns that should be refactored. Checks include old auth patterns, hardcoded values that should use constants, missing input validation, duplicate type definitions, and duplicate utility functions.
---

# Code Checker

Analyze the codebase for consistency issues and tech debt patterns.

## Checks to Perform

### 1. Auth Pattern Consistency

Search for old auth patterns that should use centralized utilities:

```bash
# Old session patterns - should use requireAuth()
rg "getServerSession|auth\(\)" --type ts -g "!**/auth/**" -g "!*.test.ts"

# Direct session.user.role access - should be session.user.permission
rg "session\.user\.role" --type ts
```

**Expected**: No results outside auth configuration files.

### 2. Hardcoded Phase Mappings

Search for hardcoded phase search terms that should use `PHASE_SEARCH_TERMS` from constants:

```bash
rg "(pre.?prod|post.?prod|concept|storyboard|layout|anim)" --type ts -g "!constants.ts" -g "!*.test.ts" -i
```

**Expected**: No matches in API routes. Only UI display code may have phase references.

### 3. Input Validation

Check API routes for missing input validation:

```bash
# Routes that accept body but may lack validation
rg "request\.json\(\)" src/app/api --type ts -l
```

For each file found, verify it has appropriate validation for:
- Required fields check
- Type validation
- Length limits where appropriate (titles, descriptions)

### 4. Duplicate Type Definitions

Search for inline type definitions that should use centralized types from `@/types`:

```bash
# Interface definitions in component files
rg "^interface (User|Team|Board|Card|List)" src/components --type ts

# Type aliases that duplicate @/types
rg "^type (User|Team|Board|Card|List)" src/components --type ts
```

**Expected**: Components should import from `@/types`, not define their own.

### 5. Duplicate Utility Functions

Search for utility functions that may duplicate centralized utilities:

```bash
# Date formatting in components
rg "new Date\(\)\.toLocale|format.*Date" src/components --type ts

# Color utilities
rg "getContrastColor|hexToRgb" src/components --type ts -g "!*.test.ts"
```

**Expected**: Should use utilities from `@/lib/date-utils` and `@/lib/color-utils`.

### 6. Missing API Utility Usage

Check for manual error responses that should use `ApiErrors`:

```bash
rg "NextResponse\.json.*error|status: (400|401|403|404|500)" src/app/api --type ts
```

**Expected**: All error responses should use `ApiErrors.validation()`, `ApiErrors.notFound()`, etc.

## Running the Check

Execute checks using the Grep tool or bash commands above. Report findings organized by category with file paths and line numbers.

## Output Format

```
## Code Consistency Report

### Auth Patterns
- [status] Description of findings

### Phase Mappings
- [status] Description of findings

### Input Validation
- [status] Description of findings

### Type Definitions
- [status] Description of findings

### Utility Functions
- [status] Description of findings

### API Utilities
- [status] Description of findings

### Summary
X issues found across Y categories.
```

Use `[PASS]` for no issues, `[WARN]` for potential issues to review, `[FAIL]` for definite problems.
