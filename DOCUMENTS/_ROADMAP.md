# _ROADMAP.md - Fallo Implementation Plan

## Status Legend
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Complete
- ⏸️ Blocked
- 🔵 In Review

---

## Phase 1: Foundation (MVP)
**Target**: Core board functionality with basic cards

### 1.1 Project Setup 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Initialize Next.js 15 + TypeScript | 🟢 | Claude | App Router |
| Configure Tailwind + shadcn/ui | 🟢 | Claude | Design tokens from GDD |
| Set up Prisma + PostgreSQL | 🟢 | Claude | Supabase ready |
| Configure ESLint + Prettier | 🟢 | Claude | |
| Set up testing (Vitest + RTL) | 🟢 | Claude | |
| Create .env.example | 🟢 | Claude | |
| GitHub repo + branch protection | 🟢 | Claude | FALLO repo |

### 1.2 Database Schema 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| User model | 🟢 | Claude | With NextAuth support |
| Board model | 🟢 | Claude | |
| List model | 🟢 | Claude | |
| Card base model | 🟢 | Claude | Polymorphic with JSON data |
| Task card fields | 🟢 | Claude | |
| User Story card fields | 🟢 | Claude | |
| Epic card fields | 🟢 | Claude | |
| Utility card fields | 🟢 | Claude | |
| Card relationships | 🟢 | Claude | Epic→Story→Task |

### 1.3 Authentication 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| NextAuth.js setup | 🟢 | Claude | Credentials provider |
| User roles (viewer/member/admin/super) | 🟢 | Claude | In schema |
| Protected routes | 🟢 | Claude | Basic redirect |
| Permission middleware | 🔴 | - | Phase 2 |

### 1.4 Board UI 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Board layout component | 🟢 | Claude | BoardView, BoardHeader |
| List component | 🟢 | Claude | Header with counts |
| List header (card count, SP sum) | 🟢 | Claude | |
| Add list functionality | 🟢 | Claude | |
| Drag-drop lists | 🔴 | - | Deferred (cards work) |
| Drag-drop cards | 🟢 | Claude | dnd-kit with custom collision |
| Board API endpoints | 🟢 | Claude | CRUD + reorder |

### 1.5 Task Card (Basic) 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Task card compact view | 🟢 | Claude | CardCompact component |
| Task card full view (modal) | 🟢 | Claude | CardModal component |
| Card description | 🟢 | Claude | In CardModal |
| Story points | 🟢 | Claude | Fibonacci buttons (1,2,3,5,8,13,21) |
| Assignees display | 🟢 | Claude | Avatars in compact view |

---

## Phase 2: Card Types & Relationships
**Target**: Full card type implementation with connections

### 2.1 Task Card (Complete) 🟡
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Attachments with comments | 🔴 | - | Deferred |
| Todo checklist | 🟢 | Claude | ChecklistSection component |
| Feedback checklist | 🟢 | Claude | ChecklistSection component |
| Card chat | 🟢 | Claude | CommentsSection component |
| User assignment | 🟢 | Claude | AssigneePicker component |
| Deadline | 🟢 | Claude | DeadlinePicker with calendar |
| Card color option | 🟢 | Claude | ColorPicker (8 colors) |
| Feature image | 🟢 | Claude | URL input |

### 2.2 User Story Card 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Compact view | 🟢 | Claude | With progress bar, flags, SP sum |
| Full view modal | 🟢 | Claude | Connected tasks display |
| Connected tasks display | 🟢 | Claude | Auto-computed from linked tasks |
| Completion percentage | 🟢 | Claude | Based on task checklist completion |
| Optional todo checklist | 🔴 | - | Deferred |
| Chat | 🟢 | Claude | Uses CommentsSection |
| Deadline display (from tasks) | 🔴 | - | Deferred |
| Story point sum display | 🟢 | Claude | Auto-computed |
| Flags (complex, high-risk, missing-docs) | 🟢 | Claude | 5 flag types with toggle UI |

### 2.3 Epic Card 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Compact view | 🟢 | Claude | With progress bar, story count |
| Full view modal | 🟢 | Claude | Connected user stories display |
| Connected user stories | 🟢 | Claude | Auto-computed from linked stories |
| Progress overview | 🟢 | Claude | Based on connected tasks completion |
| Optional todo checklist | 🔴 | - | Deferred |
| Chat | 🟢 | Claude | Uses CommentsSection |
| Story point sum display | 🟢 | Claude | Auto-computed |

### 2.4 Utility Card 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Link subtype | 🟢 | Claude | URL input with external link button |
| Note subtype | 🟢 | Claude | Content textarea |
| Milestone subtype | 🟢 | Claude | Date picker |
| Blocker subtype | 🟢 | Claude | Details textarea |

### 2.5 Card Connections 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Link task to user story | 🟢 | Claude | ConnectionPicker component |
| Link user story to epic | 🟢 | Claude | ConnectionPicker component |
| Auto-inherit epic from user story | 🟢 | Claude | Tasks inherit Epic via linked User Story |
| Connection UI in modals | 🟢 | Claude | Searchable dropdown |
| Create linked card from modal | 🟢 | Claude | Quick-create linked Task/Story from parent |
| Connected cards on page load | 🟢 | Claude | Server-side computed stats |

---

## Phase 3: Board Modes & Views
**Target**: Multiple board views and project overview

### 3.1 Board Modes 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Tasks View (Artist view) | 🟢 | Claude | TasksView component with sidebar |
| Planning View (Lead/PO view) | 🟢 | Claude | PlanningView with epics sidebar |
| View switcher UI | 🟢 | Claude | Toggle in BoardHeader |
| Quick filters (All/Mine/Unassigned) | 🟢 | Claude | In Tasks view |
| Burn-up chart | 🟢 | Claude | SVG chart with sprint lines |
| Statistics dashboard | 🟢 | Claude | In Planning view header |
| Epic health indicator | 🟢 | Claude | on_track/at_risk/behind |
| List templates (Standard Slot, Branded Game) | 🟢 | Claude | In list-templates.ts |
| View-specific list types | 🟢 | Claude | TASKS vs PLANNING lists |

### 3.2 Board Management 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Create board | 🔴 | - | |
| Board settings | 🔴 | - | |
| Board templates | 🔴 | - | |
| Archive board | 🔴 | - | |
| Board member management | 🔴 | - | |

---

## Phase 4: LLM Integration
**Target**: Optional Claude integration for smart features

### 4.1 LLM Setup 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Board-level LLM toggle | 🔴 | - | Admin only |
| API key storage (encrypted) | 🔴 | - | |
| Rate limiting | 🔴 | - | |

### 4.2 LLM Features 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Feedback summarization | 🔴 | - | |
| Action item extraction | 🔴 | - | |
| Story point suggestion | 🔴 | - | |
| User story generation from epic | 🔴 | - | |

---

## Phase 5: API & Integration
**Target**: External API for PyQt5 app integration

### 5.1 REST API 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Board endpoints | 🔴 | - | |
| List endpoints | 🔴 | - | |
| Card endpoints (all types) | 🔴 | - | |
| User endpoints | 🔴 | - | |
| API authentication | 🔴 | - | API keys |
| Rate limiting | 🔴 | - | |
| API documentation | 🔴 | - | OpenAPI/Swagger |

### 5.2 Webhooks 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Webhook configuration | 🔴 | - | |
| Card events | 🔴 | - | |
| Board events | 🔴 | - | |

---

## Phase 6: Polish & Advanced Features
**Target**: Production readiness

### 6.1 UX Improvements 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Keyboard shortcuts | 🔴 | - | |
| Search & filters | 🔴 | - | |
| Bulk operations | 🔴 | - | |
| Activity log | 🔴 | - | |
| Notifications | 🔴 | - | |

### 6.2 Performance 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| List virtualization | 🔴 | - | |
| Optimistic updates | 🔴 | - | |
| Image optimization | 🔴 | - | |
| Caching strategy | 🔴 | - | |

### 6.3 Deployment 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| CI/CD pipeline | 🔴 | - | |
| Production environment | 🔴 | - | |
| Monitoring & logging | 🔴 | - | |
| Backup strategy | 🔴 | - | |

---

## Changelog

| Date | Phase | Change | Author |
|------|-------|--------|--------|
| 2025-01-30 | 3.1 | Bug fixes: Planning lists immediate display, view state sync, linked card list selection, API error handling, accessibility improvements | Claude |
| 2025-01-30 | 3.1 | Board Modes complete: Tasks/Planning views, burn-up chart, statistics, epic health, list templates | Claude |
| 2025-01-28 | 2.5 | Create linked card from modal; Epic inheritance for Tasks; Server-side connected card stats | Claude |
| 2025-01-28 | 2.2-2.5 | User Story, Epic, Utility cards complete; Card Connections with ConnectionPicker | Claude |
| 2025-01-27 | 2.1 | Task Card Complete: checklists, comments, assignment, deadline, color, image | Claude |
| 2025-01-27 | 1.5 | Completed Task Card Basic with modal, description, Fibonacci story points | Claude |
| 2025-01-27 | 1.4 | Completed Board UI with lists, cards, and drag-drop | Claude |
| 2025-01-27 | 1.1, 1.2, 1.3 | Completed project setup, schema, and auth | Claude |
| 2025-01-26 | - | Initial roadmap created | Claude |

---

## Notes & Decisions

### Architectural Decisions
1. **Card polymorphism**: Single `Card` table with `type` discriminator + type-specific JSON fields. Decision: Implemented in prisma/schema.prisma

### Open Questions
1. Real-time collaboration scope for MVP?
2. Mobile-first or desktop-first?
3. Self-hosted vs. cloud deployment?

---

*Update this document when starting/completing tasks. Commit with message: `docs(roadmap): update [phase] status`*
