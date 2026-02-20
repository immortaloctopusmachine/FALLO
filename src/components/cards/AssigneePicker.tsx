'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import type { CardAssignee, BoardMember } from '@/types';
import { cn } from '@/lib/utils';

interface AssigneePickerProps {
  assignees: CardAssignee[];
  boardId: string;
  cardId: string;
  boardMembers?: BoardMember[];
  onUpdate: (assignees: CardAssignee[]) => void;
}

export function AssigneePicker({
  assignees,
  boardId,
  cardId,
  boardMembers: preloadedBoardMembers = [],
  onUpdate,
}: AssigneePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>(preloadedBoardMembers);

  useEffect(() => {
    setBoardMembers(preloadedBoardMembers);
  }, [preloadedBoardMembers]);

  useEffect(() => {
    const fetchBoardMembers = async () => {
      try {
        const response = await fetch(`/api/boards/${boardId}/members`);
        const data = await response.json();
        if (data.success) {
          setBoardMembers(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch board members:', error);
      }
    };

    if (isOpen && boardMembers.length === 0) {
      fetchBoardMembers();
    }
  }, [isOpen, boardId, boardMembers.length]);

  const handleAssign = async (userId: string) => {
    const member = boardMembers.find((m) => m.userId === userId);
    if (!member) return;

    // Optimistic: add assignee immediately
    const previousAssignees = assignees;
    const tempAssignee: CardAssignee = {
      id: `temp-${userId}`,
      userId,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
        permission: member.user.permission,
      },
      assignedAt: new Date().toISOString(),
    };
    onUpdate([...assignees, tempAssignee]);

    try {
      const realAssignee = await apiFetch<CardAssignee>(
        `/api/boards/${boardId}/cards/${cardId}/assignees`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      );
      // Replace temp with real server data
      onUpdate(previousAssignees.filter((a) => a.userId !== userId).concat(realAssignee));
    } catch (error) {
      console.error('Failed to assign user:', error);
      onUpdate(previousAssignees); // Rollback
      toast.error('Failed to assign user');
    }
  };

  const handleUnassign = async (userId: string) => {
    // Optimistic: remove immediately
    const previousAssignees = assignees;
    onUpdate(assignees.filter((a) => a.userId !== userId));

    try {
      await apiFetch(
        `/api/boards/${boardId}/cards/${cardId}/assignees?userId=${userId}`,
        { method: 'DELETE' }
      );
    } catch (error) {
      console.error('Failed to unassign user:', error);
      onUpdate(previousAssignees); // Rollback
      toast.error('Failed to unassign user');
    }
  };

  const isAssigned = (userId: string) => assignees.some((a) => a.userId === userId);

  return (
    <div className="space-y-2">
      {/* Current Assignees */}
      {assignees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assignees.map((assignee) => (
            <div
              key={assignee.id}
              className="flex items-center gap-1.5 rounded-full bg-surface-hover py-1 pl-1 pr-2"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignee.user.image || undefined} />
                <AvatarFallback className="text-[10px]">
                  {assignee.user.name?.[0] || assignee.user.email[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-caption">
                {assignee.user.name || assignee.user.email}
              </span>
              <button
                onClick={() => handleUnassign(assignee.userId)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-surface"
              >
                <X className="h-3 w-3 text-text-tertiary" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Assignee Button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start text-text-tertiary">
            <UserPlus className="mr-2 h-4 w-4" />
            Add assignee
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start">
          <div className="space-y-1">
            <p className="px-2 py-1 text-caption font-medium text-text-secondary">
              Board members
            </p>
            {boardMembers.length === 0 ? (
              <p className="px-2 py-2 text-caption text-text-tertiary">
                No members found
              </p>
            ) : (
              boardMembers.map((member) => {
                const assigned = isAssigned(member.userId);
                return (
                  <button
                    key={member.id}
                    onClick={() =>
                      assigned
                        ? handleUnassign(member.userId)
                        : handleAssign(member.userId)
                    }
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                      'hover:bg-surface-hover',
                      assigned && 'bg-surface-hover'
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.user.image || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.user.name?.[0] || member.user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-body">
                        {member.user.name || member.user.email}
                      </p>
                      {member.user.name && (
                        <p className="truncate text-caption text-text-tertiary">
                          {member.user.email}
                        </p>
                      )}
                    </div>
                    {assigned && (
                      <Check className="h-4 w-4 text-success shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
