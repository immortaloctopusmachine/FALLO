'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { Team } from '@/types';

interface Skill {
  id: string;
  name: string;
  color: string | null;
}

interface CompanyRole {
  id: string;
  name: string;
  color: string | null;
}

interface SlackUserOption {
  id: string;
  realName: string;
  displayName: string;
  image192: string | null;
}

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  skills: Skill[];
  companyRoles: CompanyRole[];
}

const PERMISSIONS = [
  { value: 'VIEWER', label: 'Viewer', description: 'Can view boards and cards' },
  { value: 'MEMBER', label: 'Member', description: 'Can create and edit cards' },
  { value: 'ADMIN', label: 'Admin', description: 'Can manage boards and users' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full system access' },
] as const;

// Generate a random password
function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function CreateUserDialog({
  isOpen,
  onClose,
  teams,
  skills,
  companyRoles,
}: CreateUserDialogProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permission, setPermission] = useState<string>('MEMBER');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedCompanyRoleIds, setSelectedCompanyRoleIds] = useState<string[]>([]);
  const [slackUsers, setSlackUsers] = useState<SlackUserOption[]>([]);
  const [slackUserId, setSlackUserId] = useState<string>('');
  const [isSlackLoading, setIsSlackLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setName('');
      setPassword('');
      setShowPassword(false);
      setPermission('MEMBER');
      setSelectedTeamIds([]);
      setSelectedSkillIds([]);
      setSelectedCompanyRoleIds([]);
      setSlackUsers([]);
      setSlackUserId('');
      setError(null);
      setCopiedPassword(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchSlackUsers = async () => {
      setIsSlackLoading(true);
      try {
        const response = await fetch('/api/integrations/slack/users');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setSlackUsers(data.data);
        }
      } catch {
        // Slack integration is optional; fail silently.
      } finally {
        setIsSlackLoading(false);
      }
    };
    void fetchSlackUsers();
  }, [isOpen]);

  const handleGeneratePassword = () => {
    setPassword(generatePassword());
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (password) {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const toggleCompanyRole = (roleId: string) => {
    setSelectedCompanyRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          password,
          permission,
          teamIds: selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
          skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
          companyRoleIds: selectedCompanyRoleIds.length > 0 ? selectedCompanyRoleIds : undefined,
          slackUserId: slackUserId || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to create user');
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. They will be able to log in with the email and password you provide.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-error">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          {/* Slack user link */}
          <div className="space-y-2">
            <Label htmlFor="slackUserId">
              Slack Profile (optional)
            </Label>
            <select
              id="slackUserId"
              value={slackUserId}
              onChange={(e) => setSlackUserId(e.target.value)}
              disabled={isSlackLoading || isLoading}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body text-text-primary disabled:opacity-50"
            >
              <option value="">
                {isSlackLoading ? 'Loading Slack users...' : 'Auto-match by name (recommended)'}
              </option>
              {slackUsers.map((user) => {
                const label = user.displayName
                  ? `${user.realName} (${user.displayName})`
                  : user.realName;
                return (
                  <option key={user.id} value={user.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            <p className="text-caption text-text-tertiary">
              If left empty, the server will try to match by name when possible.
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-error">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                title="Generate random password"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                disabled={!password}
                title="Copy password"
              >
                {copiedPassword ? (
                  <span className="text-success text-tiny">Copied!</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-caption text-text-tertiary">
              Share this password securely with the user. They can change it after logging in.
            </p>
          </div>

          {/* Permission Level */}
          <div className="space-y-2">
            <Label>Permission Level</Label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setPermission(r.value)}
                  className={cn(
                    'flex flex-col items-start p-2 rounded-md border-2 text-left transition-colors',
                    permission === r.value
                      ? 'border-success bg-success/10'
                      : 'border-border hover:border-success/50'
                  )}
                >
                  <span className={cn(
                    'text-body font-medium',
                    permission === r.value && 'text-success'
                  )}>
                    {r.label}
                  </span>
                  <span className="text-caption text-text-tertiary">
                    {r.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Teams */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Teams (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {teams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggleTeam(team.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-body transition-colors',
                        isSelected
                          ? 'ring-2 ring-success'
                          : 'opacity-70 hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: `${team.color}20`,
                        color: team.color,
                      }}
                    >
                      {team.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <Label>Skills (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  const color = skill.color || '#71717a';
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-full text-body transition-colors',
                        isSelected
                          ? 'ring-2 ring-success'
                          : 'opacity-70 hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Company Roles */}
          {companyRoles.length > 0 && (
            <div className="space-y-2">
              <Label>Roles (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {companyRoles.map((companyRole) => {
                  const isSelected = selectedCompanyRoleIds.includes(companyRole.id);
                  const color = companyRole.color || '#71717a';
                  return (
                    <button
                      key={companyRole.id}
                      type="button"
                      onClick={() => toggleCompanyRole(companyRole.id)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-full text-body transition-colors',
                        isSelected
                          ? 'ring-2 ring-success'
                          : 'opacity-70 hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {companyRole.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-caption text-error">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !email.trim() || !password}>
              {isLoading ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
