'use client';

import { useState } from 'react';
import { Settings, Calendar, Link as LinkIcon, Sparkles, Save } from 'lucide-react';
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

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  settings: BoardSettings;
  onSave: (settings: BoardSettings) => Promise<void>;
}

export function BoardSettingsModal({
  isOpen,
  onClose,
  boardId: _boardId,
  settings: initialSettings,
  onSave,
}: BoardSettingsModalProps) {
  const [settings, setSettings] = useState<BoardSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
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
