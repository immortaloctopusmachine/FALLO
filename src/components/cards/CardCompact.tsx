'use client';

import { memo } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Paperclip, MessageSquare, CheckSquare, BookOpen, Layers, FileText, AlertTriangle, FileQuestion, Zap, Ban, Eye, Link, StickyNote, Milestone, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Card, TaskCard, UserStoryCard, EpicCard, UtilityCard, UserStoryFlag, UtilitySubtype } from '@/types';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/lib/date-utils';

interface CardCompactProps {
  card: Card;
  onClick: () => void;
  sortable?: boolean;
  inlineAction?: React.ReactNode; // Optional action button to render inside the card
}


const cardTypeIcons = {
  TASK: CheckSquare,
  USER_STORY: BookOpen,
  EPIC: Layers,
  UTILITY: FileText,
};

export const CardCompact = memo(function CardCompact({ card, onClick, sortable = true, inlineAction }: CardCompactProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
    disabled: !sortable,
  });

  // Check if this is a card in Planning view (only TaskCards have the list property)
  const isInPlanningView = card.type === 'TASK' && (card as TaskCard).list?.viewType === 'PLANNING';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...(card.color && { backgroundColor: `${card.color}20` }), // 20 = ~12% opacity in hex
  };

  const Icon = cardTypeIcons[card.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(sortable ? attributes : {})}
      {...(sortable ? listeners : {})}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-md border border-border-subtle bg-surface transition-shadow hover:shadow-sm',
        isDragging && 'rotate-2 shadow-lg',
        // More compact padding for Planning view
        isInPlanningView ? 'p-1.5' : 'p-2'
      )}
    >
      {/* Feature Image */}
      {card.featureImage && (
        <div className={cn(
          "relative mb-2",
          isInPlanningView ? "-mx-1.5 -mt-1.5 h-16" : "-mx-2 -mt-2 h-20"
        )}>
          <Image
            src={card.featureImage}
            alt=""
            fill
            sizes="264px"
            className="rounded-t object-cover"
            style={{ objectPosition: `center ${card.featureImagePosition ?? 50}%` }}
          />
        </div>
      )}

      {/* Title */}
      <div className="flex items-start gap-2">
        <Icon className={cn(
          "shrink-0 text-text-tertiary",
          isInPlanningView ? "mt-0.5 h-3 w-3" : "mt-0.5 h-3.5 w-3.5"
        )} />
        <h4 className={cn(
          "line-clamp-2 flex-1 font-medium text-text-primary",
          isInPlanningView ? "text-caption" : "text-body"
        )}>
          {card.title}
        </h4>
      </div>

      {/* Type-specific content */}
      {card.type === 'TASK' && <TaskCardBadges card={card as TaskCard} inlineAction={inlineAction} />}
      {card.type === 'USER_STORY' && <UserStoryCardBadges card={card as UserStoryCard} />}
      {card.type === 'EPIC' && <EpicCardBadges card={card as EpicCard} />}
      {card.type === 'UTILITY' && <UtilityCardBadges card={card as UtilityCard} />}
    </div>
  );
}, (prev, next) => {
  // Custom comparator: skip onClick (always new closure) and compare card by reference
  return prev.card === next.card && prev.sortable === next.sortable && prev.inlineAction === next.inlineAction;
});

function TaskCardBadges({ card, inlineAction }: { card: TaskCard; inlineAction?: React.ReactNode }) {
  // Only show preview state for tasks in Planning lists
  const isInPlanningList = card.list?.viewType === 'PLANNING';
  const checklistTotal = card.checklists?.reduce((sum, cl) => sum + cl.items.length, 0) || 0;
  const checklistComplete = card.checklists?.reduce(
    (sum, cl) => sum + cl.items.filter((i) => i.isComplete).length,
    0
  ) || 0;
  const hasChecklist = checklistTotal > 0;
  const attachmentCount = card._count?.attachments || card.attachments?.length || 0;
  const commentCount = card._count?.comments || card.comments?.length || 0;
  const isStaged = card.taskData?.releaseMode === 'STAGED' && !card.taskData?.releasedAt;
  const scheduledReleaseDate = card.taskData?.scheduledReleaseDate
    ? new Date(card.taskData.scheduledReleaseDate)
    : null;
  const scheduledLabel = scheduledReleaseDate && !Number.isNaN(scheduledReleaseDate.getTime())
    ? formatShortDate(scheduledReleaseDate)
    : null;

  const showBadges =
    card.taskData?.storyPoints ||
    attachmentCount > 0 ||
    hasChecklist ||
    (card.assignees?.length ?? 0) > 0 ||
    isStaged ||
    inlineAction;

  if (!showBadges) return null;

  return (
    <div className={cn(
      "mt-1.5",
      isInPlanningList && "mt-1"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {card.taskData?.storyPoints && (
            <span className={cn(
              "rounded bg-card-task/10 font-medium text-card-task",
              isInPlanningList ? "px-1 py-0.5 text-tiny" : "px-1.5 py-0.5 text-tiny"
            )}>
              {card.taskData.storyPoints}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className={cn(
              "flex items-center gap-0.5 text-text-tertiary",
              isInPlanningList ? "text-tiny" : "text-caption"
            )}>
              <Paperclip className={cn(isInPlanningList ? "h-2.5 w-2.5" : "h-3 w-3")} />
              {attachmentCount}
            </span>
          )}
          {commentCount > 0 && (
            <span className={cn(
              "flex items-center gap-0.5 text-text-tertiary",
              isInPlanningList ? "text-tiny" : "text-caption"
            )}>
              <MessageSquare className={cn(isInPlanningList ? "h-2.5 w-2.5" : "h-3 w-3")} />
              {commentCount}
            </span>
          )}
          {hasChecklist && (
            <span className={cn(
              'flex items-center gap-0.5',
              checklistComplete === checklistTotal ? 'text-success' : 'text-text-tertiary',
              isInPlanningList ? "text-tiny" : "text-caption"
            )}>
              <CheckSquare className={cn(isInPlanningList ? "h-2.5 w-2.5" : "h-3 w-3")} />
              {checklistComplete}/{checklistTotal}
            </span>
          )}
          {isStaged && !inlineAction && (
            <span className={cn(
              "flex items-center gap-0.5 rounded bg-card-story/10 text-card-story",
              isInPlanningList ? "px-1 py-0.5 text-tiny" : "px-1.5 py-0.5 text-caption"
            )}>
              <Calendar className={cn(isInPlanningList ? "h-2.5 w-2.5" : "h-3 w-3")} />
              {scheduledLabel ? `Staged until ${scheduledLabel}` : 'Staged'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {card.assignees && card.assignees.length > 0 && (
            <div className={cn(
              "flex",
              isInPlanningList ? "-space-x-1" : "-space-x-1.5"
            )}>
              {card.assignees.slice(0, 3).map((assignee) => {
                // Only show preview state for cards in Planning lists
                const isPreview = isInPlanningList && !assignee.activatedAt;
                return (
                  <Avatar
                    key={assignee.id}
                    className={cn(
                      "border-2 border-surface",
                      isInPlanningList ? "h-4 w-4" : "h-5 w-5",
                      isPreview && "opacity-50"
                    )}
                    title={isPreview ? "Preview assignment (will activate when moved to Tasks)" : undefined}
                  >
                    <AvatarImage src={assignee.user.image || undefined} />
                    <AvatarFallback className={cn(isInPlanningList ? "text-[8px]" : "text-[10px]")}>
                      {assignee.user.name?.[0] || assignee.user.email[0]}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {card.assignees.length > 3 && (
                <div className={cn(
                  "flex items-center justify-center rounded-full border-2 border-surface bg-surface-raised text-text-tertiary",
                  isInPlanningList ? "h-4 w-4 text-[8px]" : "h-5 w-5 text-[10px]"
                )}>
                  +{card.assignees.length - 3}
                </div>
              )}
            </div>
          )}
          {/* Inline action button (e.g., Release now) */}
          {inlineAction && (
            <div onClick={(e) => e.stopPropagation()}>
              {inlineAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const flagConfig: Record<UserStoryFlag, { icon: typeof AlertTriangle; color: string; label: string }> = {
  COMPLEX: { icon: Zap, color: 'text-warning', label: 'Complex' },
  HIGH_RISK: { icon: AlertTriangle, color: 'text-error', label: 'High Risk' },
  MISSING_DOCS: { icon: FileQuestion, color: 'text-orange-500', label: 'Missing Docs' },
  BLOCKED: { icon: Ban, color: 'text-error', label: 'Blocked' },
  NEEDS_REVIEW: { icon: Eye, color: 'text-purple-500', label: 'Needs Review' },
};

function UserStoryCardBadges({ card }: { card: UserStoryCard }) {
  const progress = card.completionPercentage ?? 0;
  const flags = card.userStoryData?.flags || [];
  const taskCount = card.taskCount ?? card.connectedTasks?.length ?? 0;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map((flag) => {
            const config = flagConfig[flag];
            const FlagIcon = config.icon;
            return (
              <span
                key={flag}
                className={cn('flex items-center gap-0.5 text-tiny', config.color)}
                title={config.label}
              >
                <FlagIcon className="h-3 w-3" />
              </span>
            );
          })}
        </div>
      )}
      {/* Progress bar */}
      <div className="h-1 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-card-story transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-caption text-text-tertiary">
        <span>{progress}%</span>
        <div className="flex items-center gap-2">
          {taskCount > 0 && (
            <span className="flex items-center gap-0.5">
              <CheckSquare className="h-3 w-3" />
              {taskCount}
            </span>
          )}
          {card.totalStoryPoints ? <span>{card.totalStoryPoints} SP</span> : null}
        </div>
      </div>
    </div>
  );
}

function EpicCardBadges({ card }: { card: EpicCard }) {
  const progress = card.overallProgress ?? 0;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Progress bar */}
      <div className="h-1 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-card-epic transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-caption text-text-tertiary">
        <span>{progress}%</span>
        <span>
          {card.storyCount ?? 0} stories
          {card.totalStoryPoints ? ` • ${card.totalStoryPoints} SP` : ''}
        </span>
      </div>
    </div>
  );
}

const utilitySubtypeConfig: Record<UtilitySubtype, { icon: typeof Link; color: string; label: string }> = {
  LINK: { icon: Link, color: 'text-blue-500', label: 'Link' },
  NOTE: { icon: StickyNote, color: 'text-yellow-500', label: 'Note' },
  MILESTONE: { icon: Milestone, color: 'text-green-500', label: 'Milestone' },
  BLOCKER: { icon: Ban, color: 'text-error', label: 'Blocker' },
};

function UtilityCardBadges({ card }: { card: UtilityCard }) {
  const subtype = card.utilityData?.subtype;
  if (!subtype) return null;

  const config = utilitySubtypeConfig[subtype];
  const SubtypeIcon = config.icon;

  return (
    <div className="mt-2 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <SubtypeIcon className={cn('h-3 w-3', config.color)} />
        <span className={cn('text-tiny font-medium', config.color)}>
          {config.label}
        </span>
      </div>
      {subtype === 'MILESTONE' && card.utilityData?.date && (
        <div className="flex items-center gap-1 text-caption text-text-tertiary">
          <Calendar className="h-3 w-3" />
          <span>{formatShortDate(card.utilityData.date)}</span>
        </div>
      )}
      {subtype === 'BLOCKER' && card.utilityData?.blockedCardIds && (
        <span className="text-caption text-error">
          Blocking {card.utilityData.blockedCardIds.length} card{card.utilityData.blockedCardIds.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
