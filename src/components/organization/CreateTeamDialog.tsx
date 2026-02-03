'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { cn } from '@/lib/utils';

const TEAM_COLORS = [
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316',
];

interface Studio {
  id: string;
  name: string;
  color: string | null;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface CreateTeamDialogProps {
  studioId?: string;
}

export function CreateTeamDialog({ studioId: defaultStudioId }: CreateTeamDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [studioId, setStudioId] = useState<string | null>(defaultStudioId || null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studios, setStudios] = useState<Studio[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [studioOpen, setStudioOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  // Fetch studios and users when dialog opens
  useEffect(() => {
    if (open) {
      fetchStudios();
      fetchUsers();
    }
  }, [open]);

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

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const removeUser = (userId: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const selectedStudio = studios.find((s) => s.id === studioId);
  const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Create the team
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          color,
          studioId: studioId || undefined
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to create team');
        return;
      }

      const teamId = data.data.id;

      // Add selected members to the team
      if (selectedUserIds.length > 0) {
        for (const userId of selectedUserIds) {
          await fetch(`/api/teams/${teamId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role: 'MEMBER' }),
          });
        }
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor(TEAM_COLORS[0]);
    setStudioId(defaultStudioId || null);
    setSelectedUserIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Teams group members together and can own boards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>Team Color</Label>
            <p className="text-caption text-text-tertiary">
              This color will be used in the timeline view.
            </p>
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

          {/* Member Selection */}
          <div className="space-y-2">
            <Label>Team Members</Label>
            <p className="text-caption text-text-tertiary">
              You will be added as an admin automatically.
            </p>

            {/* Selected members chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-hover text-sm"
                  >
                    <div className="h-5 w-5 rounded-full bg-surface overflow-hidden">
                      {user.image ? (
                        <img src={user.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-tiny font-medium text-text-secondary">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-text-primary">{user.name || user.email}</span>
                    <button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      className="ml-1 text-text-tertiary hover:text-text-primary"
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Popover open={usersOpen} onOpenChange={setUsersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={usersOpen}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  <span className="text-text-tertiary">Add members...</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.name || user.email}
                          onSelect={() => toggleUser(user.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedUserIds.includes(user.id) ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="h-6 w-6 rounded-full bg-surface-hover overflow-hidden mr-2">
                            {user.image ? (
                              <img src={user.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-tiny font-medium text-text-secondary">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span>{user.name || 'Unnamed'}</span>
                            <span className="text-tiny text-text-tertiary">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
