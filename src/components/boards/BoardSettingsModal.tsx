'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Settings, Calendar, Link as LinkIcon, Sparkles, Save, AlertTriangle, Archive, Copy, FileText, Paintbrush, ImageIcon, X, Ban } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BoardSettings, ListTemplateType } from '@/types';
import { BOARD_GRADIENTS } from '@/lib/board-backgrounds';
import { cn } from '@/lib/utils';

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  isTemplate?: boolean;
  settings: BoardSettings;
  onSave: (settings: BoardSettings) => Promise<void>;
}

interface SlackChannelOption {
  id: string;
  name: string;
  isPrivate: boolean;
}

export function BoardSettingsModal({
  isOpen,
  onClose,
  boardId,
  boardName,
  isTemplate = false,
  settings: initialSettings,
  onSave,
}: BoardSettingsModalProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<BoardSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [archiveConfirmation, setArchiveConfirmation] = useState('');
  const [cloneName, setCloneName] = useState('');
  const [slackChannels, setSlackChannels] = useState<SlackChannelOption[]>([]);
  const [isLoadingSlackChannels, setIsLoadingSlackChannels] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const loadSlackChannels = async () => {
      setIsLoadingSlackChannels(true);
      try {
        const response = await fetch('/api/integrations/slack/channels');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setSlackChannels(data.data);
        }
      } catch {
        // Slack integration is optional.
      } finally {
        setIsLoadingSlackChannels(false);
      }
    };
    void loadSlackChannels();
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Check if project start date was changed
      const startDateChanged = settings.projectStartDate !== initialSettings.projectStartDate;

      await onSave(settings);

      // If start date was set/changed, apply dates to planning lists
      if (startDateChanged && settings.projectStartDate) {
        try {
          await fetch(`/api/boards/${boardId}/apply-dates`, {
            method: 'POST',
          });
        } catch (error) {
          console.error('Failed to apply dates to lists:', error);
        }
      }

      router.refresh(); // Refresh to get updated list data
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (archiveConfirmation !== boardName) return;

    setIsArchiving(true);
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onClose();
        router.push('/boards');
        router.refresh();
      } else {
        console.error('Failed to archive board');
      }
    } catch (error) {
      console.error('Failed to archive board:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleClone = async (asTemplate: boolean) => {
    setIsCloning(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cloneName.trim() || undefined,
          asTemplate,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onClose();
        router.push(`/boards/${result.data.id}`);
        router.refresh();
      } else {
        console.error('Failed to clone board:', result.error);
      }
    } catch (error) {
      console.error('Failed to clone board:', error);
    } finally {
      setIsCloning(false);
      setCloneName('');
    }
  };

  const handleBgImageUpload = async (file: File) => {
    setIsUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success && result.data?.url) {
        setSettings((prev) => ({
          ...prev,
          backgroundType: 'image',
          backgroundGradient: undefined,
          backgroundImageUrl: result.data.url,
        }));
      }
    } catch (error) {
      console.error('Failed to upload background image:', error);
    } finally {
      setIsUploadingBg(false);
    }
  };

  const updateSetting = <K extends keyof BoardSettings>(
    key: K,
    value: BoardSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateProjectLink = (
    key: keyof NonNullable<BoardSettings['projectLinks']>,
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      projectLinks: {
        ...prev.projectLinks,
        [key]: value,
      },
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Board Settings
          </DialogTitle>
          <DialogDescription>
            Configure project dates, links, and other board settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Background Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-title font-semibold">
              <Paintbrush className="h-4 w-4" />
              Background
            </h3>
            <div className="flex flex-wrap gap-2">
              {/* None option */}
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    backgroundType: 'none',
                    backgroundGradient: undefined,
                    backgroundImageUrl: undefined,
                  }))
                }
                className={cn(
                  'h-8 w-12 rounded-md border-2 flex items-center justify-center bg-background',
                  (!settings.backgroundType || settings.backgroundType === 'none')
                    ? 'border-text-primary ring-1 ring-text-primary'
                    : 'border-border hover:border-text-tertiary'
                )}
                title="None"
              >
                <Ban className="h-3.5 w-3.5 text-text-tertiary" />
              </button>
              {/* Gradient swatches */}
              {Object.entries(BOARD_GRADIENTS).map(([key, { label, css }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      backgroundType: 'gradient',
                      backgroundGradient: key,
                      backgroundImageUrl: undefined,
                    }))
                  }
                  className={cn(
                    'h-8 w-12 rounded-md border-2',
                    settings.backgroundType === 'gradient' && settings.backgroundGradient === key
                      ? 'border-text-primary ring-1 ring-text-primary'
                      : 'border-border hover:border-text-tertiary'
                  )}
                  style={{ background: css }}
                  title={label}
                />
              ))}
            </div>
            {/* Custom image */}
            <div className="flex items-center gap-3">
              <input
                ref={bgFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBgImageUpload(file);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => bgFileRef.current?.click()}
                disabled={isUploadingBg}
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                {isUploadingBg ? 'Uploading...' : 'Custom Image'}
              </Button>
              {settings.backgroundType === 'image' && settings.backgroundImageUrl && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-12 rounded-md border border-border bg-cover bg-center"
                    style={{ backgroundImage: `url(${settings.backgroundImageUrl})` }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        backgroundType: 'none',
                        backgroundImageUrl: undefined,
                      }))
                    }
                    className="text-text-tertiary hover:text-error"
                    title="Remove background image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Project Dates Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-title font-semibold">
              <Calendar className="h-4 w-4" />
              Project Dates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectStartDate">Project Start Date</Label>
                <Input
                  id="projectStartDate"
                  type="date"
                  value={settings.projectStartDate?.split('T')[0] || ''}
                  onChange={(e) =>
                    updateSetting(
                      'projectStartDate',
                      e.target.value ? new Date(e.target.value).toISOString() : undefined
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listTemplate">List Template</Label>
                <Select
                  value={settings.listTemplate || 'STANDARD_SLOT'}
                  onValueChange={(value) =>
                    updateSetting('listTemplate', value as ListTemplateType)
                  }
                >
                  <SelectTrigger id="listTemplate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD_SLOT">Standard Slot (14 weeks)</SelectItem>
                    <SelectItem value="BRANDED_GAME">Branded Game (6 weeks)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastDayStaticArt">Last Day for Static Art</Label>
                <Input
                  id="lastDayStaticArt"
                  type="date"
                  value={settings.lastDayStaticArt?.split('T')[0] || ''}
                  onChange={(e) =>
                    updateSetting(
                      'lastDayStaticArt',
                      e.target.value ? new Date(e.target.value).toISOString() : undefined
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastDayAnimationTweaks">Last Day for Animation Tweaks</Label>
                <Input
                  id="lastDayAnimationTweaks"
                  type="date"
                  value={settings.lastDayAnimationTweaks?.split('T')[0] || ''}
                  onChange={(e) =>
                    updateSetting(
                      'lastDayAnimationTweaks',
                      e.target.value ? new Date(e.target.value).toISOString() : undefined
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Project Links Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-title font-semibold">
              <LinkIcon className="h-4 w-4" />
              Project Links
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="gameSpecification">Game Specification</Label>
                <Input
                  id="gameSpecification"
                  type="url"
                  placeholder="https://..."
                  value={settings.projectLinks?.gameSpecification || ''}
                  onChange={(e) => updateProjectLink('gameSpecification', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameOverviewPlanning">
                  Game Overview Planning
                  <span className="text-text-tertiary text-tiny ml-2">(has default)</span>
                </Label>
                <Input
                  id="gameOverviewPlanning"
                  type="url"
                  placeholder="https://..."
                  value={settings.projectLinks?.gameOverviewPlanning || ''}
                  onChange={(e) => updateProjectLink('gameOverviewPlanning', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="animationDocument">
                  Animation Document
                  <span className="text-text-tertiary text-tiny ml-2">(has default)</span>
                </Label>
                <Input
                  id="animationDocument"
                  type="url"
                  placeholder="https://..."
                  value={settings.projectLinks?.animationDocument || ''}
                  onChange={(e) => updateProjectLink('animationDocument', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameSheetInfo">
                  Game Sheet Info
                  <span className="text-text-tertiary text-tiny ml-2">(has default)</span>
                </Label>
                <Input
                  id="gameSheetInfo"
                  type="url"
                  placeholder="https://..."
                  value={settings.projectLinks?.gameSheetInfo || ''}
                  onChange={(e) => updateProjectLink('gameSheetInfo', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameNameBrainstorming">
                  Game Name Brainstorming
                  <span className="text-text-tertiary text-tiny ml-2">(has default)</span>
                </Label>
                <Input
                  id="gameNameBrainstorming"
                  type="url"
                  placeholder="https://..."
                  value={settings.projectLinks?.gameNameBrainstorming || ''}
                  onChange={(e) => updateProjectLink('gameNameBrainstorming', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* LLM Settings Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-title font-semibold">
              <Sparkles className="h-4 w-4" />
              AI Features
            </h3>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <div className="font-medium">Enable AI Features</div>
                <div className="text-caption text-text-tertiary">
                  Use Claude to summarize feedback, extract action items, and more.
                </div>
              </div>
              <Switch
                checked={settings.llmEnabled || false}
                onCheckedChange={(checked) => updateSetting('llmEnabled', checked)}
              />
            </div>
          </div>

          {/* Slack Integration Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-title font-semibold">
              <LinkIcon className="h-4 w-4" />
              Slack Integration
            </h3>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Enable Slack Alerts</div>
                  <div className="text-caption text-text-tertiary">
                    Send slow-progress and weekly summary messages to the mapped project channel.
                  </div>
                </div>
                <Switch
                  checked={settings.slackAlertsEnabled ?? true}
                  onCheckedChange={(checked) => updateSetting('slackAlertsEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slackChannelId">Project Slack Channel</Label>
                {slackChannels.length > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={settings.slackChannelId || ''}
                      onValueChange={(value) => updateSetting('slackChannelId', value || undefined)}
                    >
                      <SelectTrigger id="slackChannelId">
                        <SelectValue placeholder={isLoadingSlackChannels ? 'Loading channels...' : 'Select channel'} />
                      </SelectTrigger>
                      <SelectContent>
                        {slackChannels.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            {channel.isPrivate ? '[private] ' : '#'}{channel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateSetting('slackChannelId', undefined)}
                    >
                      Clear channel mapping
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="slackChannelId"
                    placeholder="e.g. C0123456789"
                    value={settings.slackChannelId || ''}
                    onChange={(e) => updateSetting('slackChannelId', e.target.value || undefined)}
                  />
                )}
                <p className="text-caption text-text-tertiary">
                  Channel ID is stored per project. Invite the bot to private channels.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slackSlowProgressThresholdPct">Slow Progress Threshold (%)</Label>
                <Input
                  id="slackSlowProgressThresholdPct"
                  type="number"
                  min={0}
                  max={100}
                  value={settings.slackSlowProgressThresholdPct ?? 50}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    updateSetting(
                      'slackSlowProgressThresholdPct',
                      Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50
                    );
                  }}
                />
              </div>
            </div>
          </div>

          {/* Clone & Template Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="flex items-center gap-2 text-title font-semibold">
              <Copy className="h-4 w-4" />
              Clone & Templates
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cloneName">New board name (optional)</Label>
                <Input
                  id="cloneName"
                  placeholder={`${boardName} (Copy)`}
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  disabled={isCloning}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleClone(false)}
                  disabled={isCloning}
                  className="flex-1"
                >
                  {isCloning ? (
                    'Cloning...'
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Board
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleClone(true)}
                  disabled={isCloning}
                  className="flex-1"
                >
                  {isCloning ? (
                    'Creating...'
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Save as Template
                    </>
                  )}
                </Button>
              </div>
              <p className="text-caption text-text-tertiary">
                {isTemplate
                  ? 'This board is a template. Duplicating creates a new working board.'
                  : 'Duplicate creates a copy of this board. Save as Template creates a reusable template.'}
              </p>
              <p className="text-caption text-text-tertiary">
                Cloning copies all lists, cards, and their connections. Assignees, comments, and dates are not copied.
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="flex items-center gap-2 text-title font-semibold text-error">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h3>
            <div className="rounded-lg border border-error/30 bg-error/5 p-4 space-y-4">
              <div>
                <div className="font-medium text-error">Archive this board</div>
                <div className="text-caption text-text-secondary">
                  Once archived, the board will be hidden from your board list. This action can be undone by an administrator.
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="archiveConfirmation" className="text-caption">
                  Type <span className="font-mono font-semibold">{boardName}</span> to confirm:
                </Label>
                <Input
                  id="archiveConfirmation"
                  value={archiveConfirmation}
                  onChange={(e) => setArchiveConfirmation(e.target.value)}
                  placeholder="Board name"
                  disabled={isArchiving}
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleArchive}
                disabled={archiveConfirmation !== boardName || isArchiving}
                className="w-full"
              >
                {isArchiving ? (
                  'Archiving...'
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Board
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
