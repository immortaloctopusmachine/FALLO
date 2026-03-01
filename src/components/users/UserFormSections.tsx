'use client';

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const USER_PERMISSION_OPTIONS = [
  { value: 'VIEWER', label: 'Viewer', description: 'Can view boards and cards' },
  { value: 'MEMBER', label: 'Member', description: 'Can create and edit cards' },
  { value: 'ADMIN', label: 'Admin', description: 'Can manage boards and users' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full system access' },
] as const;

export const USER_SENIORITY_OPTIONS = [
  { value: 'JUNIOR', label: 'Junior', description: 'Entry-level baseline expectations' },
  { value: 'MID', label: 'Mid', description: 'Mid-level baseline expectations' },
  { value: 'SENIOR', label: 'Senior', description: 'Senior baseline expectations' },
] as const;

export function toggleSelectedId(
  setter: Dispatch<SetStateAction<string[]>>,
  id: string
) {
  setter((prev) => (
    prev.includes(id)
      ? prev.filter((existingId) => existingId !== id)
      : [...prev, id]
  ));
}

interface PermissionSectionProps {
  permission: string;
  onPermissionChange: (permission: string) => void;
}

export function PermissionSection({
  permission,
  onPermissionChange,
}: PermissionSectionProps) {
  return (
    <div className="space-y-2">
      <Label>Permission Level</Label>
      <div className="grid grid-cols-2 gap-2">
        {USER_PERMISSION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPermissionChange(option.value)}
            className={cn(
              'flex flex-col items-start rounded-md border-2 p-2 text-left transition-colors',
              permission === option.value
                ? 'border-success bg-success/10'
                : 'border-border hover:border-success/50'
            )}
          >
            <span
              className={cn(
                'text-body font-medium',
                permission === option.value && 'text-success'
              )}
            >
              {option.label}
            </span>
            <span className="text-caption text-text-tertiary">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface SenioritySectionProps {
  seniority: string;
  onSeniorityChange: (seniority: string) => void;
}

export function SenioritySection({
  seniority,
  onSeniorityChange,
}: SenioritySectionProps) {
  return (
    <div className="space-y-2">
      <Label>Seniority</Label>
      <div className="grid grid-cols-3 gap-2">
        {USER_SENIORITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSeniorityChange(option.value)}
            className={cn(
              'flex flex-col items-start rounded-md border-2 p-2 text-left transition-colors',
              seniority === option.value
                ? 'border-success bg-success/10'
                : 'border-border hover:border-success/50'
            )}
          >
            <span
              className={cn(
                'text-body font-medium',
                seniority === option.value && 'text-success'
              )}
            >
              {option.label}
            </span>
            <span className="text-caption text-text-tertiary">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export interface SelectableColorItem {
  id: string;
  name: string;
  color: string | null;
}

export type UserSkillOption = SelectableColorItem;
export type UserCompanyRoleOption = SelectableColorItem;

interface ColoredItemSectionProps {
  label: string;
  optional?: boolean;
  items: SelectableColorItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function ColoredItemSection({
  label,
  optional = false,
  items,
  selectedIds,
  onToggle,
}: ColoredItemSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>{optional ? `${label} (optional)` : label}</Label>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const color = item.color || '#71717a';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={cn(
                'flex items-center gap-1 rounded-full px-3 py-1.5 text-body transition-colors',
                isSelected
                  ? 'ring-2 ring-success'
                  : 'opacity-70 hover:opacity-100'
              )}
              style={{
                backgroundColor: `${color}20`,
                color,
              }}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface UserMetadataSectionsProps {
  permission: string;
  onPermissionChange: (permission: string) => void;
  teams: SelectableColorItem[];
  skills: SelectableColorItem[];
  roles: SelectableColorItem[];
  selectedTeamIds: string[];
  setSelectedTeamIds: Dispatch<SetStateAction<string[]>>;
  selectedSkillIds: string[];
  setSelectedSkillIds: Dispatch<SetStateAction<string[]>>;
  selectedRoleIds: string[];
  setSelectedRoleIds: Dispatch<SetStateAction<string[]>>;
  optionalSelections?: boolean;
  error?: string | null;
}

export function UserMetadataSections({
  permission,
  onPermissionChange,
  teams,
  skills,
  roles,
  selectedTeamIds,
  setSelectedTeamIds,
  selectedSkillIds,
  setSelectedSkillIds,
  selectedRoleIds,
  setSelectedRoleIds,
  optionalSelections = false,
  error = null,
}: UserMetadataSectionsProps) {
  return (
    <>
      <PermissionSection
        permission={permission}
        onPermissionChange={onPermissionChange}
      />

      <ColoredItemSection
        label="Teams"
        optional={optionalSelections}
        items={teams}
        selectedIds={selectedTeamIds}
        onToggle={(teamId) => toggleSelectedId(setSelectedTeamIds, teamId)}
      />

      <ColoredItemSection
        label="Skills"
        optional={optionalSelections}
        items={skills}
        selectedIds={selectedSkillIds}
        onToggle={(skillId) => toggleSelectedId(setSelectedSkillIds, skillId)}
      />

      <ColoredItemSection
        label="Roles"
        optional={optionalSelections}
        items={roles}
        selectedIds={selectedRoleIds}
        onToggle={(roleId) => toggleSelectedId(setSelectedRoleIds, roleId)}
      />

      {error && (
        <div className="text-caption text-error">{error}</div>
      )}
    </>
  );
}

export interface UserMetadataSelectionState {
  selectedTeamIds: string[];
  setSelectedTeamIds: Dispatch<SetStateAction<string[]>>;
  selectedSkillIds: string[];
  setSelectedSkillIds: Dispatch<SetStateAction<string[]>>;
  selectedRoleIds: string[];
  setSelectedRoleIds: Dispatch<SetStateAction<string[]>>;
}

interface UserMetadataFormBlockProps {
  permission: string;
  onPermissionChange: (permission: string) => void;
  teams: SelectableColorItem[];
  skills: SelectableColorItem[];
  roles: SelectableColorItem[];
  selectionState: UserMetadataSelectionState;
  optionalSelections?: boolean;
  error?: string | null;
}

export function UserMetadataFormBlock({
  permission,
  onPermissionChange,
  teams,
  skills,
  roles,
  selectionState,
  optionalSelections = false,
  error = null,
}: UserMetadataFormBlockProps) {
  return (
    <UserMetadataSections
      permission={permission}
      onPermissionChange={onPermissionChange}
      teams={teams}
      skills={skills}
      roles={roles}
      selectedTeamIds={selectionState.selectedTeamIds}
      setSelectedTeamIds={selectionState.setSelectedTeamIds}
      selectedSkillIds={selectionState.selectedSkillIds}
      setSelectedSkillIds={selectionState.setSelectedSkillIds}
      selectedRoleIds={selectionState.selectedRoleIds}
      setSelectedRoleIds={selectionState.setSelectedRoleIds}
      optionalSelections={optionalSelections}
      error={error}
    />
  );
}

interface UserDialogShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

export function UserDialogShell({
  isOpen,
  onClose,
  title,
  description,
  onSubmit,
  children,
}: UserDialogShellProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          {children}
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface UserFormSubmitActionsProps {
  onCancel: () => void;
  isLoading: boolean;
  loadingLabel: string;
  submitLabel: string;
  submitIcon: ReactNode;
  submitDisabled?: boolean;
  leadingAction?: ReactNode;
}

export function UserFormSubmitActions({
  onCancel,
  isLoading,
  loadingLabel,
  submitLabel,
  submitIcon,
  submitDisabled = false,
  leadingAction,
}: UserFormSubmitActionsProps) {
  return (
    <div className={cn('flex pt-2', leadingAction ? 'justify-between' : 'justify-end')}>
      {leadingAction}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitDisabled}>
          {isLoading ? (
            loadingLabel
          ) : (
            <>
              {submitIcon}
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
