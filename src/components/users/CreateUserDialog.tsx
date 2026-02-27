'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Team } from '@/types';
import {
  UserDialogShell,
  type UserCompanyRoleOption,
  UserMetadataFormBlock,
  UserFormSubmitActions,
  type UserSkillOption,
} from './UserFormSections';
import { invalidateUserAndTeamQueries } from './user-query-invalidation';

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
  skills: UserSkillOption[];
  companyRoles: UserCompanyRoleOption[];
}

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
  const queryClient = useQueryClient();
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
      invalidateUserAndTeamQueries(queryClient, {
        teamIds: selectedTeamIds,
      });
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const metadataSelectionState = {
    selectedTeamIds,
    setSelectedTeamIds,
    selectedSkillIds,
    setSelectedSkillIds,
    selectedRoleIds: selectedCompanyRoleIds,
    setSelectedRoleIds: setSelectedCompanyRoleIds,
  };
  const teamOptions = teams.map((team) => ({ id: team.id, name: team.name, color: team.color }));

  return (
    <UserDialogShell
      isOpen={isOpen}
      onClose={onClose}
      title="Create User"
      description="Add a new user to the system. They will be able to log in with the email and password you provide."
      onSubmit={handleSubmit}
    >
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

      <UserMetadataFormBlock
        permission={permission}
        onPermissionChange={setPermission}
        teams={teamOptions}
        skills={skills}
        roles={companyRoles}
        selectionState={metadataSelectionState}
        optionalSelections
        error={error}
      />

      <UserFormSubmitActions
        onCancel={onClose}
        isLoading={isLoading}
        loadingLabel="Creating..."
        submitLabel="Create User"
        submitIcon={<Plus className="h-4 w-4 mr-1" />}
        submitDisabled={isLoading || !email.trim() || !password}
      />
    </UserDialogShell>
  );
}
