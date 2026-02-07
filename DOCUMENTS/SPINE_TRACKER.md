# SPINE_TRACKER.md - Spine Tracker Feature Documentation

## 1. Overview

### 1.1 Purpose
The **Spine Tracker** is an integrated tool within Fallo for managing Spine 4.2 skeleton assets across game projects. Each board has its own Spine Tracker instance, accessible as a third view tab alongside "Tasks" and "Planning".

### 1.2 Core Capabilities
- Track skeletons, animations, skins, events, and sound effects
- Organize skeletons into groups with z-order layering
- Define parent-child skeleton relationships and bone placements
- Change tracking with baseline snapshots and changelog generation
- Export documentation as Markdown or JSON
- Import data from standalone Spine Tracker exports
- Multi-user sync with optimistic concurrency control

### 1.3 Related Documents
- `TDD.md` - Database schema (`SpineTrackerData` model)
- `API.md` - REST API endpoints for Spine Tracker
- `GDD.md` - UI styling guidelines

---

## 2. Architecture

### 2.1 Component Tree
```
BoardViewWrapper
  └── SpineTrackerView (boardId)
        ├── SpineTrackerHeader
        │     └── Import/Export/Baseline/Save controls
        ├── SkeletonNavigator (left sidebar)
        │     ├── Search bar
        │     └── Group folders → Skeleton items
        ├── SkeletonEditor (center panel)
        │     ├── Name/Status/Group/Z-Order fields
        │     ├── SkeletonPlacement (parent + bone)
        │     ├── AnimationTable
        │     │     └── SoundFxRow (per animation)
        │     ├── SkinsEventsPanel
        │     └── General Notes
        └── ReferencePanel (right sidebar)
              ├── ChangelogPanel
              ├── Hierarchy tree
              └── Z-Order reference
```

### 2.2 Data Flow
```
User edits → useSpineTracker hook → setState → scheduleSave (1.5s debounce)
                                                     │
                                                     ▼
                                          PUT /api/.../spine-tracker
                                                     │
                                          ┌──────────┴──────────┐
                                          │                     │
                                       200 OK              409 Conflict
                                    (version++)          (show dialog)
```

### 2.3 Storage Model
Data is stored as a single JSON document in the `SpineTrackerData` table:

```prisma
model SpineTrackerData {
  id        String   @id @default(cuid())
  data      Json     @default("{}")    // SpineTrackerState
  version   Int      @default(1)       // Optimistic concurrency
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  boardId   String   @unique
  board     Board    @relation(...)
}
```

This approach was chosen over a fully relational schema because:
- Skeleton data is highly nested (skeletons → animations → soundFx)
- The entire state is loaded/saved atomically
- No cross-skeleton queries are needed
- Simpler migration path from the standalone localStorage-based tool

---

## 3. Data Model

### 3.1 SpineTrackerState (Root)
```typescript
interface SpineTrackerState {
  skeletons: Skeleton[];
  customGroups: Record<string, string>;
  groupOrder: string[];
  projectName: string;
  baseline: { skeletons: Skeleton[] } | null;
}
```

### 3.2 Skeleton
```typescript
interface Skeleton {
  id: string;
  name: string;              // UPPER_SNAKE_CASE
  status: SkeletonStatus;    // planned | in_progress | exported | implemented
  zOrder: number;            // 0-999
  group: string;             // symbols | ui | characters | effects | screens | layout | other
  description: string;
  placement: SkeletonPlacement;
  animations: Animation[];
  skins: Skin[];
  events: SpineEvent[];
  generalNotes: string;
  isLayoutTemplate?: boolean;
}
```

### 3.3 Animation
```typescript
interface Animation {
  name: string;              // lower_snake_case
  status: AnimationStatus;   // planned | in_progress | exported | implemented | not_as_intended
  track: number;             // 0-9
  notes: string;
  soundFx: SoundFx[];
}
```

### 3.4 SoundFx
```typescript
interface SoundFx {
  file: string;              // Audio filename
  trigger: SoundFxTrigger;   // spine_event | code_trigger | timeline
  volume: number;            // 0.0 - 1.0
  notes: string;
}
```

### 3.5 Other Types
```typescript
interface Skin {
  name: string;
  status: AnimationStatus;
  notes: string;
}

interface SpineEvent {
  name: string;
  animation: string;
  notes: string;
}

interface SkeletonPlacement {
  parent: string | null;     // Parent skeleton name or null for standalone
  bone: string | null;       // Target bone in parent
  notes: string;
}
```

---

## 4. File Structure

```
src/
├── types/
│   └── spine-tracker.ts           # All TypeScript interfaces
├── hooks/
│   └── useSpineTracker.ts         # State management + API sync hook
├── components/
│   └── spine-tracker/
│       ├── index.ts               # Barrel export (SpineTrackerView)
│       ├── constants.ts           # Groups, bones, z-order, statuses
│       ├── utils.ts               # Auto-categorize, changelog, export formatters
│       ├── SpineTrackerView.tsx   # Main 3-column layout container
│       ├── SpineTrackerHeader.tsx # Toolbar (save status, baseline, export, import)
│       ├── SkeletonNavigator.tsx  # Left sidebar (search, groups, skeleton list)
│       ├── SkeletonEditor.tsx     # Center panel (edit/view skeleton details)
│       ├── SkeletonPlacement.tsx  # Placement sub-section (parent, bone)
│       ├── AnimationTable.tsx     # Animations table with CRUD
│       ├── SoundFxRow.tsx         # Sound FX sub-rows within animations
│       ├── SkinsEventsPanel.tsx   # Skins and events side-by-side
│       ├── ReferencePanel.tsx     # Right sidebar (hierarchy, z-order)
│       └── ChangelogPanel.tsx     # Latest changes display
└── app/
    └── api/
        └── boards/
            └── [boardId]/
                └── spine-tracker/
                    ├── route.ts       # GET + PUT (fetch/save)
                    ├── import/
                    │   └── route.ts   # POST (import JSON)
                    └── export/
                        └── route.ts   # GET (?format=json|markdown|changelog)
```

---

## 5. Skeleton Groups

| Group ID | Label | Auto-categorize Pattern |
|----------|-------|------------------------|
| `symbols` | Symbols | `ALIEN_*`, `ITEM_*`, `WEAPON_DROP`, `PARTICLE_BLOOD*` |
| `ui` | UI Elements | `GUI_*`, `*BUTTON*`, `MENU*`, `HUD*`, `SPIN_*`, `SLIDER*`, `TOGGLE*` |
| `characters` | Characters | `PLAYER*`, `WEAPON_*`, `MOTHERSHIP*`, `MUZZLE*` |
| `effects` | Effects | `PARTICLE_*`, `*EFFECT*`, `WIN*`, `*FLASH*`, `SHIELD*` |
| `screens` | Screens | `*SCREEN*`, `LOADING*`, `START*`, `END*`, `FEATURE*` |
| `layout` | Layout | `LAYOUT*`, `BACKGROUND*` |
| `other` | Other | Default fallback |

---

## 6. Z-Order Layer System

| Range | Layer | Examples |
|-------|-------|----------|
| 0-99 | Background | LAYOUT_TEMPLATE, backgrounds |
| 100-199 | Reels & Symbols | Reel frame, symbols |
| 200-299 | Characters | Main character, aliens |
| 300-399 | UI - Bottom | HUD bottom, bet controls |
| 400-499 | UI - Top | HUD top, balance display |
| 500-599 | Overlays | Win displays, multipliers |
| 600-699 | Effects | Particles, celebrations |
| 700-799 | Popups | Menus, dialogs |
| 800-899 | Transitions | Screen wipes, fades |
| 900-999 | System | Loading, critical alerts |

---

## 7. Status Workflow

```
planned → in_progress → exported → implemented
                  │
                  └──→ not_as_intended (animations/skins only)
```

| Status | Meaning | Badge Color |
|--------|---------|-------------|
| `planned` | Not yet created in Spine | Gray |
| `in_progress` | Currently being worked on | Amber |
| `exported` | Exported from Spine | Blue |
| `implemented` | Integrated into game code | Green |
| `not_as_intended` | Needs revision | Red |

---

## 8. LAYOUT_TEMPLATE Bones

Standard attachment bones available when parent is `LAYOUT_TEMPLATE`:

| Bone | Purpose |
|------|---------|
| `BACKGROUND_CHARACTER` | Background character placement |
| `CLICK_ANYWHERE` | Transition screen button |
| `CLICK_ANYWHERE_STARTSCREEN` | Start screen button placement |
| `FEATURE_BUY_BUTTON` | Buy feature button |
| `FREE_SPINS_MULTIPLIER` | Free spins multiplier display |
| `FREE_SPINS_REMAINING_SPINS` | Spins remaining counter |
| `FREE_SPINS_TOTAL_WIN` | Accumulated win display |
| `GAME_LOGO` | Logo in base game |
| `GAME_LOGO_FREESPINS` | Logo in free spins mode |
| `GAME_LOGO_TEXT` | Text version of logo |
| `HUD_BOTTOM` | Bottom HUD area |
| `HUD_TOP` | Top HUD area |
| `MENU_BUTTON` | Menu button placement |
| `MENU_LOGO` | Logo in menu popup |
| `PARTICLE_COIN_EMITTER` | Big win coin particles |
| `PARTICLE_COIN_EMITTER_LOW_WIN` | Small/medium win particles |
| `REEL` | Reel background & frame |
| `SPIN_BUTTON` | Main spin button |
| `SPIN_BUTTON/AUTOPLAY_BUTTON` | Autoplay button |
| `SPIN_BUTTON/BET_BUTTON` | Bet button |
| `SPIN_BUTTON/QUICK_PLAY_BUTTON` | Quick play button |
| `WIN_POSITION` | Win animation placement |

---

## 9. Multi-User Sync

### 9.1 Save Flow
1. User makes an edit in the UI
2. `useSpineTracker` updates local state immediately (optimistic)
3. A 1.5-second debounce timer starts/resets
4. After debounce: `PUT /api/boards/:boardId/spine-tracker` with current `version`
5. Server checks version matches database → increments version → returns new version
6. Client updates its version number

### 9.2 Conflict Handling
If another user saved between our last fetch and our save:
1. Server returns `409 Conflict` with `currentVersion`
2. Save status changes to `"conflict"`
3. Alert dialog offers two options:
   - **Reload Their Version** — Fetches latest from server, discards local changes
   - **Overwrite with Mine** — Fetches current version, then saves with it

### 9.3 Save Status Indicator
| Status | Display | Meaning |
|--------|---------|---------|
| `saved` | Green "Saved" | Data matches server |
| `saving` | Amber "Saving..." | PUT request in flight |
| `unsaved` | Amber "Unsaved" | Local changes pending debounce |
| `conflict` | Red "Conflict" | Version mismatch detected |
| `loading` | Gray "Loading..." | Initial data fetch |

---

## 10. Import & Export

### 10.1 Import from Standalone Spine Tracker
The standalone Spine Tracker (in `tools/spine-tracker/`) stores data in localStorage and can export as JSON. The import endpoint accepts both:
- **Full format**: `{ skeletons: [...], projectName: "...", groupOrder: [...], ... }`
- **Standalone format**: `{ skeletons: [...] }` (auto-wraps with defaults)

### 10.2 Export Formats
| Format | Filename | Use Case |
|--------|----------|----------|
| JSON | `spine-tracker.json` | Full backup, sharing, migration |
| Markdown | `SPINE_TRACKER.md` | Documentation, version control |
| Changelog | `spine-changes.md` | Commit messages, progress tracking |

---

## 11. Integration Points

### 11.1 Board View Tab
The Spine Tracker is accessed via the "Spine" tab in `BoardHeader`. The `BoardViewMode` type includes `'spine'` alongside `'tasks'` and `'planning'`.

### 11.2 Future Integration Ideas
- Link skeletons to Task cards (skeleton implementation tracking)
- Auto-create tasks from planned skeletons
- Display skeleton status counts in board overview
- Real-time collaboration via Supabase Realtime
- Skeleton preview images (from Spine exports)

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | Claude | Initial document — Spine Tracker integrated into Fallo |

---

*Refer to this document when working on the Spine Tracker feature, its API, or components.*
