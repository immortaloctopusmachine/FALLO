'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { Card, TaskCard, UserStoryCard, EpicCard, UtilityCard, Checklist, CardAssignee, UserStoryFlag, UtilitySubtype, List, Attachment } from '@/types';
import { cn } from '@/lib/utils';
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
  onRefreshBoard?: () => void;
  onCardClick?: (card: Card) => void;  // Open another card (e.g., a connected task)
  currentUserId?: string;
  isAdmin?: boolean;  // Whether current user is admin (for time log management)
  taskLists?: List[];  // Lists for TASKS view - used when creating linked tasks
  planningLists?: List[];  // Lists for PLANNING view - used when creating linked user stories
}

const cardTypeConfig = {
  TASK: { label: 'Task', icon: CheckSquare, color: 'text-card-task', bg: 'bg-card-task/10' },
  USER_STORY: { label: 'User Story', icon: BookOpen, color: 'text-card-story', bg: 'bg-card-story/10' },
  EPIC: { label: 'Epic', icon: Layers, color: 'text-card-epic', bg: 'bg-card-epic/10' },
  UTILITY: { label: 'Utility', icon: FileText, color: 'text-card-utility', bg: 'bg-card-utility/10' },
};

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

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

export function CardModal({ card, boardId, isOpen, onClose, onUpdate, onDelete, onRefreshBoard, onCardClick, currentUserId, isAdmin = false, taskLists = [], planningLists = [] }: CardModalProps) {
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
  const [isDeleting, setIsDeleting] = useState(false);
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
  const [newLinkedCardTitle, setNewLinkedCardTitle] = useState('');
  const [newLinkedCardListId, setNewLinkedCardListId] = useState<string>('');
  const [isCreatingLinkedCardLoading, setIsCreatingLinkedCardLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
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

  // Fetch linked user story data when linkedUserStoryId changes (for Tasks)
  useEffect(() => {
    if (card?.type === 'TASK' && linkedUserStoryId) {
      // Fetch the user story to get its epic info
      fetch(`/api/boards/${boardId}/cards/${linkedUserStoryId}`, { cache: 'no-store' })
        .then(res => {
          if (!res.ok) {
            console.warn(`Failed to fetch user story ${linkedUserStoryId}: ${res.status}`);
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (data?.success) {
            setLinkedUserStory(data.data);
            // Auto-inherit the epic from the user story
            const storyEpicId = data.data.userStoryData?.linkedEpicId;
            if (storyEpicId) {
              setLinkedEpicId(storyEpicId);
              // Fetch epic details
              fetch(`/api/boards/${boardId}/cards/${storyEpicId}`, { cache: 'no-store' })
                .then(res => {
                  if (!res.ok) return null;
                  return res.json();
                })
                .then(epicData => {
                  if (epicData?.success) {
                    setLinkedEpic(epicData.data);
                  }
                })
                .catch(console.error);
            } else {
              setLinkedEpicId(null);
              setLinkedEpic(null);
            }
          }
        })
        .catch(console.error);
    } else if (card?.type === 'TASK' && !linkedUserStoryId) {
      setLinkedUserStory(null);
      setLinkedEpicId(null);
      setLinkedEpic(null);
    }
  }, [card?.type, linkedUserStoryId, boardId]);

  // Fetch linked epic data when linkedEpicId changes (for User Story)
  useEffect(() => {
    if (card?.type === 'USER_STORY' && linkedEpicId) {
      fetch(`/api/boards/${boardId}/cards/${linkedEpicId}`, { cache: 'no-store' })
        .then(res => {
          if (!res.ok) {
            console.warn(`Failed to fetch epic ${linkedEpicId}: ${res.status}`);
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (data?.success) {
            setLinkedEpic(data.data);
          }
        })
        .catch(console.error);
    } else if (card?.type === 'USER_STORY' && !linkedEpicId) {
      setLinkedEpic(null);
    }
  }, [card?.type, linkedEpicId, boardId]);

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

        // Refresh board if connections changed (to update connected tasks/stories counts)
        const connectionChanged =
          (card.type === 'TASK' && linkedUserStoryId !== ((card as TaskCard).taskData?.linkedUserStoryId ?? null)) ||
          (card.type === 'USER_STORY' && linkedEpicId !== ((card as UserStoryCard).userStoryData?.linkedEpicId ?? null));

        if (connectionChanged && onRefreshBoard) {
          onRefreshBoard();
        }
      } else {
        setAutoSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save card:', error);
      setAutoSaveStatus('error');
    }
  }, [card, title, description, color, featureImage, featureImagePosition, storyPoints, deadline, linkedUserStoryId, flags, linkedEpicId, utilitySubtype, utilityUrl, utilityContent, utilityDate, boardId, checklists, assignees, onUpdate, onRefreshBoard]);

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
  }, [card?.id]);

  if (!card) return null;

  const config = cardTypeConfig[card.type];
  const Icon = config.icon;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${card.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(card.id);
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete card:', error);
    } finally {
      setIsDeleting(false);
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
      targetListId = newLinkedCardListId || taskLists[0]?.id || card.listId;
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

      const response = await fetch(`/api/boards/${boardId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLinkedCardTitle.trim(),
          type: newCardType,
          listId: targetListId,
          ...linkedData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Add to connected cards list locally
        if (card.type === 'EPIC') {
          setConnectedUserStories(prev => [...prev, data.data]);
        } else if (card.type === 'USER_STORY') {
          setConnectedTasks(prev => [...prev, data.data]);
        }

        // Clear the input and list selection
        setNewLinkedCardTitle('');
        setNewLinkedCardListId('');
        setIsCreatingLinkedCard(false);

        // Refresh board to update all counts
        if (onRefreshBoard) {
          onRefreshBoard();
        }
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-modal gap-0 overflow-hidden p-0 flex flex-col">
        {/* Feature Image */}
        {featureImage && (
          <div className="relative h-40 w-full overflow-hidden bg-surface-hover group">
            <img
              src={featureImage}
              alt=""
              className="h-full w-full object-cover"
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
              {/* Auto-save status indicator */}
              {autoSaveStatus !== 'idle' && (
                <span className={cn(
                  'text-tiny font-medium transition-opacity',
                  autoSaveStatus === 'saving' && 'text-text-tertiary',
                  autoSaveStatus === 'saved' && 'text-success',
                  autoSaveStatus === 'error' && 'text-error'
                )}>
                  {autoSaveStatus === 'saving' && 'Saving...'}
                  {autoSaveStatus === 'saved' && 'Saved'}
                  {autoSaveStatus === 'error' && 'Save failed'}
                </span>
              )}
              <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1', config.bg)}>
                <Icon className={cn('h-4 w-4', config.color)} />
                <span className={cn('text-caption font-medium', config.color)}>
                  {config.label}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 space-y-4 overflow-y-auto p-6">
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
                        if (e.key === 'Enter' && newLinkedCardListId) handleCreateLinkedCard();
                        if (e.key === 'Escape') {
                          setIsCreatingLinkedCard(false);
                          setNewLinkedCardTitle('');
                          setNewLinkedCardListId('');
                        }
                      }}
                    />
                    {taskLists.length > 0 && (
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateLinkedCard}
                        disabled={isCreatingLinkedCardLoading || !newLinkedCardTitle.trim() || (taskLists.length > 0 && !newLinkedCardListId)}
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
                    className="w-full justify-start text-card-task border-card-task/30 hover:bg-card-task/10"
                    onClick={() => setIsCreatingLinkedCard(true)}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Create Linked Task
                  </Button>
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
                                  <img
                                    src={firstAssignee.user.image}
                                    alt={firstAssignee.user.name || ''}
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
                  {FIBONACCI_POINTS.map((points) => (
                    <Button
                      key={points}
                      variant={storyPoints === points ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0',
                        storyPoints === points && 'bg-card-task hover:bg-card-task/90'
                      )}
                      onClick={() => setStoryPoints(storyPoints === points ? null : points)}
                    >
                      {points}
                    </Button>
                  ))}
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
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete card'}
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
  );
}
