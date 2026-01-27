# GDD.md - Graphic Design Document

## 1. Design Philosophy

### 1.1 Core Principles
| Principle | Description |
|-----------|-------------|
| **Compact** | Minimize wasted space, prioritize information density |
| **Flat** | No unnecessary depth effects, shadows only for elevation |
| **Clean** | Remove visual clutter—no decorative borders, underlines |
| **User-friendly** | Clear hierarchy, intuitive interactions |

### 1.2 Anti-patterns to Avoid
- ❌ Heavy borders and dividers
- ❌ Excessive padding (>16px on cards)
- ❌ Drop shadows on non-elevated elements
- ❌ Decorative underlines
- ❌ Rounded corners >8px (except modals/cards)
- ❌ Gradient backgrounds (except subtle accents)
- ❌ Icon overuse

---

## 2. Color System

### 2.1 Base Palette

```css
/* Light Theme */
--background: #FAFAFA;
--surface: #FFFFFF;
--surface-raised: #FFFFFF;
--border: #E5E5E5;
--border-subtle: #F0F0F0;

/* Text */
--text-primary: #171717;
--text-secondary: #525252;
--text-tertiary: #A3A3A3;
--text-inverse: #FFFFFF;

/* Dark Theme */
--background-dark: #0A0A0A;
--surface-dark: #171717;
--surface-raised-dark: #262626;
--border-dark: #262626;
--text-primary-dark: #FAFAFA;
--text-secondary-dark: #A3A3A3;
```

### 2.2 Card Type Colors

| Type | Primary | Background | Border |
|------|---------|------------|--------|
| Task | #3B82F6 (Blue) | #EFF6FF | #BFDBFE |
| User Story | #22C55E (Green) | #F0FDF4 | #BBF7D0 |
| Epic | #A855F7 (Purple) | #FAF5FF | #E9D5FF |
| Utility | #6B7280 (Gray) | #F9FAFB | #E5E7EB |

### 2.3 Semantic Colors

| Purpose | Color | Usage |
|---------|-------|-------|
| Success | #22C55E | Completion, positive actions |
| Warning | #F59E0B | Deadlines, attention needed |
| Error | #EF4444 | Errors, blockers |
| Info | #3B82F6 | Information, links |

### 2.4 User-Selectable Card Colors
Palette for card color customization:
```
#EF4444  #F97316  #F59E0B  #84CC16  
#22C55E  #14B8A6  #06B6D4  #3B82F6  
#6366F1  #8B5CF6  #A855F7  #EC4899
```

---

## 3. Typography

### 3.1 Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 24px | 600 | 1.2 | Page titles |
| Heading | 18px | 600 | 1.3 | Section headers |
| Title | 14px | 600 | 1.4 | Card titles, list names |
| Body | 14px | 400 | 1.5 | General text |
| Caption | 12px | 400 | 1.4 | Meta info, timestamps |
| Tiny | 10px | 500 | 1.2 | Badges, counters |

### 3.3 Typography Rules
- **No underlines** except for links on hover
- **Bold for emphasis**, not color changes
- **Single font weight** per text block (no inline bold mixing)
- **Truncate** long titles with ellipsis, never wrap on cards

---

## 4. Spacing System

### 4.1 Base Unit
`4px` base unit. All spacing should be multiples of 4.

### 4.2 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline elements, icon gaps |
| sm | 8px | Card internal padding, tight groups |
| md | 12px | Component padding |
| lg | 16px | Section padding |
| xl | 24px | Page margins |
| 2xl | 32px | Large section gaps |

### 4.3 Card Padding
- **Compact cards**: 8px internal padding
- **Modal content**: 16px padding
- **List items**: 4px vertical gap

---

## 5. Component Specifications

### 5.1 Board Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] Board Name                    [View Toggle] [Settings] 👤│ ← Header (48px)
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│ │ List 1  │ │ List 2  │ │ List 3  │ │ + Add   │                 │
│ │─────────│ │─────────│ │─────────│ │  List   │                 │
│ │ Card    │ │ Card    │ │ Card    │ └─────────┘                 │
│ │ Card    │ │ Card    │ │         │                             │
│ │ Card    │ │         │ │         │                             │
│ │         │ │         │ │         │                             │
│ │ + Add   │ │ + Add   │ │ + Add   │                             │
│ └─────────┘ └─────────┘ └─────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 List Component
```
Width: 280px (fixed)
Background: var(--surface)
Border: none (use background contrast)
Border-radius: 8px
Padding: 8px

┌────────────────────────────┐
│ List Name          12 │ 34│ ← Header (cards | SP)
│────────────────────────────│ ← Subtle divider (1px)
│ ┌────────────────────────┐ │
│ │ Card                   │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Card                   │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ + Add card             │ │ ← Ghost button
│ └────────────────────────┘ │
└────────────────────────────┘
```

### 5.3 Card Compact View (Task)
```
Width: 100% (of list)
Background: var(--surface)
Border: 1px solid var(--border-subtle)
Border-radius: 6px
Padding: 8px
Left accent: 3px solid [card-type-color]

┌───────────────────────────┐
│▌[Optional Image Thumbnail]│ ← 100% width, 80px max height
│▌                          │
│▌Task Title (truncate...)  │ ← 14px/600
│▌┌───┬───┬─────┐           │
│▌│ 5 │📎2│ ✓3/5│  👤👤     │ ← Badges + Avatars
│▌└───┴───┴─────┘           │
└───────────────────────────┘
```

### 5.4 Card Compact View (User Story)
```
┌───────────────────────────┐
│▌User Story Title          │ ← 14px/600, green accent
│▌████████░░░░░░░ 65%       │ ← Progress bar (4px height)
│▌🔶 📄  •  5 tasks  •  21 SP│ ← Flags + Stats
└───────────────────────────┘
```

### 5.5 Card Compact View (Epic)
```
┌───────────────────────────┐
│▌Epic Title                │ ← 14px/600, purple accent
│▌████████████░░░░ 78%      │ ← Progress bar (4px height)
│▌3 stories • 8 tasks • 34 SP│ ← Aggregated stats
└───────────────────────────┘
```

### 5.6 Card Modal (Full View)
```
Width: 720px max
Background: var(--surface)
Border-radius: 12px
Padding: 0 (content handles internal)
Shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)

┌─────────────────────────────────────────────────┐
│ [Feature Image - full width if present]         │
├─────────────────────────────────────────────────┤
│ [Close X]                                       │
│                                                 │
│ Card Title                              [Type]  │
│ ─────────────────────────────────────────────   │
│                                                 │
│ ┌─────────────────────┐ ┌─────────────────────┐ │
│ │ Main Content        │ │ Sidebar             │ │
│ │                     │ │                     │ │
│ │ Description         │ │ Assignees           │ │
│ │ Checklists          │ │ Story Points        │ │
│ │ Attachments         │ │ Deadline            │ │
│ │ Comments            │ │ Links               │ │
│ │                     │ │ Actions             │ │
│ └─────────────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────┘

Content area: 480px | Sidebar: 200px
```

### 5.7 Badges
```
Background: var(--surface-raised)
Border-radius: 4px
Padding: 2px 6px
Font: 12px/500

Story Points: Blue background (#EFF6FF), blue text (#3B82F6)
Attachments: Gray background, icon + count
Checklist: Gray background, check icon + "X/Y"
```

### 5.8 Progress Bar
```
Height: 4px
Background: var(--border)
Border-radius: 2px
Fill: [card-type-color]
Fill-radius: 2px
```

### 5.9 Buttons

**Primary**
```
Background: #171717
Color: #FFFFFF
Border-radius: 6px
Padding: 8px 16px
Font: 14px/500
Hover: #262626
```

**Secondary**
```
Background: transparent
Color: #171717
Border: 1px solid var(--border)
Border-radius: 6px
Padding: 8px 16px
Hover: var(--surface)
```

**Ghost**
```
Background: transparent
Color: var(--text-secondary)
Padding: 8px 16px
Hover: var(--surface)
```

### 5.10 Avatars
```
Size: 24px (small), 32px (medium)
Border-radius: 50%
Border: 2px solid var(--surface) (for stacking)
Stack overlap: -8px
Max visible: 3 + "+N" badge
```

---

## 6. Interaction States

### 6.1 Hover States
- Cards: Subtle background shift (`rgba(0,0,0,0.02)`)
- Buttons: Color shift as specified
- Links: Underline appears

### 6.2 Active/Selected States
- Cards: `box-shadow: 0 0 0 2px var(--card-type-color)`
- Buttons: Slight scale (`transform: scale(0.98)`)

### 6.3 Drag States
- Card being dragged: Elevated shadow, slight rotation (2deg)
- Drop zone: Dashed border, highlight background
- Invalid drop: Red tint

### 6.4 Loading States
- Skeleton: Pulsing gray blocks matching content shape
- Spinner: 16px circular, card-type-color
- Progress: Linear bar at top of content area

---

## 7. Iconography

### 7.1 Icon Library
Use **Lucide React** icons exclusively.

### 7.2 Icon Sizes
| Size | Pixels | Usage |
|------|--------|-------|
| xs | 14px | Inline with text |
| sm | 16px | Badges, buttons |
| md | 20px | Standalone |
| lg | 24px | Headers |

### 7.3 Common Icons
| Purpose | Icon | Notes |
|---------|------|-------|
| Task | `CheckSquare` | |
| User Story | `BookOpen` | |
| Epic | `Layers` | |
| Utility | `FileText` | |
| Add | `Plus` | |
| Menu | `MoreHorizontal` | |
| Close | `X` | |
| Settings | `Settings` | |
| User | `User` | |
| Attachment | `Paperclip` | |
| Comment | `MessageSquare` | |
| Calendar | `Calendar` | |
| Flag | `Flag` | |
| Link | `Link` | |
| LLM/AI | `Sparkles` | |

---

## 8. Responsive Behavior

### 8.1 Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| Mobile | <640px | Single column, stacked lists |
| Tablet | 640-1024px | Horizontal scroll lists |
| Desktop | >1024px | Full board view |

### 8.2 Mobile Adaptations
- Lists become full-width swipeable tabs
- Cards expand to full width
- Modal becomes bottom sheet
- Header collapses to hamburger menu

---

## 9. Animation

### 9.1 Timing Functions
```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### 9.2 Durations
| Type | Duration |
|------|----------|
| Micro (hover, focus) | 100ms |
| Standard (open/close) | 200ms |
| Complex (modal, page) | 300ms |

### 9.3 Specific Animations
- **Modal open**: Scale 0.95 → 1, opacity 0 → 1, 200ms
- **Card drag**: Lift with shadow, rotate 2deg
- **List collapse**: Height transition, 200ms
- **Progress bar**: Width transition, 300ms

---

## 10. Dark Mode

### 10.1 Color Mappings
| Light | Dark |
|-------|------|
| #FAFAFA (bg) | #0A0A0A |
| #FFFFFF (surface) | #171717 |
| #E5E5E5 (border) | #262626 |
| #171717 (text) | #FAFAFA |

### 10.2 Card Type Colors (Dark)
Increase saturation by 10% for visibility.

---

## 11. Accessibility

### 11.1 Color Contrast
- Text on background: Minimum 4.5:1
- Large text (18px+): Minimum 3:1
- Interactive elements: Minimum 3:1

### 11.2 Focus Indicators
```css
:focus-visible {
  outline: 2px solid var(--text-primary);
  outline-offset: 2px;
}
```

### 11.3 Motion
- Respect `prefers-reduced-motion`
- Provide alternative static states

---

## 12. Component Reference

### 12.1 Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'card-task': '#3B82F6',
        'card-story': '#22C55E',
        'card-epic': '#A855F7',
        'card-utility': '#6B7280',
      },
      spacing: {
        'card': '8px',
        'list': '280px',
      },
      borderRadius: {
        'card': '6px',
        'list': '8px',
        'modal': '12px',
      },
    },
  },
}
```

---

## 13. Asset Requirements

### 13.1 Required Assets
- Logo (SVG, 32px height)
- Favicon (ICO, 32x32)
- OG Image (1200x630)
- Empty state illustrations

### 13.2 Image Guidelines
- Feature images: Max 1200px width, WebP format
- Avatars: 256x256 source, displayed at 24-32px
- Attachments: Generate thumbnails 200px width

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-26 | Claude | Initial document |

---

*Refer to this document when creating UI components, styling, or making visual decisions.*
