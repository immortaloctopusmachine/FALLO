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

### 1.4 Board UI 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Board layout component | 🔴 | - | |
| List component | 🔴 | - | Header with counts |
| List header (card count, SP sum) | 🔴 | - | |
| Add list functionality | 🔴 | - | |
| Drag-drop lists | 🔴 | - | dnd-kit |

### 1.5 Task Card (Basic) 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Task card compact view | 🔴 | - | |
| Task card full view (modal) | 🔴 | - | |
| Card description | 🔴 | - | |
| Story points | 🔴 | - | |
| Drag-drop cards | 🔴 | - | |

---

## Phase 2: Card Types & Relationships
**Target**: Full card type implementation with connections

### 2.1 Task Card (Complete) 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Attachments with comments | 🔴 | - | |
| Todo checklist | 🔴 | - | |
| Feedback checklist | 🔴 | - | |
| Card chat | 🔴 | - | |
| User assignment | 🔴 | - | |
| Deadline | 🔴 | - | |
| Card color option | 🔴 | - | |
| Feature image | 🔴 | - | |

### 2.2 User Story Card 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Compact view | 🔴 | - | |
| Full view modal | 🔴 | - | |
| Connected tasks display | 🔴 | - | |
| Completion percentage | 🔴 | - | Auto-calculated |
| Optional todo checklist | 🔴 | - | |
| Chat | 🔴 | - | |
| Deadline display (from tasks) | 🔴 | - | |
| Story point sum display | 🔴 | - | |
| Flags (complex, high-risk, missing-docs) | 🔴 | - | |

### 2.3 Epic Card 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Compact view | 🔴 | - | |
| Full view modal | 🔴 | - | |
| Connected user stories | 🔴 | - | |
| Progress overview | 🔴 | - | |
| Optional todo checklist | 🔴 | - | |
| Chat | 🔴 | - | |
| Story point sum display | 🔴 | - | |

### 2.4 Utility Card 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Link subtype | 🔴 | - | |
| Note subtype | 🔴 | - | |
| Milestone subtype | 🔴 | - | |
| Blocker subtype | 🔴 | - | |

### 2.5 Card Connections 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Link task to user story | 🔴 | - | |
| Link user story to epic | 🔴 | - | |
| Link task to epic (direct) | 🔴 | - | |
| Connection UI in modals | 🔴 | - | |

---

## Phase 3: Board Modes & Views
**Target**: Multiple board views and project overview

### 3.1 Board Modes 🔴
| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Tasks & User Stories view | 🔴 | - | Default |
| Epics & Project Data view | 🔴 | - | |
| View switcher UI | 🔴 | - | |

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
