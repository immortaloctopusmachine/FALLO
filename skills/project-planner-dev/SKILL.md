---
name: project-planner-dev
description: Development guidance for the Project Planner application - a Trello-inspired project management tool. Use when working on this codebase for: (1) Creating/editing React components, (2) Database schema changes, (3) API development, (4) UI implementation matching GDD specs, (5) Card type mechanics, (6) Understanding the Epic to UserStory to Task hierarchy.
---

# Project Planner Development Skill

This skill provides context and guidance for developing the Project Planner application.

## Quick Reference

### Document Hierarchy
1. `CLAUDE.md` - Project overview and dev workflow
2. `DOCUMENTS/_ROADMAP.md` - Current priorities and status
3. `DOCUMENTS/TDD.md` - Technical architecture, schema
4. `DOCUMENTS/ASD.md` - App mechanics and rules
5. `DOCUMENTS/GDD.md` - Visual design specifications
6. `DOCUMENTS/API.md` - API endpoint documentation

### Card Type Hierarchy
```
Epic (Purple) - for POs
  |
  +-- User Story (Green) - for Leads
       |
       +-- Task (Blue) - for Artists
           
Utility (Gray) - Miscellaneous (links, notes, milestones, blockers)
```

### Key Design Principles
- **Compact**: 8px card padding, no excess spacing
- **Flat**: No decorative borders, minimal shadows
- **Clean**: Typography-driven hierarchy, no clutter
- **Color-coded**: Card types distinguished by left accent bar (3px)

## Component Development

### Creating New Components
1. Check `GDD.md` for exact specifications (sizes, colors, spacing)
2. Use shadcn/ui as base, customize per GDD
3. Follow naming: `ComponentName.tsx` (PascalCase)
4. Props interface defined above component
5. Use Tailwind utilities, reference custom tokens in config

### Card Component Pattern
```tsx
// Example structure for card components
interface TaskCardProps {
  card: TaskCard;
  isCompact?: boolean;
  onOpen?: () => void;
}

export function TaskCard({ card, isCompact = true, onOpen }: TaskCardProps) {
  // Compact view by default, full view in modal
}
```

### Color Tokens
```
card-task: #3B82F6 (Blue)
card-story: #22C55E (Green)  
card-epic: #A855F7 (Purple)
card-utility: #6B7280 (Gray)
```

## Database Patterns

### Card Polymorphism
Cards use a single table with type discriminator + JSON fields:
- `type`: TASK | USER_STORY | EPIC | UTILITY
- `taskData`, `userStoryData`, `epicData`, `utilityData`: Type-specific JSON

### Computed Fields
User Stories and Epics have computed fields (not stored):
- completionPercentage: Calculate from child task states
- totalStoryPoints: Sum from connected tasks
- Fetch with aggregation queries, not stored values

## API Development

### Response Format
Always use the standard format:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "pagination": { ... } }
}
```

### Permission Checks
Every endpoint must validate:
1. Authentication (session or API key)
2. Board membership
3. Role-based permission (see ASD.md permission matrix)

## Common Tasks

### Adding a New Card Field
1. Update Prisma schema (or JSON type definition)
2. Update TypeScript types in `src/types/`
3. Update API endpoint handlers
4. Update card components (compact + modal)
5. Update ASD.md if behavior changes
6. Update _ROADMAP.md status

### Creating a New API Endpoint
1. Create route file in `src/app/api/`
2. Add Zod validation schema
3. Implement permission middleware
4. Add to API.md documentation
5. Add TypeScript types for request/response

### Implementing UI Component
1. Read GDD.md for specifications
2. Create component with shadcn/ui base
3. Apply Tailwind classes per GDD spacing/colors
4. Add hover/focus states
5. Test responsive behavior
6. Add keyboard accessibility

## Testing Checklist
- [ ] Component renders without errors
- [ ] Props are properly typed
- [ ] Follows GDD specifications
- [ ] Responsive at all breakpoints
- [ ] Keyboard navigable
- [ ] Permission checks work
- [ ] API validation rejects bad input

## References
For detailed information, see:
- `references/component-patterns.md` - React patterns for this project
- `references/api-patterns.md` - API development patterns
