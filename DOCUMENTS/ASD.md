# GSD.md - Game Specification Document

> **Note**: While traditionally used for game mechanics, this document defines the "mechanics" of our project management application—the rules, behaviors, and interactions that govern how the system works.

## 1. Overview

### 1.1 Purpose
Define the functional behavior, user interactions, and business rules for **Fallo**.

### 1.2 Core Philosophy
- **Hierarchy**: Epic → User Story → Task (PO → Lead → Artist)
- **Clarity**: Each card type serves a distinct purpose and audience
- **Connection**: Seamless linking between card types
- **Simplicity**: Minimal friction for common actions

---

## 2. User Roles

### 2.1 Role Hierarchy
```
Super Admin
    │
    ├── Full app control
    │
Admin (per board)
    │
    ├── Full board control
    │
Member
    │
    ├── Edit/interact with cards
    │
Viewer
    │
    └── Read-only access
```

### 2.2 Role Definitions

| Role | Scope | Capabilities |
|------|-------|--------------|
| **Viewer** | Board | View boards, lists, cards. No editing. |
| **Member** | Board | Move cards, edit cards, comment, checklist items. Cannot create/delete lists or modify board settings. |
| **Admin** | Board | All member abilities + create/delete lists, manage board settings, manage board members, archive cards. |
| **Super Admin** | App | All admin abilities on all boards + app settings, user management, create/delete boards. |

### 2.3 Permission Matrix

| Action | Viewer | Member | Admin | Super Admin |
|--------|--------|--------|-------|-------------|
| View board content | ✓ | ✓ | ✓ | ✓ |
| Move cards | | ✓ | ✓ | ✓ |
| Edit card content | | ✓ | ✓ | ✓ |
| Add comments | | ✓ | ✓ | ✓ |
| Check/uncheck items | | ✓ | ✓ | ✓ |
| Assign users to cards | | ✓ | ✓ | ✓ |
| Create cards | | ✓ | ✓ | ✓ |
| Archive cards | | | ✓ | ✓ |
| Delete cards | | | ✓ | ✓ |
| Create/edit lists | | | ✓ | ✓ |
| Delete lists | | | ✓ | ✓ |
| Board settings | | | ✓ | ✓ |
| Manage board members | | | ✓ | ✓ |
| LLM settings | | | ✓ | ✓ |
| Create boards | | | | ✓ |
| Delete boards | | | | ✓ |
| App settings | | | | ✓ |
| User management | | | | ✓ |

---

## 3. Board Mechanics

### 3.1 Board Structure
```
Board
├── Settings (name, description, LLM config)
├── Members (users with roles)
└── Lists[]
    └── Cards[]
```

### 3.2 Board Modes/Views

| Mode | Description | Default View |
|------|-------------|--------------|
| **Tasks & User Stories** | Kanban view of tasks and user stories | Primary working view |
| **Epics & Project Data** | High-level view of epics and progress | Planning/overview view |

**View Switching Rules:**
- Toggle available in board header
- View preference persisted per user per board
- Cards filter based on view (Tasks view shows Task + User Story + Utility, Epics view shows Epic + aggregated data)

### 3.3 Board Templates
- Pre-configured boards with lists and card structures
- Can be created from existing boards
- Admin-only creation
- Anyone can instantiate a template to a new board

---

## 4. List Mechanics

### 4.1 List Structure
```
List
├── Name
├── Position (sort order)
└── Cards[]
```

### 4.2 List Header Display
- **Total Cards**: Count of all cards in list
- **Total Story Points**: Sum of story points from Task cards only

**Calculation Rules:**
- Only Task cards contribute to story point sum
- User Story and Epic story points are display-only (derived from children)
- Archived cards excluded from counts

### 4.3 List Operations

| Operation | Behavior |
|-----------|----------|
| Create | Add to rightmost position |
| Rename | Inline edit |
| Move | Drag-drop to reorder |
| Delete | Confirm dialog, moves cards to first list or archives |

---

## 5. Card Types

### 5.1 Card Type Overview

| Type | Color | Audience | Purpose |
|------|-------|----------|---------|
| Task | Blue (#3B82F6) | Artists | Individual work items |
| User Story | Green (#22C55E) | Leads | Feature groupings |
| Epic | Purple (#A855F7) | POs | Initiative tracking |
| Utility | Gray (#6B7280) | All | Links, notes, misc |

### 5.2 Card Views
Each card type has two views:
1. **Compact View**: Shown on board (list item)
2. **Full View**: Modal popup with all details

---

## 6. Task Card Specification

### 6.1 Purpose
The atomic unit of work. Assigned to individual contributors (artists).

### 6.2 Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Title | String | ✓ | Task name |
| Description | Rich Text | | Detailed description |
| Story Points | Number | | Effort estimate (Fibonacci: 1,2,3,5,8,13,21) |
| Deadline | Date | | Optional due date |
| Color | Hex | | Visual categorization |
| Feature Image | URL | | Preview image |
| Linked User Story | Reference | | Parent user story |
| Linked Epic | Reference | | Direct epic link (if no user story) |

### 6.3 Sub-components

**Attachments**
- File uploads with preview
- Each attachment can have comments

**Todo Checklist**
- Checklist items with completion toggle
- Progress indicator (X/Y complete)

**Feedback Checklist**
- Separate checklist for feedback items
- Can be populated by LLM summarization

**Chat**
- Threaded comments
- @mentions support
- Timestamp and author

**Assignees**
- Multiple users can be assigned
- Displayed as avatars

### 6.4 Compact View Elements
```
┌────────────────────────────────┐
│ [Color Bar]                    │
│ ┌──────────────────────────┐   │
│ │ [Feature Image Thumbnail]│   │
│ └──────────────────────────┘   │
│ Task Title                     │
│ ┌───┐ ┌───┐ ┌───┐              │
│ │ 5 │ │📎3│ │✓2/5│ 👤👤       │
│ └───┘ └───┘ └───┘              │
│ [SP]  [Att] [Todo] [Assignees] │
└────────────────────────────────┘
```

### 6.5 Story Point Values
Allowed values: 1, 2, 3, 5, 8, 13, 21
Display: Numeric badge

---

## 7. User Story Card Specification

### 7.1 Purpose
Groups related tasks into a feature. Managed by leads.

### 7.2 Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Title | String | ✓ | Story name |
| Description | Rich Text | | Story details, acceptance criteria |
| Linked Epic | Reference | | Parent epic |
| Flags | Array | | Status indicators |

### 7.3 Computed Fields (Read-only)

| Field | Calculation |
|-------|-------------|
| Completion % | (Completed Tasks / Total Tasks) × 100 |
| Total Story Points | Sum of connected task story points |
| Task Deadlines | Aggregated from connected tasks |

### 7.4 Flags

| Flag | Visual | Purpose |
|------|--------|---------|
| Complex | 🔶 | High complexity warning |
| High Risk | 🔴 | Risk indicator |
| Missing Docs | 📄 | Needs technical documentation |
| Blocked | 🚫 | Blocked by dependency |
| Needs Review | 👁️ | Requires attention |

### 7.5 Sub-components
- **Connected Tasks**: List with status (visual link to tasks)
- **Optional Todo Checklist**: For story-level items
- **Chat**: Discussion thread

### 7.6 Compact View Elements
```
┌────────────────────────────────┐
│ ═══════════════════════════════│ (Green accent)
│ User Story Title               │
│ ████████░░░░░ 65%              │
│ [Progress Bar]                 │
│ ┌───┐ ┌───┐                    │
│ │🔶 │ │📄 │     5 tasks • 21 SP│
│ └───┘ └───┘                    │
│ [Flags]       [Stats]          │
└────────────────────────────────┘
```

---

## 8. Epic Card Specification

### 8.1 Purpose
High-level initiative tracking for POs. Contains user stories.

### 8.2 Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Title | String | ✓ | Epic name |
| Description | Rich Text | | Epic overview |

### 8.3 Computed Fields (Read-only)

| Field | Calculation |
|-------|-------------|
| Story Count | Number of connected user stories |
| Overall Progress | Weighted average of user story completion |
| Total Story Points | Sum of all connected task story points |

### 8.4 Sub-components
- **Connected User Stories**: List with progress indicators
- **Optional Todo Checklist**: Epic-level items
- **Chat**: Discussion thread

### 8.5 Compact View Elements
```
┌────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ (Purple accent)
│ Epic Title                     │
│ ████████████░░░ 78%            │
│ [Overall Progress]             │
│ 3 stories • 8 tasks • 34 SP    │
└────────────────────────────────┘
```

---

## 9. Utility Card Specification

### 9.1 Purpose
Flexible card type for non-work items.

### 9.2 Subtypes

| Subtype | Icon | Fields |
|---------|------|--------|
| Link | 🔗 | URL, Title, Description |
| Note | 📝 | Title, Content (rich text) |
| Milestone | 🎯 | Title, Date, Description |
| Blocker | 🚫 | Title, Blocked Cards, Description |

### 9.3 Compact View
```
┌────────────────────────────────┐
│ [Icon] Utility Title           │
│ Brief description preview...   │
└────────────────────────────────┘
```

---

## 10. Card Connections

### 10.1 Connection Hierarchy
```
Epic
 └── User Story (many)
      └── Task (many)

Task can also link directly to Epic (bypass User Story)
```

### 10.2 Connection Rules

| From | To | Cardinality | Notes |
|------|----|-------------|-------|
| Task | User Story | Many-to-One | Optional |
| Task | Epic | Many-to-One | Optional (if no User Story) |
| User Story | Epic | Many-to-One | Optional |

### 10.3 Connection Behavior
- Creating connection updates both cards
- Removing connection updates computed fields
- Moving card to different board breaks connections (with warning)
- Deleting parent card unlinks children (does not delete)

---

## 11. Drag & Drop Mechanics

### 11.1 Card Operations

| Action | Trigger | Result |
|--------|---------|--------|
| Move within list | Drag vertical | Reorder position |
| Move to list | Drag horizontal | Change list, update position |
| Quick move | Right-click menu | Move to selected list |

### 11.2 List Operations

| Action | Trigger | Result |
|--------|---------|--------|
| Reorder lists | Drag horizontal | Update positions |

### 11.3 Keyboard Support
- `Arrow keys`: Navigate cards
- `Enter`: Open card modal
- `M`: Move card (opens list selector)
- `E`: Edit card title inline
- `C`: Add comment
- `Esc`: Close modal/cancel

---

## 12. LLM Integration

### 12.1 Configuration
- **Scope**: Per-board setting
- **Access**: Admin only
- **Provider**: Claude (Anthropic) default
- **API Key**: Stored encrypted in board settings

### 12.2 Features

| Feature | Input | Output |
|---------|-------|--------|
| Summarize Feedback | Card feedback comments | Bullet point summary |
| Extract Action Items | Card comments/feedback | Checklist items |
| Suggest Story Points | Task description | Recommended SP value |
| Generate Acceptance Criteria | User story title | Criteria list |

### 12.3 UI Indicators
- LLM features show sparkle icon (✨)
- Loading state during generation
- Edit option before applying suggestions

---

## 13. Notifications & Activity

### 13.1 Activity Log
- Per-board activity feed
- Per-card activity in modal
- Actions logged: create, move, edit, comment, assign, complete

### 13.2 Notification Triggers
- @mention in comment
- Assigned to card
- Card deadline approaching (24h, 1h)
- User story completed

---

## 14. Search & Filter

### 14.1 Search Scope
- Card titles
- Card descriptions
- Comments
- Checklist items

### 14.2 Filter Options
- By card type
- By assignee
- By label/color
- By due date range
- By completion status

---

## 15. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-26 | Claude | Initial document |

---

*Refer to this document when implementing card mechanics, user interactions, or business logic.*
