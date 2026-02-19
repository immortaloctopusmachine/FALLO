'use client';

import { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { resolveApprovers, type ResolvedApprover } from '@/lib/role-utils';
import { fireDoneConfetti } from '@/lib/confetti';
import type { TaskCardData, BoardSettings, BoardMember } from '@/types';

interface TaskApprovalsProps {
  boardId: string;
  cardId: string;
  taskData: TaskCardData;
  boardSettings: BoardSettings;
  boardMembers: BoardMember[];
  currentUserId?: string;
  onApprovalChanged: (updatedTaskData: TaskCardData, autoMovedToDone?: boolean) => void;
}

export function TaskApprovals({
  boardId,
  cardId,
  taskData,
  boardSettings,
  boardMembers,
  currentUserId,
  onApprovalChanged,
}: TaskApprovalsProps) {
  const [isSaving, setIsSaving] = useState(false);

  const roleAssignments = boardSettings.projectRoleAssignments || [];
  const approvers = resolveApprovers(roleAssignments);

  const poApprover = approvers.find((a) => a.role === 'PO');
  const leadApprover = approvers.find((a) => a.role === 'LEAD');

  // If no PO or Lead is configured, don't render
  if (!poApprover && !leadApprover) return null;

  const getApproverUser = (approver: ResolvedApprover | undefined) => {
    if (!approver) return null;
    const member = boardMembers.find((m) => m.userId === approver.userId);
    return member?.user || null;
  };

  const poUser = getApproverUser(poApprover);
  const leadUser = getApproverUser(leadApprover);

  const handleToggleApproval = async (role: 'PO' | 'LEAD') => {
    if (isSaving) return;

    const approver = role === 'PO' ? poApprover : leadApprover;
    const approverUser = role === 'PO' ? poUser : leadUser;
    if (!approver) return;

    // Only the assigned approver can toggle their own checkbox
    if (currentUserId !== approver.userId) {
      toast.error(`Only the assigned ${role === 'PO' ? 'PO' : 'Lead'} can toggle this approval`);
      return;
    }

    const fieldKey = role === 'PO' ? 'approvedByPo' : 'approvedByLead';
    const isCurrentlyApproved = !!taskData[fieldKey];

    const newValue = isCurrentlyApproved
      ? null
      : {
          userId: approver.userId,
          userName: approverUser?.name || approverUser?.email || 'Unknown',
          at: new Date().toISOString(),
        };

    const updatedTaskData = {
      ...taskData,
      [fieldKey]: newValue,
    };

    setIsSaving(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskData: updatedTaskData }),
      });

      const data = await response.json();
      if (data.success) {
        const returnedTaskData = data.data.taskData || updatedTaskData;
        const autoMovedToDone = data.data._autoMovedToDone === true;
        onApprovalChanged(returnedTaskData, autoMovedToDone);
        if (autoMovedToDone) {
          fireDoneConfetti();
          toast.success('Both approvals received — task moved to Done!');
        }
      } else {
        toast.error('Failed to update approval');
      }
    } catch {
      toast.error('Failed to update approval');
    } finally {
      setIsSaving(false);
    }
  };

  const renderApprovalRow = (
    role: 'PO' | 'LEAD',
    label: string,
    approver: ResolvedApprover | undefined,
    user: { name?: string | null; email?: string | null; image?: string | null } | null
  ) => {
    if (!approver) return null;

    const fieldKey = role === 'PO' ? 'approvedByPo' : 'approvedByLead';
    const approval = taskData[fieldKey];
    const isApproved = !!approval;
    const canToggle = currentUserId === approver.userId;

    return (
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-md border px-3 py-2 transition-colors',
          isApproved
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-border bg-surface-hover/30'
        )}
      >
        <Checkbox
          checked={isApproved}
          onCheckedChange={() => handleToggleApproval(role)}
          disabled={!canToggle || isSaving}
          className={cn(
            isApproved && 'border-green-500 bg-green-500 text-white data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
          )}
        />
        {user?.image ? (
          <Avatar className="h-5 w-5">
            <AvatarImage src={user.image} />
            <AvatarFallback className="text-[8px]">
              {(user.name || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-hover text-tiny text-text-tertiary">
            {(user?.name || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className={cn(
            'text-caption',
            isApproved ? 'text-green-400 font-medium' : 'text-text-secondary'
          )}>
            {label}
          </span>
          <span className="text-tiny text-text-tertiary ml-1.5">
            {user?.name || 'Unassigned'}
          </span>
        </div>
        {isApproved && (
          <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-caption font-medium text-text-secondary mb-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        Approvals
      </div>
      {renderApprovalRow('PO', 'Approved by PO', poApprover, poUser)}
      {renderApprovalRow('LEAD', 'Approved by Lead', leadApprover, leadUser)}
    </div>
  );
}
