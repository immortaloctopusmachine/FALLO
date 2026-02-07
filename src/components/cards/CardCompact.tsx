'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Paperclip, MessageSquare, CheckSquare, BookOpen, Layers, FileText, AlertTriangle, FileQuestion, Zap, Ban, Eye, Link, StickyNote, Milestone, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Card, TaskCard, UserStoryCard, EpicCard, UtilityCard, UserStoryFlag, UtilitySubtype } from '@/types';
import { cn } from '@/lib/utils';

interface CardCompactProps {
  card: Card;
  onClick: () => void;
  sortable?: boolean;
}


const cardTypeIcons = {
  TASK: CheckSquare,
  USER_STORY: BookOpen,
  EPIC: Layers,
  UTILITY: FileText,
};

export function CardCompact({ card, onClick, sortable = true }: CardCompactProps) {
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
        'cursor-pointer rounded-md border border-border-subtle bg-surface p-2',
        'transition-shadow hover:shadow-sm',
        isDragging && 'rotate-2 shadow-lg'
      )}
    >
      {/* Feature Image */}
      {card.featureImage && (
        <div className="-mx-2 -mt-2 mb-2">
          <img
            src={card.featureImage}
            alt=""
            className="h-20 w-full rounded-t object-cover"
            style={{ objectPosition: `center ${card.featureImagePosition ?? 50}%` }}
          />
        </div>
      )}

      {/* Title */}
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        <h4 className="line-clamp-2 flex-1 text-body font-medium text-text-primary">
          {card.title}
        </h4>
      </div>

      {/* Type-specific content */}
      {card.type === 'TASK' && <TaskCardBadges card={card as TaskCard} />}
      {card.type === 'USER_STORY' && <UserStoryCardBadges card={card as UserStoryCard} />}
      {card.type === 'EPIC' && <EpicCardBadges card={card as EpicCard} />}
      {card.type === 'UTILITY' && <UtilityCardBadges card={card as UtilityCard} />}
    </div>
  );
}

function TaskCardBadges({ card }: { card: TaskCard }) {
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
    ? scheduledReleaseDate.toLocaleDateString()
    : null;

  const showBadges =
    card.taskData?.storyPoints ||
    attachmentCount > 0 ||
    hasChecklist ||
    (card.assignees?.length ?? 0) > 0 ||
    isStaged;

  if (!showBadges) return null;

  return (
    <div className="mt-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {card.taskData?.storyPoints && (
          <span className="rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
            {card.taskData.storyPoints}
          </span>
        )}
        {attachmentCount > 0 && (
          <span className="flex items-center gap-0.5 text-caption text-text-tertiary">
            <Paperclip className="h-3 w-3" />
            {attachmentCount}
          </span>
        )}
        {commentCount > 0 && (
          <span className="flex items-center gap-0.5 text-caption text-text-tertiary">
            <MessageSquare className="h-3 w-3" />
            {commentCount}
          </span>
        )}
        {hasChecklist && (
          <span className={cn(
            'flex items-center gap-0.5 text-caption',
            checklistComplete === checklistTotal ? 'text-success' : 'text-text-tertiary'
          )}>
            <CheckSquare className="h-3 w-3" />
            {checklistComplete}/{checklistTotal}
          </span>
        )}
        {isStaged && (
          <span className="flex items-center gap-0.5 rounded bg-card-story/10 px-1.5 py-0.5 text-caption text-card-story">
            <Calendar className="h-3 w-3" />
            {scheduledLabel ? `Staged until ${scheduledLabel}` : 'Staged'}
          </span>
        )}
      </div>
      {card.assignees && card.assignees.length > 0 && (
        <div className="flex -space-x-1.5">
          {card.assignees.slice(0, 3).map((assignee) => (
            <Avatar key={assignee.id} className="h-5 w-5 border-2 border-surface">
              <AvatarImage src={assignee.user.image || undefined} />
              <AvatarFallback className="text-[10px]">
                {assignee.user.name?.[0] || assignee.user.email[0]}
              </AvatarFallback>
            </Avatar>
          ))}
          {card.assignees.length > 3 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-surface-raised text-[10px] text-text-tertiary">
              +{card.assignees.length - 3}
            </div>
          )}
        </div>
      )}
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
  const taskCount = card.connectedTasks?.length ?? 0;

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
          <span>{new Date(card.utilityData.date).toLocaleDateString()}</span>
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
