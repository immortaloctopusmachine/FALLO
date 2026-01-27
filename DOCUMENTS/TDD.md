# TDD.md - Technical Design Document

## 1. Overview

### 1.1 Purpose
This document defines the technical architecture, data models, and implementation specifications for **Fallo**.

### 1.2 Scope
- Web application architecture
- Database schema design
- API specifications
- Integration patterns
- Security model

### 1.3 Related Documents
- `_ROADMAP.md` - Implementation timeline
- `GSD.md` - Feature specifications
- `GDD.md` - UI/UX specifications
- `API.md` - Detailed API documentation

---

## 2. System Architecture

### 2.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Web Browser   │   PyQt5 App     │   Other API Consumers   │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
         ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  React UI    │  │  API Routes  │  │  Server Actions  │   │
│  │  (App Router)│  │  /api/*      │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Prisma     │  │  NextAuth    │  │  External APIs   │   │
│  │   ORM        │  │              │  │  (Claude, etc.)  │   │
│  └──────┬───────┘  └──────────────┘  └──────────────────┘   │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Runtime | Node.js | 20 LTS | Stability, Next.js compatibility |
| Framework | Next.js | 15.x | App Router, API routes, SSR |
| Language | TypeScript | 5.x | Type safety, DX |
| UI Library | React | 19.x | Latest features |
| Styling | Tailwind CSS | 3.x | Utility-first, design system |
| Components | shadcn/ui | latest | Customizable, accessible |
| State (Client) | Zustand | 5.x | Lightweight, TypeScript-first |
| State (Server) | TanStack Query | 5.x | Caching, sync |
| ORM | Prisma | 6.x | Type-safe, migrations |
| Database | PostgreSQL | 16.x | Relational, JSON support |
| Auth | NextAuth.js | 5.x | Flexible, role support |
| Drag & Drop | dnd-kit | 6.x | Accessible, performant |
| Testing | Vitest + RTL | latest | Fast, React-focused |
| E2E Testing | Playwright | latest | Cross-browser |

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───┬───│ BoardMember │───────│    Board    │
└─────────────┘   │   └─────────────┘       └──────┬──────┘
                  │                                 │
                  │   ┌─────────────┐              │
                  └───│  CardUser   │              │
                      └──────┬──────┘              │
                             │                     │
                             │              ┌──────┴──────┐
                             │              │    List     │
                             │              └──────┬──────┘
                             │                     │
                             ▼              ┌──────┴──────┐
                      ┌─────────────┐       │    Card     │◄──┐
                      │   Comment   │───────│  (base)     │   │
                      └─────────────┘       └──────┬──────┘   │
                                                   │          │
                      ┌────────────────────────────┼──────────┤
                      │            │               │          │
               ┌──────┴──────┐ ┌───┴────┐  ┌──────┴─────┐    │
               │  TaskCard   │ │UserStory│  │   Epic     │    │
               │  (extends)  │ │(extends)│  │ (extends)  │    │
               └──────┬──────┘ └────┬───┘  └────────────┘    │
                      │             │                         │
                      └─────────────┴─────────────────────────┘
                           (parent relationships)
```

### 3.2 Schema Definitions

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============== ENUMS ==============

enum UserRole {
  VIEWER
  MEMBER
  ADMIN
  SUPER_ADMIN
}

enum CardType {
  TASK
  USER_STORY
  EPIC
  UTILITY
}

enum UtilitySubtype {
  LINK
  NOTE
  MILESTONE
  BLOCKER
}

enum UserStoryFlag {
  COMPLEX
  HIGH_RISK
  MISSING_DOCS
  BLOCKED
  NEEDS_REVIEW
}

// ============== MODELS ==============

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String?
  image         String?
  role          UserRole      @default(MEMBER)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  // Relations
  boardMembers  BoardMember[]
  assignedCards CardUser[]
  comments      Comment[]
  activities    Activity[]
}

model Board {
  id            String        @id @default(cuid())
  name          String
  description   String?
  isTemplate    Boolean       @default(false)
  settings      Json          @default("{}")  // LLM settings, etc.
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  archivedAt    DateTime?
  
  // Relations
  members       BoardMember[]
  lists         List[]
  activities    Activity[]
}

model BoardMember {
  id        String    @id @default(cuid())
  role      UserRole  @default(MEMBER)
  joinedAt  DateTime  @default(now())
  
  // Relations
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  boardId   String
  board     Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)
  
  @@unique([userId, boardId])
}

model List {
  id        String    @id @default(cuid())
  name      String
  position  Int
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  // Relations
  boardId   String
  board     Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards     Card[]
  
  @@index([boardId])
}

model Card {
  id            String      @id @default(cuid())
  type          CardType
  title         String
  description   String?
  position      Int
  color         String?     // Hex color
  featureImage  String?     // URL
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  archivedAt    DateTime?
  
  // Relations
  listId        String
  list          List        @relation(fields: [listId], references: [id], onDelete: Cascade)
  assignees     CardUser[]
  comments      Comment[]
  attachments   Attachment[]
  checklists    Checklist[]
  
  // Hierarchy relations
  parentId      String?
  parent        Card?       @relation("CardHierarchy", fields: [parentId], references: [id])
  children      Card[]      @relation("CardHierarchy")
  
  // Type-specific data (JSON for flexibility)
  taskData      Json?       // TaskCardData
  userStoryData Json?       // UserStoryCardData
  epicData      Json?       // EpicCardData
  utilityData   Json?       // UtilityCardData
  
  @@index([listId])
  @@index([parentId])
  @@index([type])
}

model CardUser {
  id        String    @id @default(cuid())
  assignedAt DateTime @default(now())
  
  // Relations
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId    String
  card      Card      @relation(fields: [cardId], references: [id], onDelete: Cascade)
  
  @@unique([userId, cardId])
}

model Comment {
  id        String    @id @default(cuid())
  content   String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  // Relations
  authorId  String
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  cardId    String
  card      Card      @relation(fields: [cardId], references: [id], onDelete: Cascade)
  
  // For attachment comments
  attachmentId String?
  attachment   Attachment? @relation(fields: [attachmentId], references: [id])
  
  @@index([cardId])
}

model Attachment {
  id        String    @id @default(cuid())
  name      String
  url       String
  type      String    // MIME type
  size      Int       // bytes
  createdAt DateTime  @default(now())
  
  // Relations
  cardId    String
  card      Card      @relation(fields: [cardId], references: [id], onDelete: Cascade)
  comments  Comment[]
  
  @@index([cardId])
}

model Checklist {
  id        String          @id @default(cuid())
  name      String
  type      String          // "todo", "feedback"
  position  Int
  createdAt DateTime        @default(now())
  
  // Relations
  cardId    String
  card      Card            @relation(fields: [cardId], references: [id], onDelete: Cascade)
  items     ChecklistItem[]
  
  @@index([cardId])
}

model ChecklistItem {
  id          String    @id @default(cuid())
  content     String
  isComplete  Boolean   @default(false)
  position    Int
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relations
  checklistId String
  checklist   Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  
  @@index([checklistId])
}

model Activity {
  id        String    @id @default(cuid())
  action    String    // "created", "moved", "updated", etc.
  entity    String    // "card", "list", "board"
  entityId  String
  data      Json      // Additional context
  createdAt DateTime  @default(now())
  
  // Relations
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  boardId   String
  board     Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)
  
  @@index([boardId])
  @@index([entityId])
}
```

### 3.3 Type-Specific JSON Structures

```typescript
// src/types/card-data.ts

interface TaskCardData {
  storyPoints: number | null;
  deadline: string | null; // ISO date
  linkedUserStoryId: string | null;
  linkedEpicId: string | null;
}

interface UserStoryCardData {
  linkedEpicId: string | null;
  flags: UserStoryFlag[];
  // Computed fields (not stored):
  // - completionPercentage
  // - totalStoryPoints
  // - taskDeadlines
}

interface EpicCardData {
  // Computed fields (not stored):
  // - totalStoryPoints
  // - linkedUserStoryCount
  // - overallProgress
}

interface UtilityCardData {
  subtype: UtilitySubtype;
  url?: string;          // For LINK type
  content?: string;      // For NOTE type
  date?: string;         // For MILESTONE type
  blockedCardIds?: string[]; // For BLOCKER type
}
```

---

## 4. API Design

### 4.1 API Routes Structure
```
/api/
├── auth/                    # NextAuth endpoints
│   └── [...nextauth]/
├── boards/
│   ├── route.ts             # GET (list), POST (create)
│   └── [boardId]/
│       ├── route.ts         # GET, PATCH, DELETE
│       ├── lists/
│       │   ├── route.ts     # GET, POST
│       │   └── [listId]/
│       │       └── route.ts # PATCH, DELETE
│       ├── cards/
│       │   ├── route.ts     # GET, POST
│       │   └── [cardId]/
│       │       ├── route.ts # GET, PATCH, DELETE
│       │       ├── comments/
│       │       ├── attachments/
│       │       └── checklists/
│       └── members/
│           └── route.ts     # GET, POST, DELETE
├── users/
│   └── route.ts
└── webhooks/
    └── route.ts
```

### 4.2 API Response Format
```typescript
// Success response
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

// Error response
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

### 4.3 Authentication & Authorization

**Authentication Flow:**
1. Web UI: NextAuth session cookies
2. External API: Bearer token (API key)

**Authorization Matrix:**

| Resource | Viewer | Member | Admin | Super Admin |
|----------|--------|--------|-------|-------------|
| View board | ✓ | ✓ | ✓ | ✓ |
| Move cards | ✗ | ✓ | ✓ | ✓ |
| Edit cards | ✗ | ✓ | ✓ | ✓ |
| Comment | ✗ | ✓ | ✓ | ✓ |
| Create lists | ✗ | ✗ | ✓ | ✓ |
| Delete lists | ✗ | ✗ | ✓ | ✓ |
| Board settings | ✗ | ✗ | ✓ | ✓ |
| Manage members | ✗ | ✗ | ✓ | ✓ |
| Delete board | ✗ | ✗ | ✗ | ✓ |
| App settings | ✗ | ✗ | ✗ | ✓ |

---

## 5. State Management

### 5.1 Client State (Zustand)

```typescript
// src/lib/stores/ui-store.ts
interface UIStore {
  activeModal: ModalType | null;
  activeCardId: string | null;
  sidebarCollapsed: boolean;
  boardView: 'tasks' | 'epics';
  
  // Actions
  openCardModal: (cardId: string) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setBoardView: (view: 'tasks' | 'epics') => void;
}
```

### 5.2 Server State (TanStack Query)

```typescript
// Query keys structure
const queryKeys = {
  boards: ['boards'] as const,
  board: (id: string) => ['boards', id] as const,
  lists: (boardId: string) => ['boards', boardId, 'lists'] as const,
  cards: (boardId: string) => ['boards', boardId, 'cards'] as const,
  card: (cardId: string) => ['cards', cardId] as const,
};
```

---

## 6. Security

### 6.1 Input Validation
- Zod schemas for all API inputs
- Sanitize HTML in user content (DOMPurify)
- Rate limiting on public endpoints

### 6.2 Data Protection
- Environment variables for secrets
- Encrypted API keys for LLM
- Row-level security where applicable

### 6.3 CORS Policy
- Whitelist origins for API access
- Credentials handling for cross-origin

---

## 7. Performance Considerations

### 7.1 Database
- Indexes on frequently queried columns
- Pagination for list endpoints
- Eager loading for related data

### 7.2 Frontend
- Virtual scrolling for long lists (100+ cards)
- Optimistic updates for drag-drop
- Image lazy loading and optimization
- Code splitting by route

### 7.3 Caching
- TanStack Query stale-while-revalidate
- Static generation for marketing pages
- ISR for board templates

---

## 8. Error Handling

### 8.1 Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_REQUIRED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

### 8.2 Error Boundaries
- Top-level error boundary for app crashes
- Component-level boundaries for isolated failures
- Fallback UI with retry options

---

## 9. Deployment Architecture

### 9.1 Recommended Setup
```
┌─────────────────┐     ┌─────────────────┐
│   Vercel /      │────▶│   PostgreSQL    │
│   Railway       │     │   (Supabase /   │
│   (Next.js)     │     │   Railway)      │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Cloudflare    │
│   (CDN/Images)  │
└─────────────────┘
```

### 9.2 Environment Variables
```env
# Database
DATABASE_URL=

# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# LLM (optional)
ANTHROPIC_API_KEY=

# External
CLOUDFLARE_ACCOUNT_ID=
```

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-26 | Claude | Initial document |

---

*Refer to this document when implementing data models, APIs, or making architectural decisions.*
