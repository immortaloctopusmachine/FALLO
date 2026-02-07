# Component Patterns Reference

## File Organization

```
src/components/
  ui/                    # shadcn/ui base components
  cards/
    TaskCard.tsx         # Task card compact + logic
    TaskCardModal.tsx    # Task card full view modal
    UserStoryCard.tsx
    UserStoryCardModal.tsx
    EpicCard.tsx
    EpicCardModal.tsx
    UtilityCard.tsx
    CardBadge.tsx        # Shared badge component
    CardProgress.tsx     # Shared progress bar
  boards/
    Board.tsx            # Main board layout
    List.tsx             # List container
    ListHeader.tsx       # List header with counts
    AddCard.tsx          # Add card form
    AddList.tsx          # Add list form
  shared/
    Avatar.tsx
    AvatarStack.tsx
    Modal.tsx
    Dropdown.tsx
```

## Component Template

```tsx
// src/components/cards/TaskCard.tsx
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { TaskCardType } from '@/types/cards';

interface TaskCardProps {
  card: TaskCardType;
  isDragging?: boolean;
  onClick?: () => void;
}

export const TaskCard = memo(function TaskCard({ 
  card, 
  isDragging = false,
  onClick 
}: TaskCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border-subtle rounded-card p-card',
        'border-l-[3px] border-l-card-task',
        'cursor-pointer hover:bg-surface-hover',
        'transition-colors duration-100',
        isDragging && 'shadow-lg rotate-2'
      )}
      onClick={onClick}
    >
      {/* Feature image */}
      {card.featureImage && (
        <img 
          src={card.featureImage} 
          alt="" 
          className="w-full h-20 object-cover rounded mb-2"
        />
      )}
      
      {/* Title */}
      <h3 className="text-title font-semibold text-text-primary truncate">
        {card.title}
      </h3>
      
      {/* Badges row */}
      <div className="flex items-center gap-1 mt-2">
        {card.taskData?.storyPoints && (
          <CardBadge type="storyPoints" value={card.taskData.storyPoints} />
        )}
        {card.attachments.length > 0 && (
          <CardBadge type="attachments" value={card.attachments.length} />
        )}
        {/* ... more badges */}
        
        {/* Assignees pushed to right */}
        <div className="ml-auto">
          <AvatarStack users={card.assignees} max={3} />
        </div>
      </div>
    </div>
  );
});
```

## Modal Pattern

```tsx
// src/components/cards/TaskCardModal.tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface TaskCardModalProps {
  card: TaskCardType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskCardModal({ card, open, onOpenChange }: TaskCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] p-0">
        {/* Feature image header */}
        {card.featureImage && (
          <div className="w-full h-48 overflow-hidden rounded-t-modal">
            <img src={card.featureImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="flex gap-4 p-4">
          {/* Main content (480px) */}
          <div className="flex-1 min-w-0">
            <h2 className="text-heading font-semibold">{card.title}</h2>
            
            {/* Description */}
            <section className="mt-4">
              <h3 className="text-caption text-text-secondary uppercase tracking-wide mb-2">
                Description
              </h3>
              <div className="prose prose-sm">
                {card.description || 'No description'}
              </div>
            </section>
            
            {/* Checklists */}
            {/* Attachments */}
            {/* Comments */}
          </div>
          
          {/* Sidebar (200px) */}
          <div className="w-[200px] shrink-0">
            {/* Assignees */}
            {/* Story Points */}
            {/* Deadline */}
            {/* Links */}
            {/* Actions */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Drag and Drop Pattern

```tsx
// Using dnd-kit
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function DraggableCard({ card, ...props }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard card={card} isDragging={isDragging} {...props} />
    </div>
  );
}
```

## Hook Patterns

```tsx
// src/hooks/useCard.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useCard(cardId: string) {
  return useQuery({
    queryKey: ['cards', cardId],
    queryFn: () => fetchCard(cardId),
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: Partial<Card> }) =>
      updateCard(cardId, data),
    onSuccess: (_, { cardId }) => {
      queryClient.invalidateQueries({ queryKey: ['cards', cardId] });
    },
  });
}
```

## Form Pattern

```tsx
// Using react-hook-form + zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const cardSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  storyPoints: z.number().optional(),
});

type CardFormData = z.infer<typeof cardSchema>;

export function CardForm({ onSubmit }: { onSubmit: (data: CardFormData) => void }) {
  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```
