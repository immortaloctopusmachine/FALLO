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

### 2.1 Task Card (Complete) 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Attachments with comments | 🟢 | Claude | Rename, comment on attachments, @[name] links in comments |
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

### 3.2 Board Management 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Create board | 🟢 | Claude | CreateBoardDialog component |
| Board settings | 🟢 | Claude | BoardSettingsModal (dates, links, archive) |
| Board templates | 🟢 | Claude | Blank, Standard Slot, Branded Game templates |
| Archive board | 🟢 | Claude | Danger zone in settings with confirmation |
| Board member management | 🟢 | Claude | BoardMembersModal with role management |

### 3.3 Project Templates 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Clone board API with ID remapping | 🟢 | Claude | POST /api/boards/[id]/clone |
| Duplicate board from settings | 🟢 | Claude | Clone & Templates section in settings |
| Save as template option | 🟢 | Claude | Creates board with isTemplate=true |
| Template indicator on boards page | 🟢 | Claude | Separate section, warning color badge |
| Create from project template | 🟢 | Claude | In CreateBoardDialog with template picker |
| Card connections preserved in clone | 🟢 | Claude | ID remapping for Task→UserStory→Epic links |
| Board card quick actions (admin) | 🟢 | Claude | Dropdown menu on board cards for duplicate/template |

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

## Phase 5.5: Organization & Timeline
**Target**: Studios, Teams, Users hierarchy and Timeline view

### 5.5.1 Organization Structure 🟡
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Studio model & CRUD | 🟢 | Claude | With teams, skills, tags relations |
| Team model & CRUD | 🟢 | Claude | With color, members, boards relations |
| Team member management | 🟢 | Claude | With roles and titles |
| User skills system | 🟢 | Claude | UserSkill model with Skill relation |
| Tags system | 🟢 | Claude | Tag and CardTag models |
| Organization page | 🟢 | Claude | Studios, teams, users hierarchy view |
| Settings pages | 🟢 | Claude | Skills, tags, block types, event types managers |

### 5.5.2 Timeline View 🟡
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| BlockType model | 🟢 | Claude | With seeded defaults (Spine, Concept, Production, Tweak) |
| EventType model | 🟢 | Claude | With seeded defaults (GSD, Review, Demo, etc.) |
| TimelineBlock model | 🟢 | Claude | Linked to boards and lists |
| TimelineEvent model | 🟢 | Claude | Milestones and deadlines |
| TimelineAssignment model | 🟢 | Claude | User dedication percentages |
| Timeline view page | 🟢 | Claude | Grid with date headers, project rows, blocks |
| Zoom levels (Day/Week/Month) | 🟢 | Claude | With business day calculation |
| Filter panel | 🟢 | Claude | By team, user, block type, event type |
| Global navigation header | 🟢 | Claude | Consistent nav across all dashboard pages |
| Create project from Timeline | 🟢 | Claude | CreateProjectDialog with templates |
| Grid fills viewport width | ⏸️ | - | See Notes section - CSS approaches tried |
| Block drag-and-drop (resize/move) | 🟢 | Claude | Snap-to-grid, business day calc |
| Block edit modal | 🟢 | Claude | BlockEditModal with type/dates/list |
| Block delete functionality | 🟢 | Claude | Context menu + modal confirmation |
| Add new block functionality | 🟢 | Claude | AddBlockDialog with list options |
| Timeline events CRUD | 🟢 | Claude | EventEditModal, right-click context menu on events row |
| Event drag-and-drop | 🟢 | Claude | Day-by-day snapping, business day calculation |
| Events follow block moves | 🟢 | Claude | Events in block date range move with blocks |
| Long-press right-click drag | 🟢 | Claude | 400ms hold to drag entire section (all blocks + events) |
| Block collision prevention | 🟢 | Claude | Blocks push in drag direction, cascading resolution |
| Cross-project state isolation | 🟢 | Claude | Fixed stale closure bug in state updaters |

### 5.5.3 Timeline-Planning Sync 🟢
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| List-TimelineBlock one-to-one relation | 🟢 | Claude | listId on TimelineBlock |
| Auto-create timeline blocks | 🟢 | Claude | When planning lists get dates |
| Apply dates from project start | 🟢 | Claude | POST /api/boards/[id]/apply-dates |
| Sync to Timeline button | 🟢 | Claude | In Planning view stats |
| Sync indicator badges | 🟢 | Claude | On planning lists with linked blocks |
| durationDays support | 🟢 | Claude | 5-day blocks with business day calc |

### 5.5.4 Time Tracking 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| TimeLog model | 🟢 | Claude | Schema ready |
| Auto-start on In Progress | 🔴 | - | When card moves to In Progress |
| Manual time entry (admin) | 🔴 | - | |
| User time stats | 🔴 | - | |

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
| 2026-02-03 | 5.5.2 | Timeline events: CRUD with context menu, drag-and-drop (day snap), events follow blocks, long-press drag for entire section, block collision prevention, cross-project state isolation fix | Claude |
| 2026-02-02 | 5.5.2 | Timeline block interactions: drag-and-drop resize/move, edit modal, delete with confirmation, add new block dialog with list linking options | Claude |
| 2026-02-02 | 5.5.2 | Global navigation header, Create Project from Timeline dialog, Planning view collapsible lists with story points, Timeline week/month visual separators | Claude |
| 2026-02-01 | 5.5.3 | Timeline-Planning Sync: auto-create timeline blocks from planning lists, apply dates endpoint, sync button in Planning view, sync badges on lists | Claude |
| 2026-01-31 | 3.3 | Project Templates: clone board API with ID remapping for card connections, duplicate/save as template in settings, template indicator on boards page, create from template in dialog | Claude |
| 2026-01-31 | 2.1 | Attachments with comments: rename attachments, comment on attachments, @[name] syntax to link attachments in card comments | Claude |
| 2025-01-31 | 3.2 | Board Management complete: templates (Blank/Standard Slot/Branded Game), archive board, member management (add/remove/roles) | Claude |
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

### Timeline Grid Width Issue (Blocked)
The timeline grid does not fill the entire viewport width when there are fewer columns than the viewport width. Multiple CSS approaches were tried without success:

1. **Approach 1**: Changed container from fixed `width: totalDays * columnWidth` to `minWidth: '100%', width: max(100%, ${totalDays * columnWidth}px)` - No effect
2. **Approach 2**: Wrapped DateHeader and project rows in a single container with minWidth - No effect
3. **Approach 3**: Added flex fill divs (`<div className="flex-1 bg-background" />`) at the end of each row to fill remaining space - No effect
4. **Approach 4**: Added minWidth prop to TimelineProjectRow and TimelineUserRow components - No effect

The issue persists across all zoom levels (day, week, month) with month view being closest to filling the viewport. Root cause likely involves the scrollable container and flex layout interaction. May need investigation with browser dev tools to identify the constraint.

### Open Questions
1. Real-time collaboration scope for MVP?
2. Mobile-first or desktop-first?
3. Self-hosted vs. cloud deployment?

---

*Update this document when starting/completing tasks. Commit with message: `docs(roadmap): update [phase] status`*
