'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, Check, ChevronsUpDown, Building2, Trash2, Upload, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { TeamDetail, TeamMember, Studio, User } from '@/types';

const TEAM_COLORS = [
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316',
];

interface TeamSettingsModalProps {
  team: TeamDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamSettingsModal({ team, open, onOpenChange }: TeamSettingsModalProps) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [color, setColor] = useState(team.color);
  const [image, setImage] = useState(team.image || '');
  const [studioId, setStudioId] = useState<string | null>(team.studio?.id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [studios, setStudios] = useState<Studio[]>([]);
  const [users, setUsers] = useState<Pick<User, 'id' | 'name' | 'email' | 'image'>[]>([]);
  const [members, setMembers] = useState<TeamMember[]>(team.members);
  const [studioOpen, setStudioOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Fetch studios and users when modal opens
  useEffect(() => {
    if (open) {
      fetchStudios();
      fetchUsers();
      // Reset form to current team values
      setName(team.name);
      setDescription(team.description || '');
      setColor(team.color);
      setImage(team.image || '');
      setStudioId(team.studio?.id || null);
      setMembers(team.members);
    }
  }, [open, team]);

  const fetchStudios = async () => {
    try {
      const response = await fetch('/api/studios');
      const data = await response.json();
      if (data.success) {
        setStudios(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch studios:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const selectedStudio = studios.find((s) => s.id === studioId);
  const memberUserIds = members.map((m) => m.user.id);
  const availableUsers = users.filter((u) => !memberUserIds.includes(u.id));

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          color,
          image: image || null,
          studioId: studioId || null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to update team');
        return;
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setAddingMemberId(userId);
    setMemberError(null);

    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, permission: 'MEMBER' }),
      });

      const data = await response.json();

      if (data.success) {
        setMembers((prev) => [...prev, data.data]);
        router.refresh();
      } else {
        setMemberError(data.error?.message || 'Failed to add member');
      }
    } catch (err) {
      console.error('Failed to add member:', err);
      setMemberError('Failed to add member. Please try again.');
    } finally {
      setAddingMemberId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/teams/${team.id}/members?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMembers((prev) => prev.filter((m) => m.user.id !== userId));
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteDialog(false);
        onOpenChange(false);
        router.push('/teams');
        router.refresh();
      }
    } catch {
      console.error('Failed to delete team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setImage(data.data.url);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Settings</DialogTitle>
            <DialogDescription>
              Manage team details and members.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              {error && (
                <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="team-name">Name</Label>
                <Input
                  id="team-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Yellow Team"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-description">Description</Label>
                <Textarea
                  id="team-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this team work on?"
                  rows={2}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Header Image</Label>
                <div className="flex items-center gap-3">
                  {image ? (
                    <div className="relative h-16 w-32 rounded-md overflow-hidden bg-surface-hover">
                      <Image src={image} alt="" fill sizes="128px" className="object-cover" />
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border hover:border-text-tertiary cursor-pointer transition-colors">
                      <Upload className="h-4 w-4 text-text-tertiary" />
                      <span className="text-body text-text-tertiary">Upload image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Team Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-transform',
                        color === c ? 'border-white scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              {/* Studio Selection */}
              <div className="space-y-2">
                <Label>Studio (Optional)</Label>
                <Popover open={studioOpen} onOpenChange={setStudioOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={studioOpen}
                      className="w-full justify-between"
                      disabled={isLoading}
                    >
                      {selectedStudio ? (
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" style={{ color: selectedStudio.color || undefined }} />
                          {selectedStudio.name}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">Select a studio...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search studios..." />
                      <CommandList>
                        <CommandEmpty>No studios found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setStudioId(null);
                              setStudioOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                studioId === null ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="text-text-tertiary">No studio</span>
                          </CommandItem>
                          {studios.map((studio) => (
                            <CommandItem
                              key={studio.id}
                              value={studio.name}
                              onSelect={() => {
                                setStudioId(studio.id);
                                setStudioOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  studioId === studio.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <Building2
                                className="mr-2 h-4 w-4"
                                style={{ color: studio.color || undefined }}
                              />
                              {studio.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Team
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="members" className="mt-4">
              {/* Error message */}
              {memberError && (
                <div className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
                  {memberError}
                </div>
              )}

              {/* Add member dropdown */}
              <div className="mb-4">
                <Popover open={usersOpen} onOpenChange={setUsersOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span className="text-text-tertiary">Add member...</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search users..." />
                      <CommandList>
                        <CommandEmpty>No users available.</CommandEmpty>
                        <CommandGroup>
                          {availableUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.name || user.email}
                              disabled={addingMemberId === user.id}
                              onSelect={() => {
                                handleAddMember(user.id);
                                setUsersOpen(false);
                              }}
                            >
                              <div className="h-6 w-6 rounded-full bg-surface-hover overflow-hidden mr-2">
                                {user.image ? (
                                  <Image src={user.image} alt="" width={24} height={24} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-tiny font-medium text-text-secondary">
                                    {(user.name || user.email).charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col flex-1">
                                <span>{user.name || 'Unnamed'}</span>
                                <span className="text-tiny text-text-tertiary">{user.email}</span>
                              </div>
                              {addingMemberId === user.id && (
                                <span className="text-tiny text-text-tertiary">Adding...</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Members list */}
              <div className="rounded-lg border border-border overflow-hidden">
                {members.length === 0 ? (
                  <div className="p-4 text-center text-text-tertiary">No members yet</div>
                ) : (
                  <div className="divide-y divide-border">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 hover:bg-surface-hover"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-surface-hover overflow-hidden">
                            {member.user.image ? (
                              <Image
                                src={member.user.image}
                                alt=""
                                width={36}
                                height={36}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-body font-medium text-text-secondary">
                                {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">
                              {member.user.name || member.user.email}
                            </div>
                            <div className="text-caption text-text-tertiary">
                              {member.title || member.permission.toLowerCase()}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.user.id)}
                          className="p-1.5 rounded-md text-text-tertiary hover:text-red-500 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{team.name}&quot;? This action cannot be undone.
              Team members will be removed, but boards will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
