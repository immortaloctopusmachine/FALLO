'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Crown, Shield, Eye, User, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BoardMember, UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface BoardMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  currentUserId?: string;
  isAdmin: boolean;
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', icon: Crown, color: 'text-yellow-500' },
  ADMIN: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  MEMBER: { label: 'Member', icon: User, color: 'text-text-secondary' },
  VIEWER: { label: 'Viewer', icon: Eye, color: 'text-text-tertiary' },
};

export function BoardMembersModal({
  isOpen,
  onClose,
  boardId,
  currentUserId,
  isAdmin,
}: BoardMembersModalProps) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('MEMBER');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, boardId]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setIsAdding(true);
    setError(null);

    try {
      const response = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to add member');
        return;
      }

      setMembers((prev) => [...prev, data.data]);
      setNewMemberEmail('');
      setNewMemberRole('MEMBER');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/boards/${boardId}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        alert(data.error?.message || 'Failed to remove member');
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Board Members
          </DialogTitle>
          <DialogDescription>
            Manage who has access to this board and their roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Member Form (Admin only) */}
          {isAdmin && (
            <form onSubmit={handleAddMember} className="space-y-3 pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-caption text-text-secondary">
                <UserPlus className="h-4 w-4" />
                Add a new member
              </div>
              {error && (
                <div className="rounded-md bg-error/10 p-2 text-sm text-error">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    disabled={isAdding}
                  />
                </div>
                <Select
                  value={newMemberRole}
                  onValueChange={(value) => setNewMemberRole(value as UserRole)}
                  disabled={isAdding}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={isAdding || !newMemberEmail.trim()}>
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <Label className="text-caption text-text-secondary">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {members.map((member) => {
                  const roleConfig = ROLE_CONFIG[member.role];
                  const RoleIcon = roleConfig.icon;
                  const isCurrentUser = member.userId === currentUserId;
                  const isDeleted = !!member.user.deletedAt;
                  const canModify = isAdmin && !isCurrentUser && !isDeleted;

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-2 hover:bg-surface-hover",
                        isDeleted && "opacity-60"
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "h-8 w-8 shrink-0 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden",
                        isDeleted && "grayscale"
                      )}>
                        {member.user.image ? (
                          <img
                            src={member.user.image}
                            alt={member.user.name || ''}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-caption font-medium text-text-secondary">
                            {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-body font-medium truncate",
                            isDeleted && "text-text-tertiary"
                          )}>
                            {member.user.name || member.user.email}
                          </span>
                          {isCurrentUser && (
                            <span className="text-tiny text-text-tertiary">(you)</span>
                          )}
                          {isDeleted && (
                            <span className="text-tiny text-error bg-error/10 px-1.5 py-0.5 rounded">deleted</span>
                          )}
                        </div>
                        <div className="text-caption text-text-tertiary truncate">
                          {member.user.email}
                        </div>
                      </div>

                      {/* Role */}
                      {canModify ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateRole(member.id, value as UserRole)}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className={cn('flex items-center gap-1 text-caption', roleConfig.color)}>
                          <RoleIcon className="h-3.5 w-3.5" />
                          <span>{roleConfig.label}</span>
                        </div>
                      )}

                      {/* Remove Button */}
                      {(canModify || isCurrentUser) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-text-tertiary hover:text-error"
                          onClick={() => handleRemoveMember(member.id)}
                          title={isCurrentUser ? 'Leave board' : 'Remove member'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
