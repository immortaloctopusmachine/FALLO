# CLAUDE.md - Fallo

## Project Overview
**Fallo** - A Trello-inspired project management application with custom functionality for production workflows. Features hierarchical card types (Epic → User Story → Task), role-based access, and optional LLM integration.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript + React 19
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand (client) + TanStack Query (server state)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js with role-based permissions
- **LLM**: Anthropic Claude API (optional per-board)
- **Real-time**: Supabase Realtime (future)

## Directory Structure
```
fallo/
├── CLAUDE.md              # This file - AI assistant instructions
├── DOCUMENTS/             # Project documentation
│   ├── _ROADMAP.md        # Implementation phases & status
│   ├── TDD.md             # Technical Design Document
│   ├── ASD.md             # App Specification Document
│   ├── GDD.md             # Graphic Design Document
│   ├── API.md             # API documentation
│   ├── SPINE_TRACKER.md   # Spine Tracker feature documentation
│   └── TECH_DEBT.md       # Code health, duplication, refactoring plan
├── skills/                # Claude Code skills for this project
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   │   ├── ui/            # Base UI components (shadcn)
│   │   ├── cards/         # Card type components
│   │   ├── boards/        # Board & list components
│   │   ├── spine-tracker/ # Spine asset management tool
│   │   └── shared/        # Shared components
│   ├── lib/               # Utilities, API clients
│   ├── types/             # TypeScript definitions
│   ├── hooks/             # Custom React hooks
│   └── styles/            # Global styles
├── prisma/                # Database schema & migrations
├── public/                # Static assets
└── .github/workflows/     # CI/CD pipelines
```

## Key Documents

### When to Reference Each Document

| Document | Read When... |
|----------|--------------|
| **_ROADMAP.md** | Starting any new feature, checking priorities, updating status |
| **TDD.md** | Implementing data models, APIs, architecture decisions |
| **ASD.md** | Implementing card mechanics, user roles, board logic |
| **GDD.md** | Creating UI components, styling, layout decisions |
| **API.md** | Building or consuming API endpoints |
| **SPINE_TRACKER.md** | Working on the Spine Tracker feature, its API, or components |
| **TECH_DEBT.md** | Before refactoring, adding shared utilities, or writing tests |

## Development Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run db:push      # Push Prisma schema to DB
npm run db:studio    # Open Prisma Studio
```

## Git Workflow

### Branch Naming
```
feature/PP-{number}-{short-description}
bugfix/PP-{number}-{short-description}
hotfix/PP-{number}-{short-description}
```

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
```
feat(cards): add task card compact view
fix(boards): resolve drag-drop z-index issue
docs(api): document card endpoints
```

### When to Commit
1. **After completing a logical unit of work** (not mid-feature)
2. **Before switching tasks**
3. **After fixing a bug** (one commit per fix)
4. **After updating documentation**

### When to Push
1. **End of work session**
2. **Before requesting review**
3. **After completing a _ROADMAP milestone**
4. **Minimum: daily if actively developing**

### PR Checklist
- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] _ROADMAP.md updated with status
- [ ] Documentation updated if API/schema changed
- [ ] No console.log or debug code
- [ ] Follows design system (GDD.md)
- [ ] Run `/code-checker` skill for consistency (see below)

## Code Quality Skills

### /code-checker
Run the code-checker skill to scan for consistency issues and tech debt patterns.

**When to run:**
- Before committing significant changes
- After adding new API routes
- After refactoring shared utilities
- When reviewing code for quality issues
- Periodically during development sessions

**What it checks:**
- Auth pattern consistency (should use `requireAuth()`, `session.user.permission`)
- Hardcoded values that should use centralized constants
- Missing input validation in API routes
- Duplicate type definitions (should use `@/types`)
- Duplicate utility functions (should use `@/lib/*-utils`)
- Manual error responses (should use `ApiErrors`)

**Usage:** Type `/code-checker` in Claude Code to run the full check.

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if truly needed)
- Interfaces for object shapes, types for unions/primitives
- Export types from `src/types/`

### Components
- Functional components only
- Props interface defined above component
- Use custom hooks for logic extraction
- Prefer composition over prop drilling

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskCard.tsx` |
| Hooks | camelCase with `use` prefix | `useCardDrag.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase with suffix | `CardType.ts`, `BoardProps.ts` |
| Constants | SCREAMING_SNAKE | `MAX_CARDS_PER_LIST` |

### File Organization
```typescript
// 1. Imports (external, internal, types, styles)
// 2. Types/Interfaces
// 3. Constants
// 4. Component
// 5. Helpers (if small, else separate file)
// 6. Export
```

## Design Principles (from GDD.md)
- **Flat & Clean**: No unnecessary borders, minimal shadows
- **Compact**: 4-8px padding on cards
- **Color-coded**: Card types distinguished by color, not decoration
- **Typography-driven**: Hierarchy through font weight/size, not boxes
- **Responsive**: Mobile-first approach

## Card Type Quick Reference

| Type | Color | Purpose | Key Fields |
|------|-------|---------|------------|
| Task | Blue | Artist work items | Attachments, todos, feedback, story points |
| User Story | Green | Lead-level features | Connected tasks, completion %, flags |
| Epic | Purple | PO-level initiatives | Connected stories, progress overview |
| Utility | Gray | Links, notes, etc. | Flexible content |

## Spine Tracker
Each board has an integrated **Spine Tracker** — a tool for managing Spine 4.2 skeleton assets. Accessed via the "Spine" tab in the board header. See `DOCUMENTS/SPINE_TRACKER.md` for full documentation.

Key points:
- Data stored as JSON in PostgreSQL (`SpineTrackerData` model)
- Auto-saves with 1.5s debounce, optimistic concurrency via version field
- Components in `src/components/spine-tracker/`, hook in `src/hooks/useSpineTracker.ts`
- API routes at `/api/boards/[boardId]/spine-tracker/` (GET, PUT, import, export)
- Types in `src/types/spine-tracker.ts`

## LLM Integration Notes
- LLM features are opt-in per board (admin setting)
- Default provider: Claude (Anthropic)
- Use cases: feedback summarization, action item extraction
- API key stored in board settings (encrypted)
- Rate limiting: respect API quotas

## Testing Strategy
- **Unit**: Vitest for utilities and hooks
- **Component**: React Testing Library
- **E2E**: Playwright for critical flows
- **Coverage target**: 80% for core logic

## Performance Guidelines
- Virtualize long lists (TanStack Virtual)
- Lazy load card details (modal content)
- Optimistic updates for drag-drop
- Image optimization via Next.js Image

## Security Considerations
- Sanitize all user input (especially chat/feedback)
- Role validation on every API endpoint
- Rate limiting on LLM endpoints
- Audit log for admin actions

---

## Quick Start for New Contributors

1. Clone repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd fallo
   npm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. Initialize database:
   ```bash
   npm run db:push
   ```

4. Start development:
   ```bash
   npm run dev
   ```

5. Read these documents in order:
   - `DOCUMENTS/_ROADMAP.md` - Current priorities
   - `DOCUMENTS/TDD.md` - Architecture overview
   - `DOCUMENTS/ASD.md` - App mechanics
   - `DOCUMENTS/GDD.md` - Design system

---

*Last updated: 2026-02-05*
*Spine Tracker integration: 2026-02-03*
*Code-checker skill added: 2026-02-05*
