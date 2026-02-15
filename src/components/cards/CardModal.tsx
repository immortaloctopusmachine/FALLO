'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { CheckSquare, BookOpen, Layers, FileText, Trash2, X, Paperclip, ChevronUp, ChevronDown, ChevronRight, ListChecks, AlignLeft, AlertTriangle, Zap, FileQuestion, Ban, Eye, Link2, Link, StickyNote, Milestone, Calendar, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SimpleChecklist } from './SimpleChecklist';
import { CommentsSection } from './CommentsSection';
import { AssigneePicker } from './AssigneePicker';
import { DeadlinePicker } from './DeadlinePicker';
import { ColorPicker } from './ColorPicker';
import { AttachmentSection } from './AttachmentSection';
import { ConnectionPicker } from './ConnectionPicker';
import { TimeLogSection } from './TimeLogSection';
import { CreateLinkedTasksModal } from './CreateLinkedTasksModal';
import { CardQualityPanel } from './QualityReviewPanel';
import { toast } from 'sonner';
import type { Card, TaskCard, UserStoryCard, EpicCard, UtilityCard, Checklist, CardAssignee, BoardMember, UserStoryFlag, UtilitySubtype, List, Attachment, TaskReleaseMode } from '@/types';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import { buildDependencyChain, type ChainLink } from '@/lib/task-presets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CardModalProps {
  card: Card | null;
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onLinkedCardCreated?: (card: Card) => void;
  onCardClick?: (card: Card) => void;  // Open another card (e.g., a connected task)
  currentUserId?: string;
  isAdmin?: boolean;  // Whether current user is admin (for time log management)
  canViewQualitySummaries?: boolean;  // PO, Lead, Head of Art — can see Details/Quality tabs
  taskLists?: List[];  // Lists for TASKS view - used when creating linked tasks
  planningLists?: List[];  // Lists for PLANNING view - used when creating linked user stories
  allCards?: Card[];
}

const cardTypeConfig = {
  TASK: { label: 'Task', icon: CheckSquare, color: 'text-card-task', bg: 'bg-card-task/10' },
  USER_STORY: { label: 'User Story', icon: BookOpen, color: 'text-card-story', bg: 'bg-card-story/10' },
  EPIC: { label: 'Epic', icon: Layers, color: 'text-card-epic', bg: 'bg-card-epic/10' },
  UTILITY: { label: 'Utility', icon: FileText, color: 'text-card-utility', bg: 'bg-card-utility/10' },
};

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

// Cold-to-warm color mapping for story point buttons
const SP_COLORS: Record<number, { bg: string; bgSelected: string; text: string; border: string }> = {
  1:  { bg: 'bg-blue-50 dark:bg-blue-950/30',   bgSelected: 'bg-blue-500',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-200 dark:border-blue-800' },
  2:  { bg: 'bg-cyan-50 dark:bg-cyan-950/30',    bgSelected: 'bg-cyan-500',   text: 'text-cyan-700 dark:text-cyan-300',   border: 'border-cyan-200 dark:border-cyan-800' },
  3:  { bg: 'bg-green-50 dark:bg-green-950/30',   bgSelected: 'bg-green-500',  text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  5:  { bg: 'bg-yellow-50 dark:bg-yellow-950/30', bgSelected: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  8:  { bg: 'bg-orange-50 dark:bg-orange-950/30', bgSelected: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  13: { bg: 'bg-red-50 dark:bg-red-950/30',       bgSelected: 'bg-red-500',    text: 'text-red-700 dark:text-red-300',     border: 'border-red-200 dark:border-red-800' },
  21: { bg: 'bg-rose-50 dark:bg-rose-950/30',     bgSelected: 'bg-rose-600',   text: 'text-rose-700 dark:text-rose-300',   border: 'border-rose-200 dark:border-rose-800' },
};

const USER_STORY_FLAGS: { value: UserStoryFlag; label: string; icon: typeof AlertTriangle; color: string }[] = [
  { value: 'COMPLEX', label: 'Complex', icon: Zap, color: 'text-warning bg-warning/10 border-warning/30' },
  { value: 'HIGH_RISK', label: 'High Risk', icon: AlertTriangle, color: 'text-error bg-error/10 border-error/30' },
  { value: 'MISSING_DOCS', label: 'Missing Docs', icon: FileQuestion, color: 'text-orange-500 bg-orange-500/10 border-orange-500/30' },
  { value: 'BLOCKED', label: 'Blocked', icon: Ban, color: 'text-error bg-error/10 border-error/30' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review', icon: Eye, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
];

const UTILITY_SUBTYPES: { value: UtilitySubtype; label: string; icon: typeof Link; color: string }[] = [
  { value: 'LINK', label: 'Link', icon: Link, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { value: 'NOTE', label: 'Note', icon: StickyNote, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  { value: 'MILESTONE', label: 'Milestone', icon: Milestone, color: 'text-green-500 bg-green-500/10 border-green-500/30' },
  { value: 'BLOCKER', label: 'Blocker', icon: Ban, color: 'text-error bg-error/10 border-error/30' },
];

export function CardModal({
  card,
  boardId,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onLinkedCardCreated,
  onCardClick,
  currentUserId,
  isAdmin = false,
  canViewQualitySummaries = false,
  taskLists = [],
  planningLists = [],
  allCards = [],
}: CardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [featureImage, setFeatureImage] = useState<string | null>(null);
  const [featureImagePosition, setFeatureImagePosition] = useState(50);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [assignees, setAssignees] = useState<CardAssignee[]>([]);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [highlightedAttachmentId, setHighlightedAttachmentId] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(true);
  const [todoExpanded, setTodoExpanded] = useState(true);
  const [feedbackExpanded, setFeedbackExpanded] = useState(true);
  const [flags, setFlags] = useState<UserStoryFlag[]>([]);
  const [connectedTasks, setConnectedTasks] = useState<TaskCard[]>([]);
  const [connectedUserStories, setConnectedUserStories] = useState<UserStoryCard[]>([]);
  const [utilitySubtype, setUtilitySubtype] = useState<UtilitySubtype>('NOTE');
  const [utilityUrl, setUtilityUrl] = useState('');
  const [utilityContent, setUtilityContent] = useState('');
  const [utilityDate, setUtilityDate] = useState<string | null>(null);
  const [linkedUserStoryId, setLinkedUserStoryId] = useState<string | null>(null);
  const [linkedEpicId, setLinkedEpicId] = useState<string | null>(null);
  const [linkedUserStory, setLinkedUserStory] = useState<UserStoryCard | null>(null);
  const [linkedEpic, setLinkedEpic] = useState<EpicCard | null>(null);
  const [isCreatingLinkedCard, setIsCreatingLinkedCard] = useState(false);
  const [isCreateLinkedTasksOpen, setIsCreateLinkedTasksOpen] = useState(false);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [newLinkedCardTitle, setNewLinkedCardTitle] = useState('');
  const [newLinkedCardListId, setNewLinkedCardListId] = useState<string>('');
  const [newLinkedTaskDestination, setNewLinkedTaskDestination] = useState<TaskReleaseMode>('IMMEDIATE');
  const [newLinkedStagingPlanningListId, setNewLinkedStagingPlanningListId] = useState<string>('');
  const [newLinkedReleaseTargetListId, setNewLinkedReleaseTargetListId] = useState<string>('');
  const [isCreatingLinkedCardLoading, setIsCreatingLinkedCardLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activePanelTab, setActivePanelTab] = useState<'details' | 'quality'>('details');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Reset form when card changes
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setColor(card.color);
      setFeatureImage(card.featureImage);
      setFeatureImagePosition(card.featureImagePosition ?? 50);

      if (card.type === 'TASK') {
        const taskCard = card as TaskCard;
        setStoryPoints(taskCard.taskData?.storyPoints ?? null);
        setDeadline(taskCard.taskData?.deadline ?? null);
        setLinkedUserStoryId(taskCard.taskData?.linkedUserStoryId ?? null);
        setLinkedEpicId(taskCard.taskData?.linkedEpicId ?? null);
        setChecklists(taskCard.checklists || []);
        setAssignees(taskCard.assignees || []);
        setFlags([]);
        setConnectedTasks([]);
      } else if (card.type === 'USER_STORY') {
        const userStoryCard = card as UserStoryCard;
        setFlags(userStoryCard.userStoryData?.flags || []);
        setConnectedTasks(userStoryCard.connectedTasks || []);
        setLinkedEpicId(userStoryCard.userStoryData?.linkedEpicId ?? null);
        setLinkedUserStoryId(null);
        setConnectedUserStories([]);
        setStoryPoints(null);
        setDeadline(null);
        setChecklists([]);
        setAssignees([]);
      } else if (card.type === 'EPIC') {
        const epicCard = card as EpicCard;
        setConnectedUserStories(epicCard.connectedUserStories || []);
        setFlags([]);
        setConnectedTasks([]);
        setStoryPoints(null);
        setDeadline(null);
        setChecklists([]);
        setAssignees([]);
      } else if (card.type === 'UTILITY') {
        const utilityCard = card as UtilityCard;
        setUtilitySubtype(utilityCard.utilityData?.subtype || 'NOTE');
        setUtilityUrl(utilityCard.utilityData?.url || '');
        setUtilityContent(utilityCard.utilityData?.content || '');
        setUtilityDate(utilityCard.utilityData?.date || null);
        setStoryPoints(null);
        setDeadline(null);
        setChecklists([]);
        setAssignees([]);
        setFlags([]);
        setConnectedTasks([]);
        setConnectedUserStories([]);
      } else {
        setStoryPoints(null);
        setDeadline(null);
        setChecklists([]);
        setAssignees([]);
        setFlags([]);
        setConnectedTasks([]);
        setConnectedUserStories([]);
        setUtilitySubtype('NOTE');
        setUtilityUrl('');
        setUtilityContent('');
        setUtilityDate(null);
      }
    }
  }, [card]);

  // Resolve linked user story/epic data from in-memory board cards
  useEffect(() => {
    if (card?.type === 'TASK' && linkedUserStoryId) {
      const story = allCards.find((c) => c.id === linkedUserStoryId && c.type === 'USER_STORY') as UserStoryCard | undefined;
      setLinkedUserStory(story || null);
      const storyEpicId = story?.userStoryData?.linkedEpicId ?? null;
      setLinkedEpicId(storyEpicId);
      if (storyEpicId) {
        const epic = allCards.find((c) => c.id === storyEpicId && c.type === 'EPIC') as EpicCard | undefined;
        setLinkedEpic(epic || null);
      } else {
        setLinkedEpic(null);
      }
    } else if (card?.type === 'TASK' && !linkedUserStoryId) {
      setLinkedUserStory(null);
      setLinkedEpicId(null);
      setLinkedEpic(null);
    }
  }, [allCards, card?.type, linkedUserStoryId]);

  // Resolve linked epic for user stories from in-memory board cards
  useEffect(() => {
    if (card?.type === 'USER_STORY' && linkedEpicId) {
      const epic = allCards.find((c) => c.id === linkedEpicId && c.type === 'EPIC') as EpicCard | undefined;
      setLinkedEpic(epic || null);
    } else if (card?.type === 'USER_STORY' && !linkedEpicId) {
      setLinkedEpic(null);
    }
  }, [allCards, card?.type, linkedEpicId]);

  // Core save function - used by auto-save
  const performSave = useCallback(async () => {
    if (!card || !title.trim()) return;

    setAutoSaveStatus('saving');

    try {
      const updates: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        color,
        featureImage,
        featureImagePosition,
      };

      if (card.type === 'TASK') {
        updates.taskData = {
          ...(card.taskData as object || {}),
          storyPoints,
          deadline,
          linkedUserStoryId,
          // Epic is inherited from User Story, not stored directly on Task
        };
      } else if (card.type === 'USER_STORY') {
        updates.userStoryData = {
          ...((card as UserStoryCard).userStoryData as object || {}),
          flags,
          linkedEpicId,
        };
      } else if (card.type === 'UTILITY') {
        updates.utilityData = {
          subtype: utilitySubtype,
          url: utilityUrl || undefined,
          content: utilityContent || undefined,
          date: utilityDate || undefined,
        };
      }

      const response = await fetch(`/api/boards/${boardId}/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      if (data.success) {
        // Merge updated card with local state for checklists and assignees
        const updatedCard = {
          ...data.data,
          checklists,
          assignees,
        };
        onUpdate(updatedCard);

        setAutoSaveStatus('saved');
        // Reset status after a short delay
        setTimeout(() => setAutoSaveStatus('idle'), 2000);

      } else {
        setAutoSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save card:', error);
      setAutoSaveStatus('error');
      toast.error('Failed to save changes');
    }
  }, [card, title, description, color, featureImage, featureImagePosition, storyPoints, deadline, linkedUserStoryId, flags, linkedEpicId, utilitySubtype, utilityUrl, utilityContent, utilityDate, boardId, checklists, assignees, onUpdate]);

  // Auto-save effect - debounced save when fields change
  useEffect(() => {
    // Skip auto-save during initial load or if no card
    if (isInitialLoadRef.current || !card) {
      return;
    }

    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Schedule auto-save after 1.5 seconds of inactivity
    autoSaveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 1500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [title, description, color, featureImage, featureImagePosition, storyPoints, deadline, linkedUserStoryId, flags, linkedEpicId, utilitySubtype, utilityUrl, utilityContent, utilityDate, performSave, card]);

  // Mark initial load as complete after card data is set
  useEffect(() => {
    if (card) {
      // Small delay to ensure all state updates from card prop have settled
      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [card]);

  // Reset initial load flag when card changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    setAutoSaveStatus('idle');
    setActivePanelTab('details');
  }, [card?.id]);

  const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);

  // Fetch board members and tags for the linked tasks modal
  useEffect(() => {
    if (isCreateLinkedTasksOpen) {
      if (boardMembers.length === 0) {
        fetch(`/api/boards/${boardId}/members`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setBoardMembers(data.data);
          })
          .catch(console.error);
      }
      if (availableTags.length === 0) {
        fetch('/api/settings/tags')
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setAvailableTags(data.data.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
          })
          .catch(console.error);
      }
    }
  }, [isCreateLinkedTasksOpen, boardId, boardMembers.length, availableTags.length]);

  // Handle bulk linked tasks creation
  const handleLinkedTasksCreated = useCallback(
    (tasks: Card[]) => {
      // Add created tasks to connected tasks list
      setConnectedTasks((prev) => [...prev, ...(tasks as TaskCard[])]);
      // Notify parent about each new card
      for (const task of tasks) {
        onLinkedCardCreated?.(task);
      }
    },
    [onLinkedCardCreated]
  );

  const defaultTaskListId = taskLists.find((list) => list.phase === 'BACKLOG')?.id || taskLists[0]?.id || '';

  useEffect(() => {
    if (card?.type !== 'USER_STORY') return;
    setNewLinkedCardListId(defaultTaskListId);
    setNewLinkedStagingPlanningListId(card.listId);
    setNewLinkedReleaseTargetListId(defaultTaskListId);
  }, [card?.id, card?.type, card?.listId, defaultTaskListId]);

  if (!card) return null;

  const config = cardTypeConfig[card.type];
  const Icon = config.icon;
  const isTaskInTasksView =
    card.type === 'TASK' &&
    (taskLists.length === 0 || taskLists.some((list) => list.id === card.listId));

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    // Optimistic: remove card and close modal immediately
    onDelete(card.id);
    onClose();

    try {
      await apiFetch(`/api/boards/${boardId}/cards/${card.id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete card:', error);
      toast.error('Failed to delete card. Please refresh the page.');
    }
  };

  const handleCreateLinkedCard = async () => {
    if (!newLinkedCardTitle.trim() || !card) return;

    // Determine the target list:
    // - For creating Task from User Story: use selected taskList or first taskList
    // - For creating User Story from Epic: use selected planningList or first planningList
    // - Fallback to same list if no lists provided
    let targetListId = card.listId;

    if (card.type === 'USER_STORY') {
      // Creating a Task - should go in TASKS view
      targetListId = newLinkedCardListId || defaultTaskListId || card.listId;
    } else if (card.type === 'EPIC') {
      // Creating a User Story - should go in PLANNING view
      targetListId = newLinkedCardListId || planningLists[0]?.id || card.listId;
    }

    setIsCreatingLinkedCardLoading(true);
    try {
      // Determine the card type and linked field based on current card type
      const newCardType = card.type === 'EPIC' ? 'USER_STORY' : 'TASK';
      const linkedData = card.type === 'EPIC'
        ? { userStoryData: { linkedEpicId: card.id } }
        : { taskData: { linkedUserStoryId: card.id } };
      const isLinkedTaskFromUserStory = card.type === 'USER_STORY';
      const isStagedTask = isLinkedTaskFromUserStory && newLinkedTaskDestination === 'STAGED';

      const response = await fetch(`/api/boards/${boardId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLinkedCardTitle.trim(),
          type: newCardType,
          listId: isStagedTask ? (newLinkedStagingPlanningListId || card.listId) : targetListId,
          ...(isLinkedTaskFromUserStory && {
            taskDestination: {
              mode: newLinkedTaskDestination,
              ...(newLinkedTaskDestination === 'IMMEDIATE' && {
                immediateListId: targetListId,
              }),
              ...(newLinkedTaskDestination === 'STAGED' && {
                stagingPlanningListId: newLinkedStagingPlanningListId || card.listId,
                releaseTargetListId: newLinkedReleaseTargetListId || defaultTaskListId,
              }),
            },
          }),
          ...linkedData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const createdCard = data.data as Card;
        // Add to connected cards list locally
        if (card.type === 'EPIC') {
          setConnectedUserStories(prev => [...prev, createdCard as UserStoryCard]);
        } else if (card.type === 'USER_STORY') {
          setConnectedTasks(prev => [...prev, createdCard as TaskCard]);
        }
        onLinkedCardCreated?.(createdCard);

        // Clear the input and list selection
        setNewLinkedCardTitle('');
        setNewLinkedCardListId(defaultTaskListId);
        setNewLinkedStagingPlanningListId(card.listId);
        setNewLinkedReleaseTargetListId(defaultTaskListId);
        setNewLinkedTaskDestination('IMMEDIATE');
        setIsCreatingLinkedCard(false);

      }
    } catch (error) {
      console.error('Failed to create linked card:', error);
    } finally {
      setIsCreatingLinkedCardLoading(false);
    }
  };

  const handleChecklistsUpdate = (updatedChecklists: Checklist[]) => {
    setChecklists(updatedChecklists);
    // Also update the parent card
    onUpdate({
      ...card,
      checklists: updatedChecklists,
    } as Card);
  };

  const handleAssigneesUpdate = (updatedAssignees: CardAssignee[]) => {
    setAssignees(updatedAssignees);
    // Also update the parent card
    onUpdate({
      ...card,
      assignees: updatedAssignees,
    } as Card);
  };

  // Compute dependency chain for TASK cards
  const dependencyChain: ChainLink[] | null =
    card?.type === 'TASK' ? buildDependencyChain(card.id, allCards) : null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-modal gap-0 overflow-hidden p-0 flex flex-col">
        {/* Feature Image */}
        {featureImage && (
          <div className="relative h-40 w-full overflow-hidden bg-surface-hover group">
            <Image
              src={featureImage}
              alt=""
              fill
              sizes="768px"
              className="object-cover"
              style={{ objectPosition: `center ${featureImagePosition}%` }}
            />
            {/* Position Controls - visible on hover */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setFeatureImagePosition(Math.max(0, featureImagePosition - 10))}
                disabled={featureImagePosition <= 0}
                title="Move image up"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setFeatureImagePosition(Math.min(100, featureImagePosition + 10))}
                disabled={featureImagePosition >= 100}
                title="Move image down"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setFeatureImage(null)}
            >
              <X className="mr-1 h-4 w-4" />
              Remove
            </Button>
          </div>
        )}

        {/* Header */}
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle asChild>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-none bg-transparent px-0 text-heading font-semibold focus-visible:ring-0"
                  placeholder="Card title"
                />
              </DialogTitle>
              <DialogDescription className="sr-only">
                Edit {config.label.toLowerCase()} card details
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1', config.bg)}>
                <Icon className={cn('h-4 w-4', config.color)} />
                <span className={cn('text-caption font-medium', config.color)}>
                  {config.label}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {canViewQualitySummaries && (
          <div className="border-b border-border px-6 py-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={activePanelTab === 'details' ? 'default' : 'outline'}
                onClick={() => setActivePanelTab('details')}
              >
                Details
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activePanelTab === 'quality' ? 'default' : 'outline'}
                onClick={() => setActivePanelTab('quality')}
              >
                Quality
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6">
            {(!canViewQualitySummaries || activePanelTab === 'details') ? (
              <div className="space-y-4">
            {/* Dependency Chain (Task cards only) */}
            {card.type === 'TASK' && dependencyChain && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {dependencyChain.map((link, i) => (
                  <div key={link.id} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-text-tertiary text-tiny">→</span>}
                    <button
                      onClick={() => {
                        if (!link.isCurrent && onCardClick) {
                          const target = allCards.find((c) => c.id === link.id);
                          if (target) onCardClick(target);
                        }
                      }}
                      disabled={link.isCurrent}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2 py-0.5 text-tiny font-medium transition-colors',
                        link.isCurrent
                          ? 'bg-card-task/15 text-card-task border border-card-task/30'
                          : link.isComplete
                            ? 'bg-success/10 text-success hover:bg-success/20 cursor-pointer'
                            : 'bg-surface-hover text-text-tertiary hover:bg-surface-hover/80 cursor-pointer'
                      )}
                    >
                      {link.isComplete ? (
                        <CheckSquare className="h-3 w-3" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current opacity-50" />
                      )}
                      <span>{link.typeLabel}</span>
                      {link.listName && !link.isCurrent && (
                        <span className="opacity-60">· {link.listName}</span>
                      )}
                      {link.checklistProgress && !link.isCurrent && (
                        <span className="opacity-60">
                          ({link.checklistProgress.done}/{link.checklistProgress.total})
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <button
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                className="flex w-full items-center gap-2 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {descriptionExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <AlignLeft className="h-4 w-4" />
                Description
              </button>
              {descriptionExpanded && (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="resize-none"
                />
              )}
            </div>

            {/* Utility Card Content */}
            {card.type === 'UTILITY' && (
              <div className="space-y-4">
                {/* Link URL (for LINK subtype) */}
                {utilitySubtype === 'LINK' && (
                  <div className="space-y-2">
                    <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={utilityUrl}
                        onChange={(e) => setUtilityUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1"
                      />
                      {utilityUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => window.open(utilityUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Note Content (for NOTE subtype) */}
                {utilitySubtype === 'NOTE' && (
                  <div className="space-y-2">
                    <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      Note Content
                    </Label>
                    <Textarea
                      value={utilityContent}
                      onChange={(e) => setUtilityContent(e.target.value)}
                      placeholder="Write your note here..."
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                )}

                {/* Milestone Date (for MILESTONE subtype) */}
                {utilitySubtype === 'MILESTONE' && (
                  <div className="space-y-2">
                    <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Target Date
                    </Label>
                    <DeadlinePicker
                      deadline={utilityDate}
                      onChange={setUtilityDate}
                    />
                  </div>
                )}

                {/* Blocker Info (for BLOCKER subtype) */}
                {utilitySubtype === 'BLOCKER' && (
                  <div className="space-y-2">
                    <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
                      <Ban className="h-4 w-4 text-error" />
                      Blocker Details
                    </Label>
                    <Textarea
                      value={utilityContent}
                      onChange={(e) => setUtilityContent(e.target.value)}
                      placeholder="Describe what is blocked and why..."
                      rows={4}
                      className="resize-none border-error/30"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Todo Checklist */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <button
                  onClick={() => setTodoExpanded(!todoExpanded)}
                  className="flex w-full items-center gap-2 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  {todoExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <CheckSquare className="h-4 w-4" />
                  Todo Checklist
                </button>
                {todoExpanded && (
                  <SimpleChecklist
                    checklists={checklists}
                    boardId={boardId}
                    cardId={card.id}
                    type="todo"
                    onUpdate={handleChecklistsUpdate}
                  />
                )}
              </div>
            )}

            {/* Feedback Checklist */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <button
                  onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                  className="flex w-full items-center gap-2 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  {feedbackExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <ListChecks className="h-4 w-4" />
                  Feedback
                </button>
                {feedbackExpanded && (
                  <SimpleChecklist
                    checklists={checklists}
                    boardId={boardId}
                    cardId={card.id}
                    type="feedback"
                    onUpdate={handleChecklistsUpdate}
                  />
                )}
              </div>
            )}

            {/* Connected Tasks (User Story only) */}
            {card.type === 'USER_STORY' && (
              <div className="space-y-2">
                {/* Create Linked Task Button/Input */}
                {isCreatingLinkedCard ? (
                  <div className="space-y-2">
                    <Input
                      value={newLinkedCardTitle}
                      onChange={(e) => setNewLinkedCardTitle(e.target.value)}
                      placeholder="Enter task title..."
                      autoFocus
                      disabled={isCreatingLinkedCardLoading}
                      onKeyDown={(e) => {
                        const canCreateImmediate = newLinkedTaskDestination === 'IMMEDIATE' && (
                          taskLists.length === 0 || !!newLinkedCardListId
                        );
                        const canCreateStaged = newLinkedTaskDestination === 'STAGED' && (
                          planningLists.length === 0 || !!newLinkedStagingPlanningListId
                        ) && (
                          taskLists.length === 0 || !!newLinkedReleaseTargetListId
                        );
                        if (e.key === 'Enter' && (canCreateImmediate || canCreateStaged)) {
                          handleCreateLinkedCard();
                        }
                        if (e.key === 'Escape') {
                          setIsCreatingLinkedCard(false);
                          setNewLinkedCardTitle('');
                          setNewLinkedCardListId(defaultTaskListId);
                          setNewLinkedStagingPlanningListId(card.listId);
                          setNewLinkedReleaseTargetListId(defaultTaskListId);
                          setNewLinkedTaskDestination('IMMEDIATE');
                        }
                      }}
                    />
                    <Select
                      value={newLinkedTaskDestination}
                      onValueChange={(value: TaskReleaseMode) => setNewLinkedTaskDestination(value)}
                      disabled={isCreatingLinkedCardLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IMMEDIATE">Send now to Tasks list</SelectItem>
                        <SelectItem value="STAGED">Stage for Friday release</SelectItem>
                      </SelectContent>
                    </Select>
                    {newLinkedTaskDestination === 'IMMEDIATE' && taskLists.length > 0 && (
                      <Select
                        value={newLinkedCardListId}
                        onValueChange={setNewLinkedCardListId}
                        disabled={isCreatingLinkedCardLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select list..." />
                        </SelectTrigger>
                        <SelectContent>
                          {taskLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {newLinkedTaskDestination === 'STAGED' && (
                      <div className="space-y-2">
                        <Select
                          value={newLinkedStagingPlanningListId}
                          onValueChange={setNewLinkedStagingPlanningListId}
                          disabled={isCreatingLinkedCardLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Staging planning list..." />
                          </SelectTrigger>
                          <SelectContent>
                            {planningLists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                {list.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={newLinkedReleaseTargetListId}
                          onValueChange={setNewLinkedReleaseTargetListId}
                          disabled={isCreatingLinkedCardLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Release target list..." />
                          </SelectTrigger>
                          <SelectContent>
                            {taskLists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                {list.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-caption text-text-secondary">
                          Staged tasks are scheduled for the Friday before the selected planning list starts.
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateLinkedCard}
                        disabled={
                          isCreatingLinkedCardLoading ||
                          !newLinkedCardTitle.trim() ||
                          (newLinkedTaskDestination === 'IMMEDIATE' && taskLists.length > 0 && !newLinkedCardListId) ||
                          (newLinkedTaskDestination === 'STAGED' && planningLists.length > 0 && !newLinkedStagingPlanningListId) ||
                          (newLinkedTaskDestination === 'STAGED' && taskLists.length > 0 && !newLinkedReleaseTargetListId)
                        }
                        className="flex-1"
                      >
                        {isCreatingLinkedCardLoading ? 'Creating...' : 'Add Task'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsCreatingLinkedCard(false);
                          setNewLinkedCardTitle('');
                          setNewLinkedCardListId(defaultTaskListId);
                          setNewLinkedStagingPlanningListId(card.listId);
                          setNewLinkedReleaseTargetListId(defaultTaskListId);
                          setNewLinkedTaskDestination('IMMEDIATE');
                        }}
                        disabled={isCreatingLinkedCardLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-start text-card-task border-card-task/30 hover:bg-card-task/10"
                      onClick={() => {
                        setIsCreatingLinkedCard(true);
                        setNewLinkedTaskDestination('IMMEDIATE');
                        setNewLinkedCardListId(defaultTaskListId);
                        setNewLinkedStagingPlanningListId(card.listId);
                        setNewLinkedReleaseTargetListId(defaultTaskListId);
                      }}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-start text-card-task border-card-task/30 hover:bg-card-task/10"
                      onClick={() => setIsCreateLinkedTasksOpen(true)}
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      Create 4 Linked
                    </Button>
                  </div>
                )}

                <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Connected Tasks
                  {connectedTasks.length > 0 && (
                    <span className="text-xs text-text-tertiary">({connectedTasks.length})</span>
                  )}
                </Label>
                {connectedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {connectedTasks.map((task) => {
                      // Task is complete if it's in a "Done" list
                      const isDone = task.list?.phase === 'DONE';
                      const firstAssignee = task.assignees?.[0];
                      return (
                        <button
                          key={task.id}
                          onClick={() => {
                            if (onCardClick) {
                              onCardClick(task as unknown as Card);
                            }
                          }}
                          className="flex w-full items-center gap-2 rounded-md border border-border-subtle bg-surface p-2 text-body text-left hover:border-card-task hover:bg-card-task/5 transition-colors"
                        >
                          <CheckSquare className={cn(
                            'h-4 w-4 shrink-0',
                            isDone ? 'text-success' : 'text-card-task'
                          )} />
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              'block truncate',
                              isDone && 'text-text-tertiary line-through'
                            )}>
                              {task.title}
                            </span>
                            {task.list?.name && (
                              <span className="text-tiny text-text-tertiary">
                                {task.list.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {task.taskData?.storyPoints && (
                              <span className="rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
                                {task.taskData.storyPoints} SP
                              </span>
                            )}
                            {firstAssignee && (
                              <div className="h-5 w-5 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden" title={firstAssignee.user.name || ''}>
                                {firstAssignee.user.image ? (
                                  <Image
                                    src={firstAssignee.user.image}
                                    alt={firstAssignee.user.name || ''}
                                    width={20}
                                    height={20}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-tiny font-medium text-text-secondary">
                                    {(firstAssignee.user.name || '?').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-caption text-text-tertiary italic">
                    No tasks connected yet. Link tasks from their card modal.
                  </p>
                )}
              </div>
            )}

            {/* Connected User Stories (Epic only) */}
            {card.type === 'EPIC' && (
              <div className="space-y-2">
                {/* Create Linked User Story Button/Input */}
                {isCreatingLinkedCard ? (
                  <div className="space-y-2">
                    <Input
                      value={newLinkedCardTitle}
                      onChange={(e) => setNewLinkedCardTitle(e.target.value)}
                      placeholder="Enter user story title..."
                      autoFocus
                      disabled={isCreatingLinkedCardLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (planningLists.length === 0 || newLinkedCardListId)) handleCreateLinkedCard();
                        if (e.key === 'Escape') {
                          setIsCreatingLinkedCard(false);
                          setNewLinkedCardTitle('');
                          setNewLinkedCardListId('');
                        }
                      }}
                    />
                    {planningLists.length > 0 && (
                      <Select
                        value={newLinkedCardListId}
                        onValueChange={setNewLinkedCardListId}
                        disabled={isCreatingLinkedCardLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select list..." />
                        </SelectTrigger>
                        <SelectContent>
                          {planningLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateLinkedCard}
                        disabled={isCreatingLinkedCardLoading || !newLinkedCardTitle.trim() || (planningLists.length > 0 && !newLinkedCardListId)}
                        className="flex-1"
                      >
                        {isCreatingLinkedCardLoading ? 'Creating...' : 'Add User Story'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsCreatingLinkedCard(false);
                          setNewLinkedCardTitle('');
                          setNewLinkedCardListId('');
                        }}
                        disabled={isCreatingLinkedCardLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-card-story border-card-story/30 hover:bg-card-story/10"
                    onClick={() => setIsCreatingLinkedCard(true)}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Create Linked User Story
                  </Button>
                )}

                <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Connected User Stories
                  {connectedUserStories.length > 0 && (
                    <span className="text-xs text-text-tertiary">({connectedUserStories.length})</span>
                  )}
                </Label>
                {connectedUserStories.length > 0 ? (
                  <div className="space-y-2">
                    {connectedUserStories.map((story) => {
                      const storyFlags = (story.userStoryData as { flags?: UserStoryFlag[] })?.flags || [];
                      return (
                        <div
                          key={story.id}
                          className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface p-2 text-body"
                        >
                          <BookOpen className="h-4 w-4 shrink-0 text-card-story" />
                          <span className="flex-1 truncate">{story.title}</span>
                          {storyFlags.length > 0 && (
                            <div className="flex gap-0.5">
                              {storyFlags.slice(0, 2).map((flag) => {
                                const flagDef = USER_STORY_FLAGS.find(f => f.value === flag);
                                if (!flagDef) return null;
                                const FlagIcon = flagDef.icon;
                                return (
                                  <span key={flag} title={flagDef.label}>
                                    <FlagIcon
                                      className={cn('h-3 w-3', flagDef.color.split(' ')[0])}
                                    />
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-caption text-text-tertiary italic">
                    No user stories connected yet. Link stories from their card modal.
                  </p>
                )}
              </div>
            )}

            {/* Comments */}
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary">
                Comments
              </Label>
              <CommentsSection
                boardId={boardId}
                cardId={card.id}
                currentUserId={currentUserId}
                attachments={attachments}
                onAttachmentClick={(attachment) => {
                  // Highlight the attachment and scroll to it
                  setHighlightedAttachmentId(attachment.id);
                  // Scroll the attachment into view
                  const element = document.getElementById(`attachment-${attachment.id}`);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Remove highlight after a short delay
                  setTimeout(() => setHighlightedAttachmentId(null), 2000);
                }}
              />
            </div>
              </div>
            ) : card.type !== 'TASK' ? (
              <div className="rounded-md border border-border-subtle bg-surface p-4 text-body text-text-tertiary">
                Quality evaluations apply only to Task cards.
              </div>
            ) : !isTaskInTasksView ? (
              <div className="rounded-md border border-border-subtle bg-surface p-4 text-body text-text-tertiary">
                Quality evaluations become available once this task is moved to the Tasks view.
              </div>
            ) : (
              <CardQualityPanel cardId={card.id} />
            )}
          </div>

          {/* Middle Column - Attachments */}
          <div className="w-[260px] shrink-0 border-l border-border overflow-y-auto p-4">
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
                {attachmentCount > 0 && (
                  <span className="text-xs text-text-tertiary">({attachmentCount})</span>
                )}
              </Label>
              <AttachmentSection
                boardId={boardId}
                cardId={card.id}
                onAttachmentCountChange={setAttachmentCount}
                onAttachmentsChange={setAttachments}
                highlightAttachmentId={highlightedAttachmentId}
                featureImageUrl={featureImage}
                onSetAsHeader={(url) => setFeatureImage(url)}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div
            className="w-[180px] shrink-0 space-y-4 border-l border-border overflow-y-auto p-4"
            style={{ backgroundColor: color ? `${color}10` : undefined }}
          >
            {/* Assignees */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Assignees
                </Label>
                <AssigneePicker
                  assignees={assignees}
                  boardId={boardId}
                  cardId={card.id}
                  onUpdate={handleAssigneesUpdate}
                />
              </div>
            )}

            {/* Story Points (Task only) */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Story Points
                </Label>
                <div className="flex flex-wrap gap-1">
                  {FIBONACCI_POINTS.map((points) => {
                    const isSelected = storyPoints === points;
                    const colors = SP_COLORS[points];
                    return (
                      <button
                        key={points}
                        type="button"
                        onClick={() => setStoryPoints(isSelected ? null : points)}
                        className={cn(
                          'h-8 min-w-[2rem] rounded border px-2 text-caption font-medium transition-colors',
                          isSelected
                            ? `${colors.bgSelected} text-white border-transparent`
                            : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                        )}
                      >
                        {points}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Deadline */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Deadline
                </Label>
                <DeadlinePicker
                  deadline={deadline}
                  onChange={setDeadline}
                />
              </div>
            )}

            {/* Time Tracking (Task only) */}
            {card.type === 'TASK' && (
              <TimeLogSection
                boardId={boardId}
                cardId={card.id}
                listId={card.listId}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
              />
            )}

            {/* Link to User Story (Task only) */}
            {card.type === 'TASK' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Link to User Story
                </Label>
                <ConnectionPicker
                  type="USER_STORY"
                  boardId={boardId}
                  currentCardId={card.id}
                  selectedId={linkedUserStoryId}
                  selectedCard={linkedUserStory}
                  candidateCards={allCards}
                  onChange={setLinkedUserStoryId}
                />
                {/* Show inherited Epic info for Tasks */}
                {linkedUserStoryId && (
                  <div className="mt-2 text-caption">
                    {linkedEpic ? (
                      <div className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface p-2">
                        <Layers className="h-3.5 w-3.5 text-card-epic" />
                        <span className="text-text-tertiary">Epic:</span>
                        <span className="truncate text-text-primary">{linkedEpic.title}</span>
                      </div>
                    ) : (
                      <p className="text-text-tertiary italic">
                        No Epic linked to this User Story
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Link to Epic (User Story only) */}
            {card.type === 'USER_STORY' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Link to Epic
                </Label>
                <ConnectionPicker
                  type="EPIC"
                  boardId={boardId}
                  currentCardId={card.id}
                  selectedId={linkedEpicId}
                  selectedCard={linkedEpic}
                  candidateCards={allCards}
                  onChange={setLinkedEpicId}
                />
              </div>
            )}

            {/* User Story Flags */}
            {card.type === 'USER_STORY' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Flags
                </Label>
                <div className="flex flex-wrap gap-1">
                  {USER_STORY_FLAGS.map((flag) => {
                    const isActive = flags.includes(flag.value);
                    const FlagIcon = flag.icon;
                    return (
                      <Button
                        key={flag.value}
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-7 gap-1 text-xs border',
                          isActive && flag.color
                        )}
                        onClick={() => {
                          if (isActive) {
                            setFlags(flags.filter(f => f !== flag.value));
                          } else {
                            setFlags([...flags, flag.value]);
                          }
                        }}
                      >
                        <FlagIcon className="h-3 w-3" />
                        {flag.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User Story Progress Stats */}
            {card.type === 'USER_STORY' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Progress
                </Label>
                <div className="space-y-2 rounded-md border border-border-subtle bg-surface p-3">
                  <div className="flex items-center justify-between text-body">
                    <span className="text-text-tertiary">Completion</span>
                    <span className="font-medium text-card-story">
                      {(card as UserStoryCard).completionPercentage ?? 0}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-card-story transition-all"
                      style={{ width: `${(card as UserStoryCard).completionPercentage ?? 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-body text-text-tertiary">
                    <span>Tasks: {connectedTasks.length}</span>
                    <span>SP: {(card as UserStoryCard).totalStoryPoints ?? 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Epic Progress Stats */}
            {card.type === 'EPIC' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Progress
                </Label>
                <div className="space-y-2 rounded-md border border-border-subtle bg-surface p-3">
                  <div className="flex items-center justify-between text-body">
                    <span className="text-text-tertiary">Overall</span>
                    <span className="font-medium text-card-epic">
                      {(card as EpicCard).overallProgress ?? 0}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-card-epic transition-all"
                      style={{ width: `${(card as EpicCard).overallProgress ?? 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-body text-text-tertiary">
                    <span>Stories: {connectedUserStories.length}</span>
                    <span>SP: {(card as EpicCard).totalStoryPoints ?? 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Utility Subtype Selector */}
            {card.type === 'UTILITY' && (
              <div className="space-y-2">
                <Label className="text-caption font-medium text-text-secondary">
                  Type
                </Label>
                <div className="flex flex-wrap gap-1">
                  {UTILITY_SUBTYPES.map((subtype) => {
                    const isActive = utilitySubtype === subtype.value;
                    const SubtypeIcon = subtype.icon;
                    return (
                      <Button
                        key={subtype.value}
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-7 gap-1 text-xs border',
                          isActive && subtype.color
                        )}
                        onClick={() => setUtilitySubtype(subtype.value)}
                      >
                        <SubtypeIcon className="h-3 w-3" />
                        {subtype.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-caption font-medium text-text-secondary">
                Color
              </Label>
              <ColorPicker color={color} onChange={setColor} />
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-border">
              <Label className="text-caption font-medium text-text-secondary">
                Actions
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-error hover:bg-error/10 hover:text-error"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete card
              </Button>
            </div>
          </div>
        </div>

        {/* Footer - always visible with auto-save */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Create Linked Tasks Modal (User Story only) */}
    {card?.type === 'USER_STORY' && (
      <CreateLinkedTasksModal
        isOpen={isCreateLinkedTasksOpen}
        onClose={() => setIsCreateLinkedTasksOpen(false)}
        boardId={boardId}
        userStoryId={card.id}
        userStoryListId={card.listId}
        taskLists={taskLists}
        planningLists={planningLists}
        boardMembers={boardMembers}
        availableTags={availableTags}
        onTasksCreated={handleLinkedTasksCreated}
      />
    )}
    </>
  );
}
