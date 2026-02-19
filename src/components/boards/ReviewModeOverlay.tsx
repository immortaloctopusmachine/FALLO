'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, CheckSquare, BookOpen, Layers, FileText, ArrowLeft, Check, ListTodo, Clapperboard, Paperclip, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SimpleChecklist } from '@/components/cards/SimpleChecklist';
import { TaskApprovals } from '@/components/cards/TaskApprovals';
import { ReviewSubmissionComment } from '@/components/cards/ReviewSubmissionComment';
import { ShieldCheck } from 'lucide-react';
import type { Card, TaskCard, TaskCardData, Checklist, Attachment, Comment, BoardSettings, BoardMember } from '@/types';
import { cn } from '@/lib/utils';

interface ReviewModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  reviewListId: string;
  reviewListName: string;
  cards: Card[];
  boardId: string;
  allLists: { id: string; name: string }[];
  onCardMoved: (cardId: string, targetListId: string) => void;
  boardSettings?: BoardSettings;
  boardMembers?: BoardMember[];
  currentUserId?: string;
}

const cardTypeConfig = {
  TASK: { label: 'Task', icon: CheckSquare, color: 'text-card-task', bg: 'bg-card-task/10' },
  USER_STORY: { label: 'User Story', icon: BookOpen, color: 'text-card-story', bg: 'bg-card-story/10' },
  EPIC: { label: 'Epic', icon: Layers, color: 'text-card-epic', bg: 'bg-card-epic/10' },
  UTILITY: { label: 'Utility', icon: FileText, color: 'text-card-utility', bg: 'bg-card-utility/10' },
};

export function ReviewModeOverlay({
  isOpen,
  onClose,
  reviewListId: _reviewListId,
  reviewListName,
  cards,
  boardId,
  allLists,
  onCardMoved,
  boardSettings = {},
  boardMembers = [],
  currentUserId,
}: ReviewModeOverlayProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [totalAttachmentCount, setTotalAttachmentCount] = useState(0);
  const [isLoadingExtras, setIsLoadingExtras] = useState(false);
  const [isLoadingAllAttachments, setIsLoadingAllAttachments] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [editableChecklists, setEditableChecklists] = useState<Checklist[]>([]);
  const [latestReviewComment, setLatestReviewComment] = useState<Comment | null>(null);
  // Track local taskData overrides for approvals (keyed by card ID)
  const [taskDataOverrides, setTaskDataOverrides] = useState<Record<string, TaskCardData>>({});

  // The selected card from the already-loaded cards prop — available instantly
  const selectedCard = selectedCardId ? cards.find(c => c.id === selectedCardId) || null : null;

  // Target lists
  const todoList = allLists.find(l => l.name === 'To Do');
  const todoAnimationList = allLists.find(l =>
    l.name === 'To Do FX/Animation' || l.name === 'To Do Animation'
  );
  const doneList = allLists.find(l => l.name === 'Done');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (expandedImageUrl) {
          setExpandedImageUrl(null);
        } else if (selectedCardId) {
          setSelectedCardId(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardId, expandedImageUrl, onClose]);

  // Fetch only attachments (latest 3, slim) + checklists when a card is selected
  // (card info is already available from the cards prop — no need to re-fetch)
  useEffect(() => {
    if (!selectedCardId) {
      setAttachments([]);
      setEditableChecklists([]);
      setTotalAttachmentCount(0);
      setExpandedImageUrl(null);
      setLatestReviewComment(null);
      return;
    }

    let cancelled = false;
    const fetchExtras = async () => {
      setIsLoadingExtras(true);
      try {
        const [attachRes, checkRes, commentRes] = await Promise.all([
          fetch(`/api/boards/${boardId}/cards/${selectedCardId}/attachments?limit=3&slim=true`),
          fetch(`/api/boards/${boardId}/cards/${selectedCardId}/checklists`),
          fetch(`/api/boards/${boardId}/cards/${selectedCardId}/comments`),
        ]);

        const [attachData, checkData, commentData] = await Promise.all([
          attachRes.json(),
          checkRes.json(),
          commentRes.json(),
        ]);

        if (!cancelled) {
          if (attachData.success) {
            setAttachments(attachData.data.items || []);
            setTotalAttachmentCount(attachData.data.totalCount || 0);
          } else {
            setAttachments([]);
            setTotalAttachmentCount(0);
          }
          const checklists = checkData.success ? checkData.data : [];
          setEditableChecklists(checklists);

          // Extract latest review_submission comment (comments arrive newest-first)
          const allComments: Comment[] = commentData.success ? commentData.data : [];
          const reviewComment = allComments.find((c: Comment) => c.type === 'review_submission');
          setLatestReviewComment(reviewComment || null);
        }
      } catch (error) {
        console.error('Failed to fetch card extras:', error);
      } finally {
        if (!cancelled) setIsLoadingExtras(false);
      }
    };

    fetchExtras();
    return () => { cancelled = true; };
  }, [selectedCardId, boardId]);

  const handleShowAllAttachments = useCallback(async () => {
    if (!selectedCardId || isLoadingAllAttachments) return;
    setIsLoadingAllAttachments(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/cards/${selectedCardId}/attachments?slim=true`);
      const data = await res.json();
      if (data.success) {
        setAttachments(data.data);
        setTotalAttachmentCount(data.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch all attachments:', error);
    } finally {
      setIsLoadingAllAttachments(false);
    }
  }, [selectedCardId, boardId, isLoadingAllAttachments]);

  const handleMoveCard = useCallback((cardId: string, targetListId: string) => {
    setMovingCardId(cardId);
    onCardMoved(cardId, targetListId);
    setSelectedCardId(null);
    setMovingCardId(null);
  }, [onCardMoved]);

  const handleApprovalChanged = useCallback((cardId: string, updatedTaskData: TaskCardData, autoMovedToDone?: boolean) => {
    setTaskDataOverrides(prev => ({ ...prev, [cardId]: updatedTaskData }));
    if (autoMovedToDone) {
      // Card was auto-moved to Done by the API — go back to grid
      setSelectedCardId(null);
    }
  }, []);

  if (!isOpen) return null;

  // Helper to get effective taskData (with local overrides from approvals)
  const getTaskData = (card: Card): TaskCardData | null => {
    if (card.type !== 'TASK') return null;
    return taskDataOverrides[card.id] || (card as TaskCard).taskData || null;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={() => {
        if (selectedCardId) {
          setSelectedCardId(null);
        } else {
          onClose();
        }
      }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/80 px-6 py-3">
        <div className="flex items-center gap-3">
          {selectedCardId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedCardId(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <h2 className="text-lg font-semibold text-white">
            Review Mode — {reviewListName}
          </h2>
          <span className="text-sm text-white/50">{cards.length} cards</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-auto p-6">
        {!selectedCardId ? (
          /* Grid View */
          cards.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg text-white/50">No cards in review</p>
                <p className="text-sm text-white/30 mt-1">All done! Close to go back to the board.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {cards.map((card) => {
                const config = cardTypeConfig[card.type];
                const Icon = config.icon;
                const taskCard = card.type === 'TASK' ? card as TaskCard : null;
                const isMoving = movingCardId === card.id;

                return (
                  <button
                    key={card.id}
                    onClick={() => !isMoving && setSelectedCardId(card.id)}
                    disabled={isMoving}
                    className={cn(
                      'rounded-lg bg-surface border border-border p-4 text-left transition-all hover:bg-surface-raised hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5',
                      isMoving && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded', config.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', config.color)} />
                      </div>
                      <h3 className="text-body font-medium text-text-primary line-clamp-2">
                        {card.title}
                      </h3>
                    </div>
                    {taskCard?.taskData?.storyPoints && (
                      <span className="inline-flex rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
                        {taskCard.taskData.storyPoints} SP
                      </span>
                    )}
                    {taskCard?.assignees && taskCard.assignees.length > 0 && (
                      <div className="flex -space-x-1 mt-2">
                        {taskCard.assignees.slice(0, 4).map((a) => (
                          <Avatar key={a.id} className="h-5 w-5 border border-surface">
                            <AvatarImage src={a.user.image || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {(a.user.name || a.user.email)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {taskCard.assignees.length > 4 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-surface bg-surface-raised text-[8px] text-text-tertiary">
                            +{taskCard.assignees.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )
        ) : selectedCard ? (
          /* Detail View — 4-section layout */
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-4 gap-4 items-start">
              {/* Section 1: Card Info — renders instantly from cards prop */}
              <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = cardTypeConfig[selectedCard.type];
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={cn('flex h-7 w-7 items-center justify-center rounded', config.bg)}>
                          <Icon className={cn('h-4 w-4', config.color)} />
                        </div>
                        <span className={cn('text-caption font-medium', config.color)}>
                          {config.label}
                        </span>
                      </>
                    );
                  })()}
                </div>

                <h3 className="text-title font-semibold text-text-primary">
                  {selectedCard.title}
                </h3>

                {selectedCard.description && (
                  <p className="text-caption text-text-secondary line-clamp-6">
                    {selectedCard.description}
                  </p>
                )}

                {/* Story points */}
                {selectedCard.type === 'TASK' && (selectedCard as TaskCard).taskData?.storyPoints && (
                  <div className="flex items-center gap-2">
                    <span className="text-tiny text-text-tertiary">Story Points:</span>
                    <span className="rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
                      {(selectedCard as TaskCard).taskData.storyPoints}
                    </span>
                  </div>
                )}

                {/* Assignees */}
                {selectedCard.type === 'TASK' && (selectedCard as TaskCard).assignees && (selectedCard as TaskCard).assignees!.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-tiny text-text-tertiary">Assignees</span>
                    <div className="space-y-1">
                      {(selectedCard as TaskCard).assignees!.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={a.user.image || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {(a.user.name || a.user.email)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-caption text-text-secondary">
                            {a.user.name || a.user.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Latest review comment */}
                {latestReviewComment && (
                  <div className="pt-2 border-t border-border">
                    <ReviewSubmissionComment comment={latestReviewComment} />
                  </div>
                )}
              </div>

              {/* Section 2: Attachments */}
              <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-text-tertiary" />
                  <h4 className="text-body font-semibold text-text-primary">
                    Attachments{!isLoadingExtras ? ` (${totalAttachmentCount})` : ''}
                  </h4>
                </div>

                {isLoadingExtras ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 animate-pulse rounded-md bg-surface-hover" />
                    ))}
                  </div>
                ) : attachments.length === 0 ? (
                  <p className="text-caption text-text-tertiary py-4 text-center">
                    No attachments
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {attachments.map((att) => {
                      const isImage = att.type.startsWith('image/');
                      return (
                        <button
                          key={att.id}
                          onClick={() => {
                            if (isImage) {
                              setExpandedImageUrl(att.url);
                            } else {
                              window.open(att.url, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="block w-full rounded-md border border-border overflow-hidden hover:border-purple-500/30 transition-colors text-left"
                        >
                          {isImage ? (
                            <div className="relative h-24 bg-surface-hover">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={att.url}
                                alt={att.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-surface-hover">
                              <FileText className="h-4 w-4 text-text-tertiary shrink-0" />
                              <span className="text-caption text-text-secondary truncate">
                                {att.name}
                              </span>
                            </div>
                          )}
                          <div className="px-2 py-1.5">
                            <span className="text-tiny text-text-tertiary truncate block">
                              {att.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {/* Show all button when there are more attachments */}
                    {attachments.length < totalAttachmentCount && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-text-tertiary"
                        onClick={handleShowAllAttachments}
                        disabled={isLoadingAllAttachments}
                      >
                        {isLoadingAllAttachments
                          ? 'Loading...'
                          : `Show all ${totalAttachmentCount} attachments`}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Feedback/Tweaks */}
              <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-text-tertiary" />
                  <h4 className="text-body font-semibold text-text-primary">
                    Feedback / Tweaks
                  </h4>
                </div>

                {isLoadingExtras ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-6 animate-pulse rounded bg-surface-hover" />
                    ))}
                  </div>
                ) : (
                  <SimpleChecklist
                    checklists={editableChecklists}
                    boardId={boardId}
                    cardId={selectedCard.id}
                    type="feedback"
                    onUpdate={(updated) => setEditableChecklists(updated)}
                  />
                )}
              </div>

              {/* Section 4: Actions */}
              <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
                <h4 className="text-body font-semibold text-text-primary">Actions</h4>

                {/* PO / Lead Approvals */}
                {selectedCard.type === 'TASK' && getTaskData(selectedCard) && (
                  <TaskApprovals
                    boardId={boardId}
                    cardId={selectedCard.id}
                    taskData={getTaskData(selectedCard)!}
                    boardSettings={boardSettings}
                    boardMembers={boardMembers}
                    currentUserId={currentUserId}
                    onApprovalChanged={(updatedTaskData, autoMovedToDone) =>
                      handleApprovalChanged(selectedCard.id, updatedTaskData, autoMovedToDone)
                    }
                  />
                )}

                {/* Move actions / fully-approved state */}
                {(() => {
                  const td = getTaskData(selectedCard);
                  const fullyApproved = td?.approvedByPo && td?.approvedByLead;

                  if (fullyApproved) {
                    return (
                      <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-green-400 font-medium text-caption">
                          <ShieldCheck className="h-4 w-4" />
                          Fully Approved
                        </div>
                        <p className="text-tiny text-text-secondary">
                          Both PO and Lead have approved this task. It will be auto-moved to Done.
                        </p>
                        {doneList && (
                          <Button
                            size="sm"
                            className="w-full justify-start bg-green-600 hover:bg-green-700 text-white mt-2"
                            onClick={() => handleMoveCard(selectedCard.id, doneList.id)}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Move to Done Now
                          </Button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {doneList && (
                        <Button
                          className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleMoveCard(selectedCard.id, doneList.id)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Move to Done
                        </Button>
                      )}

                      {todoList && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleMoveCard(selectedCard.id, todoList.id)}
                        >
                          <ListTodo className="h-4 w-4 mr-2" />
                          Move to To Do
                        </Button>
                      )}

                      {todoAnimationList && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleMoveCard(selectedCard.id, todoAnimationList.id)}
                        >
                          <Clapperboard className="h-4 w-4 mr-2" />
                          Move to To Do FX/Animation
                        </Button>
                      )}
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Back to grid — centered below all sections */}
            <div className="flex justify-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-text-tertiary"
                onClick={() => setSelectedCardId(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to grid
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Full-resolution image lightbox */}
      {expandedImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 cursor-zoom-out"
          onClick={() => setExpandedImageUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedImageUrl}
            alt="Full resolution"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setExpandedImageUrl(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          <a
            href={expandedImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 text-tiny text-white/50 hover:text-white/80 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Open original
          </a>
        </div>
      )}
    </div>
  );
}
