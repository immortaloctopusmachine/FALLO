'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  ChevronsUpDown,
  Flame,
  FolderKanban,
  Heart,
  Home,
  LayoutGrid,
  Loader2,
  Moon,
  Palette,
  Settings,
  Sparkles,
  Star,
  Sun,
  Monitor,
  Gamepad2,
  BarChart3,
  User,
  Users,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeIcon } from '@/components/shared/ThemeIcon';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  broadcastSkinAssetsConfigChanged,
  createDefaultSkinAssetsConfig,
  createDefaultThemeSkinAssets,
  isSupportedAssetPath,
  normalizeSkinAssetsConfig,
  SKIN_ICON_NAMES,
  UI_THEMES,
  type SkinAssetsConfig,
  type SkinIconName,
  type ThemeSkinAssets,
  type UiTheme,
} from '@/lib/skin-assets';

interface SkinSettingsApiData {
  config: SkinAssetsConfig;
  updatedAt: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

interface FontPresetOption {
  label: string;
  value: string;
  preview: string;
}

const FONT_PRESET_OPTIONS: FontPresetOption[] = [
  {
    label: 'System UI',
    value: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    preview: 'Balanced modern default',
  },
  {
    label: 'Inter',
    value: '"Inter", "Segoe UI", sans-serif',
    preview: 'Clean product UI',
  },
  {
    label: 'Segoe UI',
    value: '"Segoe UI", Tahoma, sans-serif',
    preview: 'Windows-native look',
  },
  {
    label: 'Roboto',
    value: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    preview: 'Neutral geometric',
  },
  {
    label: 'Open Sans',
    value: '"Open Sans", Arial, sans-serif',
    preview: 'Friendly readable body',
  },
  {
    label: 'Lato',
    value: '"Lato", "Helvetica Neue", sans-serif',
    preview: 'Warm and rounded',
  },
  {
    label: 'Montserrat',
    value: '"Montserrat", "Segoe UI", sans-serif',
    preview: 'Bold headings',
  },
  {
    label: 'Poppins',
    value: '"Poppins", "Segoe UI", sans-serif',
    preview: 'Modern rounded feel',
  },
  {
    label: 'Nunito',
    value: '"Nunito", "Segoe UI", sans-serif',
    preview: 'Soft friendly tone',
  },
  {
    label: 'Source Sans 3',
    value: '"Source Sans 3", "Segoe UI", sans-serif',
    preview: 'Open and readable',
  },
  {
    label: 'Rubik',
    value: '"Rubik", "Segoe UI", sans-serif',
    preview: 'Contemporary geometric',
  },
  {
    label: 'Ubuntu',
    value: '"Ubuntu", "Segoe UI", sans-serif',
    preview: 'Distinctive rounded',
  },
  {
    label: 'IBM Plex Sans',
    value: '"IBM Plex Sans", "Segoe UI", sans-serif',
    preview: 'Technical and crisp',
  },
  {
    label: 'Merriweather',
    value: '"Merriweather", Georgia, serif',
    preview: 'Readable serif body',
  },
  {
    label: 'Playfair Display',
    value: '"Playfair Display", Georgia, serif',
    preview: 'Elegant headline serif',
  },
  {
    label: 'Georgia',
    value: 'Georgia, "Times New Roman", serif',
    preview: 'Classic editorial serif',
  },
  {
    label: 'Trebuchet',
    value: '"Trebuchet MS", Verdana, sans-serif',
    preview: 'Retro web sans',
  },
  {
    label: 'Tahoma',
    value: 'Tahoma, Verdana, sans-serif',
    preview: 'Compact UI sans',
  },
  {
    label: 'Fira Sans',
    value: '"Fira Sans", "Segoe UI", sans-serif',
    preview: 'Tech-friendly sans',
  },
  {
    label: 'Baloo 2',
    value: '"Baloo 2", "Trebuchet MS", "Segoe UI", sans-serif',
    preview: 'Rounded citrus brand feel',
  },
  {
    label: 'Fredoka',
    value: '"Fredoka", "Trebuchet MS", "Segoe UI", sans-serif',
    preview: 'Playful rounded sans',
  },
  {
    label: 'Quicksand',
    value: '"Quicksand", "Trebuchet MS", "Segoe UI", sans-serif',
    preview: 'Soft geometric sans',
  },
  {
    label: 'JetBrains Mono',
    value: '"JetBrains Mono", Consolas, monospace',
    preview: 'Monospace interface',
  },
];

const HEADING_FONT_PRESET_OPTIONS: FontPresetOption[] = [
  {
    label: 'Bebas Neue',
    value: '"Bebas Neue", Impact, "Arial Narrow", sans-serif',
    preview: 'BOLD CONDENSED DISPLAY',
  },
  {
    label: 'Anton',
    value: '"Anton", Impact, sans-serif',
    preview: 'ULTRA BOLD HEADLINE',
  },
  {
    label: 'Oswald',
    value: '"Oswald", "Arial Narrow", sans-serif',
    preview: 'CONDENSED MODERN',
  },
  {
    label: 'Teko',
    value: '"Teko", "Arial Narrow", sans-serif',
    preview: 'TALL CONDENSED',
  },
  {
    label: 'Barlow Condensed',
    value: '"Barlow Condensed", "Arial Narrow", sans-serif',
    preview: 'CLEAN CONDENSED',
  },
  {
    label: 'Luckiest Guy',
    value: '"Luckiest Guy", "Bebas Neue", "Impact", sans-serif',
    preview: 'PLAYFUL POP DISPLAY',
  },
  {
    label: 'Bangers',
    value: '"Bangers", "Impact", "Arial Narrow", sans-serif',
    preview: 'COMIC BURST DISPLAY',
  },
  {
    label: 'Press Start 2P',
    value: '"Press Start 2P", "Lucida Console", "Courier New", monospace',
    preview: 'PIXEL ARCADE DISPLAY',
  },
  {
    label: 'Silkscreen',
    value: '"Silkscreen", "Lucida Console", "Courier New", monospace',
    preview: 'RETRO PIXEL LABEL',
  },
  {
    label: 'VT323',
    value: '"VT323", "Lucida Console", "Courier New", monospace',
    preview: 'TERMINAL PIXEL HEADING',
  },
  {
    label: 'Righteous',
    value: '"Righteous", "Trebuchet MS", "Segoe UI", sans-serif',
    preview: 'CURVED RETRO LOGOTYPE',
  },
  {
    label: 'Archivo Black',
    value: '"Archivo Black", "Arial Black", "Impact", sans-serif',
    preview: 'HEAVY LABEL HEADLINE',
  },
  {
    label: 'Montserrat',
    value: '"Montserrat", "Segoe UI", sans-serif',
    preview: 'Bold Geometric',
  },
  {
    label: 'Poppins',
    value: '"Poppins", "Segoe UI", sans-serif',
    preview: 'Modern Rounded',
  },
  {
    label: 'Impact',
    value: 'Impact, "Arial Narrow", "Helvetica Neue", sans-serif',
    preview: 'CLASSIC BOLD SYSTEM',
  },
  {
    label: 'Playfair Display',
    value: '"Playfair Display", Georgia, serif',
    preview: 'Elegant Serif Headline',
  },
];

const THEME_LABELS: Record<UiTheme, string> = {
  light: 'Light',
  windows95: 'Windows 95',
  slate: 'Slate',
  sparkle: 'Sparkle',
  douala: 'Douala',
  colordore: 'Colordore',
  pc98: 'PC-98',
  retromarket: 'Retro Market',
};

const BACKGROUND_POSITION_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top left', label: 'Top Left' },
  { value: 'top right', label: 'Top Right' },
  { value: 'bottom left', label: 'Bottom Left' },
  { value: 'bottom right', label: 'Bottom Right' },
] as const;

const ICON_FALLBACKS: Record<SkinIconName, LucideIcon> = {
  'nav-home': Home,
  'nav-timeline': Calendar,
  'nav-projects': FolderKanban,
  'nav-boards': LayoutGrid,
  'nav-organization': Building2,
  'nav-teams': Users,
  'nav-users': User,
  'nav-settings': Settings,
  'toggle-light': Sun,
  'toggle-windows95': Monitor,
  'toggle-slate': Palette,
  'toggle-sparkle': Sparkles,
  'toggle-douala': Flame,
  'toggle-colordore': Monitor,
  'toggle-pc98': Gamepad2,
  'toggle-retromarket': BarChart3,
  'ornament-star': Star,
  'ornament-heart': Heart,
  'ornament-moon': Moon,
};

function createIconFlagMap(enabled: boolean): Record<SkinIconName, boolean> {
  const map = {} as Record<SkinIconName, boolean>;
  for (const iconName of SKIN_ICON_NAMES) {
    map[iconName] = enabled;
  }
  return map;
}

function createThemeBooleanMap(defaultValue: boolean): Record<UiTheme, boolean> {
  return UI_THEMES.reduce((map, theme) => {
    map[theme] = defaultValue;
    return map;
  }, {} as Record<UiTheme, boolean>);
}

function getIconRecommendation(iconName: SkinIconName): string {
  if (iconName.startsWith('ornament-')) {
    return 'Suggested: 24x24 PNG/WebP, transparent, under 30KB.';
  }
  return 'Suggested: 24x24 (or 32x32) PNG/WebP, transparent, under 50KB.';
}

function formatIconLabel(iconName: SkinIconName): string {
  return iconName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function SkinsSettingsClient() {
  const [activeTheme, setActiveTheme] = useState<UiTheme>('windows95');
  const [config, setConfig] = useState<SkinAssetsConfig>(() => createDefaultSkinAssetsConfig());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [logoPreviewError, setLogoPreviewError] = useState<Record<UiTheme, boolean>>(
    createThemeBooleanMap(false)
  );
  const [fontPickerOpen, setFontPickerOpen] = useState<Record<UiTheme, boolean>>(
    createThemeBooleanMap(false)
  );
  const [headingFontPickerOpen, setHeadingFontPickerOpen] = useState<Record<UiTheme, boolean>>(
    createThemeBooleanMap(false)
  );
  const [logoUploading, setLogoUploading] = useState<Record<UiTheme, boolean>>(createThemeBooleanMap(false));
  const [backgroundUploading, setBackgroundUploading] = useState<Record<UiTheme, boolean>>(
    createThemeBooleanMap(false)
  );
  const [iconUploading, setIconUploading] = useState<Record<string, boolean>>({});

  const loadConfig = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/settings/skins', { cache: 'no-store' });
      const payload = (await response.json()) as ApiEnvelope<SkinSettingsApiData>;
      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to load skin settings');
      }

      const normalized = normalizeSkinAssetsConfig(payload.data.config);
      setConfig(normalized);
      if (payload.data.updatedAt) {
        const parsedTime = new Date(payload.data.updatedAt).getTime();
        setSavedAt(Number.isNaN(parsedTime) ? Date.now() : parsedTime);
      } else {
        setSavedAt(null);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load skin settings');
      setConfig(createDefaultSkinAssetsConfig());
      setSavedAt(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const setThemeAssets = (theme: UiTheme, updater: (prev: ThemeSkinAssets) => ThemeSkinAssets) => {
    setConfig((prev) => ({
      ...prev,
      [theme]: updater(prev[theme]),
    }));
  };

  const setThemeField = <K extends keyof ThemeSkinAssets>(
    theme: UiTheme,
    field: K,
    value: ThemeSkinAssets[K]
  ) => {
    setThemeAssets(theme, (prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const setThemeIconFlag = (theme: UiTheme, iconName: SkinIconName, enabled: boolean) => {
    setThemeAssets(theme, (prev) => ({
      ...prev,
      iconEnabled: {
        ...prev.iconEnabled,
        [iconName]: enabled,
      },
    }));
  };

  const setAllIconFlags = (theme: UiTheme, enabled: boolean) => {
    setThemeAssets(theme, (prev) => ({
      ...prev,
      iconEnabled: createIconFlagMap(enabled),
    }));
  };

  const setFontPopoverOpen = (theme: UiTheme, open: boolean) => {
    setFontPickerOpen((prev) => ({
      ...prev,
      [theme]: open,
    }));
  };

  const setHeadingFontPopoverOpen = (theme: UiTheme, open: boolean) => {
    setHeadingFontPickerOpen((prev) => ({
      ...prev,
      [theme]: open,
    }));
  };

  const setIconUploadingState = (theme: UiTheme, iconName: SkinIconName, uploading: boolean) => {
    const key = `${theme}:${iconName}`;
    setIconUploading((prev) => ({
      ...prev,
      [key]: uploading,
    }));
  };

  const isIconUploading = (theme: UiTheme, iconName: SkinIconName): boolean =>
    Boolean(iconUploading[`${theme}:${iconName}`]);

  const uploadImageFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'image');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json()) as ApiEnvelope<{
      url: string;
      name: string;
      type: string;
      size: number;
    }>;

    if (!payload.success || !payload.data?.url) {
      alert(payload.error?.message || 'Upload failed');
      return null;
    }

    return payload.data.url;
  };

  const handleThemeAssetUpload = async (
    theme: UiTheme,
    field: 'logoPath' | 'backgroundPath',
    file: File | null
  ) => {
    if (!file) return;

    if (field === 'logoPath') {
      setLogoUploading((prev) => ({ ...prev, [theme]: true }));
    } else {
      setBackgroundUploading((prev) => ({ ...prev, [theme]: true }));
    }

    try {
      const uploadedUrl = await uploadImageFile(file);
      if (!uploadedUrl) return;

      setThemeField(theme, field, uploadedUrl);
      if (field === 'logoPath') {
        setThemeField(theme, 'logoEnabled', true);
        setLogoPreviewError((prev) => ({ ...prev, [theme]: false }));
      } else {
        setThemeField(theme, 'backgroundEnabled', true);
      }
    } finally {
      if (field === 'logoPath') {
        setLogoUploading((prev) => ({ ...prev, [theme]: false }));
      } else {
        setBackgroundUploading((prev) => ({ ...prev, [theme]: false }));
      }
    }
  };

  const handleIconUpload = async (theme: UiTheme, iconName: SkinIconName, file: File | null) => {
    if (!file) return;
    setIconUploadingState(theme, iconName, true);
    try {
      const uploadedUrl = await uploadImageFile(file);
      if (!uploadedUrl) return;
      setThemeAssets(theme, (prev) => ({
        ...prev,
        iconEnabled: {
          ...prev.iconEnabled,
          [iconName]: true,
        },
        iconPath: {
          ...prev.iconPath,
          [iconName]: uploadedUrl,
        },
      }));
    } finally {
      setIconUploadingState(theme, iconName, false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/skins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const payload = (await response.json()) as ApiEnvelope<SkinSettingsApiData>;
      if (!payload.success || !payload.data) {
        alert(payload.error?.message || 'Failed to save skin settings');
        return;
      }

      const normalized = normalizeSkinAssetsConfig(payload.data.config);
      setConfig(normalized);
      broadcastSkinAssetsConfigChanged(normalized);

      if (payload.data.updatedAt) {
        const parsedTime = new Date(payload.data.updatedAt).getTime();
        setSavedAt(Number.isNaN(parsedTime) ? Date.now() : parsedTime);
      } else {
        setSavedAt(Date.now());
      }
    } catch {
      alert('Failed to save skin settings');
    } finally {
      setIsSaving(false);
    }
  };

  const resetTheme = (theme: UiTheme) => {
    setThemeAssets(theme, () => createDefaultThemeSkinAssets(theme));
    setLogoPreviewError((prev) => ({ ...prev, [theme]: false }));
    setFontPopoverOpen(theme, false);
    setHeadingFontPopoverOpen(theme, false);
  };

  const resetAll = () => {
    setConfig(createDefaultSkinAssetsConfig());
    setSavedAt(null);
    setLogoPreviewError(createThemeBooleanMap(false));
    setFontPickerOpen(createThemeBooleanMap(false));
    setHeadingFontPickerOpen(createThemeBooleanMap(false));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading skin settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 skins-settings-root">
      <div className="flex flex-wrap items-start justify-between gap-4 skins-settings-header">
        <div className="space-y-1">
          <h2 className="text-heading font-semibold">Skins</h2>
          <p className="text-sm text-text-secondary">
            Settings are stored server-side and applied for all users. Defaults stay active until custom assets are
            enabled.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => resetTheme(activeTheme)} disabled={isSaving}>
            Reset Theme
          </Button>
          <Button variant="outline" onClick={resetAll} disabled={isSaving}>
            Reset All
          </Button>
          <Button onClick={saveConfig} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
          <div>{loadError}</div>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void loadConfig()} disabled={isSaving}>
            Retry
          </Button>
        </div>
      )}

      <div className="text-xs text-text-tertiary">
        {savedAt
          ? `Last saved at ${new Date(savedAt).toLocaleTimeString()}`
          : 'Changes are not saved yet. Click "Save Changes" to publish globally.'}
      </div>

      <Tabs value={activeTheme} onValueChange={(value) => setActiveTheme(value as UiTheme)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-3 xl:grid-cols-7 win95-tabs-list">
          {UI_THEMES.map((theme) => (
            <TabsTrigger key={theme} value={theme}>
              {THEME_LABELS[theme]}
            </TabsTrigger>
          ))}
        </TabsList>

        {UI_THEMES.map((theme) => {
          const themeAssets = config[theme];
          const themeLogoError = logoPreviewError[theme];
          const hasValidLogoPath = isSupportedAssetPath(themeAssets.logoPath);
          const showLogoPreview = themeAssets.logoEnabled && hasValidLogoPath && !themeLogoError;
          const previewBackground =
            themeAssets.backgroundEnabled && themeAssets.backgroundPath.trim()
              ? `url("${themeAssets.backgroundPath.trim()}")`
              : 'none';
          const selectedFontOption = FONT_PRESET_OPTIONS.find(
            (option) => option.value === themeAssets.fontFamily.trim()
          );
          const selectedHeadingFontOption = HEADING_FONT_PRESET_OPTIONS.find(
            (option) => option.value === themeAssets.headingFontFamily.trim()
          );
          const selectedBackgroundPosition = BACKGROUND_POSITION_OPTIONS.some(
            (option) => option.value === themeAssets.backgroundPosition
          )
            ? themeAssets.backgroundPosition
            : 'center';

          return (
            <TabsContent key={theme} value={theme} className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
                <div className="flex flex-col gap-4">
                  <section className="order-1 rounded-md border border-border bg-surface p-4 space-y-3 win95-section">
                    <div className="flex flex-wrap items-center justify-between gap-3 win95-section-header">
                  <div>
                    <h3 className="text-sm font-semibold">Logo</h3>
                    <p className="text-xs text-text-secondary">Appears left of Home in the top header.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`logo-enabled-${theme}`} className="text-xs">
                      Use custom logo
                    </Label>
                    <Switch
                      id={`logo-enabled-${theme}`}
                      checked={themeAssets.logoEnabled}
                      onCheckedChange={(checked) => setThemeField(theme, 'logoEnabled', checked)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-1">
                    <p className="text-xs text-text-tertiary">
                      Suggested: transparent PNG/WebP around 240x72 (renders at ~24px height), under 200KB.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="h-9 flex-1 min-w-[220px]"
                        disabled={isSaving || logoUploading[theme]}
                        onChange={(event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0] ?? null;
                          void handleThemeAssetUpload(theme, 'logoPath', file).finally(() => {
                            input.value = '';
                          });
                        }}
                      />
                      {logoUploading[theme] ? (
                        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                      ) : (
                        <Upload className="h-4 w-4 text-text-tertiary" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!themeAssets.logoPath.trim()}
                        onClick={() => {
                          setThemeField(theme, 'logoPath', '');
                          setThemeField(theme, 'logoEnabled', false);
                          setLogoPreviewError((prev) => ({ ...prev, [theme]: false }));
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      {themeAssets.logoPath.trim() ? 'Custom logo uploaded.' : 'No custom logo uploaded yet.'}
                    </p>
                  </div>
                  <div className="flex h-10 min-w-[120px] items-center justify-center rounded-md border border-border bg-surface-subtle px-3">
                    {showLogoPreview ? (
                      <Image
                        src={themeAssets.logoPath.trim()}
                        alt={`${THEME_LABELS[theme]} logo preview`}
                        width={100}
                        height={24}
                        unoptimized
                        className="h-6 w-auto object-contain"
                        onError={() => setLogoPreviewError((prev) => ({ ...prev, [theme]: true }))}
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-text-tertiary">PP</span>
                    )}
                  </div>
                </div>
                  </section>

                  <section className="order-4 rounded-md border border-border bg-surface p-4 space-y-3 win95-section">
                <div className="flex flex-wrap items-center justify-between gap-3 win95-section-header">
                  <div>
                    <h3 className="text-sm font-semibold">Background</h3>
                    <p className="text-xs text-text-secondary">Shown behind dashboard pages when enabled.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`bg-enabled-${theme}`} className="text-xs">
                      Use custom background
                    </Label>
                    <Switch
                      id={`bg-enabled-${theme}`}
                      checked={themeAssets.backgroundEnabled}
                      onCheckedChange={(checked) => setThemeField(theme, 'backgroundEnabled', checked)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-text-tertiary">
                      Suggested: 1920x1080+ (16:9), JPG/WebP, under 2MB.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="h-9 flex-1 min-w-[220px]"
                        disabled={isSaving || backgroundUploading[theme]}
                        onChange={(event) => {
                          const input = event.currentTarget;
                          const file = input.files?.[0] ?? null;
                          void handleThemeAssetUpload(theme, 'backgroundPath', file).finally(() => {
                            input.value = '';
                          });
                        }}
                      />
                      {backgroundUploading[theme] ? (
                        <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                      ) : (
                        <Upload className="h-4 w-4 text-text-tertiary" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!themeAssets.backgroundPath.trim()}
                        onClick={() => {
                          setThemeField(theme, 'backgroundPath', '');
                          setThemeField(theme, 'backgroundEnabled', false);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      {themeAssets.backgroundPath.trim()
                        ? 'Custom background uploaded.'
                        : 'No custom background uploaded yet.'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`bg-overlay-${theme}`}>Overlay tint</Label>
                    <Input
                      id={`bg-overlay-${theme}`}
                      value={themeAssets.backgroundOverlay}
                      placeholder="transparent"
                      onChange={(event) => setThemeField(theme, 'backgroundOverlay', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`bg-pos-${theme}`}>Background position</Label>
                    <Select
                      value={selectedBackgroundPosition}
                      onValueChange={(value) => setThemeField(theme, 'backgroundPosition', value)}
                    >
                      <SelectTrigger id={`bg-pos-${theme}`}>
                        <SelectValue placeholder="Select background position" />
                      </SelectTrigger>
                      <SelectContent>
                        {BACKGROUND_POSITION_OPTIONS.map((option) => (
                          <SelectItem key={`${theme}-bg-pos-${option.value}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="relative h-28 overflow-hidden rounded-md border border-border-subtle bg-surface-subtle win95-inset">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: previewBackground,
                      backgroundSize: 'cover',
                      backgroundPosition: selectedBackgroundPosition,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: themeAssets.backgroundEnabled ? themeAssets.backgroundOverlay : 'transparent' }}
                  />
                  <div className="relative z-10 flex h-full items-end p-3 text-xs text-text-secondary">
                    {themeAssets.backgroundEnabled ? 'Background enabled' : 'Background disabled'}
                  </div>
                </div>
              </section>

                  <section className="order-3 rounded-md border border-border bg-surface p-4 space-y-3 win95-section">
                <div className="flex flex-wrap items-center justify-between gap-3 win95-section-header">
                  <div>
                    <h3 className="text-sm font-semibold">Body Font</h3>
                    <p className="text-xs text-text-secondary">Font stack for body text and UI elements.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`font-enabled-${theme}`} className="text-xs">
                      Use custom font
                    </Label>
                    <Switch
                      id={`font-enabled-${theme}`}
                      checked={themeAssets.fontEnabled}
                      onCheckedChange={(checked) => setThemeField(theme, 'fontEnabled', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Font preset</Label>
                  <Popover open={fontPickerOpen[theme]} onOpenChange={(open) => setFontPopoverOpen(theme, open)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={fontPickerOpen[theme]}
                        className="w-full justify-between"
                      >
                        <span className="truncate text-left">
                          {selectedFontOption
                            ? selectedFontOption.label
                            : 'Search font presets and select one...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search fonts..." />
                        <CommandList>
                          <CommandEmpty>No fonts found.</CommandEmpty>
                          <CommandGroup>
                            {FONT_PRESET_OPTIONS.map((option) => {
                              const isSelected = option.value === themeAssets.fontFamily.trim();
                              return (
                                <CommandItem
                                  key={`${theme}-${option.label}`}
                                  value={`${option.label} ${option.value}`}
                                  onSelect={() => {
                                    setThemeField(theme, 'fontFamily', option.value);
                                    setThemeField(theme, 'fontEnabled', true);
                                    setFontPopoverOpen(theme, false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate">{option.label}</span>
                                    <span
                                      className="text-xs text-text-tertiary truncate"
                                      style={{ fontFamily: option.value }}
                                    >
                                      {option.preview}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`font-family-${theme}`}>Font family</Label>
                  <Input
                    id={`font-family-${theme}`}
                    value={themeAssets.fontFamily}
                    placeholder="'Inter', 'Segoe UI', sans-serif"
                    onChange={(event) => setThemeField(theme, 'fontFamily', event.target.value)}
                  />
                </div>

                <div className="rounded-md border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary win95-inset">
                  <div
                    className="text-sm text-text-primary"
                    style={{
                      fontFamily:
                        themeAssets.fontEnabled && themeAssets.fontFamily.trim()
                          ? themeAssets.fontFamily.trim()
                          : undefined,
                    }}
                  >
                    The quick brown fox jumps over the lazy dog.
                  </div>
                  <div className="mt-1 text-xs">
                    {themeAssets.fontEnabled ? 'Custom font enabled' : 'Custom font disabled'}
                  </div>
                </div>
              </section>

                  <section className="order-2 rounded-md border border-border bg-surface p-4 space-y-3 win95-section">
                <div className="flex flex-wrap items-center justify-between gap-3 win95-section-header">
                  <div>
                    <h3 className="text-sm font-semibold">Heading Font</h3>
                    <p className="text-xs text-text-secondary">
                      Separate font for h1-h6 headings. Falls back to body font when disabled.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`heading-font-enabled-${theme}`} className="text-xs">
                      Use heading font
                    </Label>
                    <Switch
                      id={`heading-font-enabled-${theme}`}
                      checked={themeAssets.headingFontEnabled}
                      onCheckedChange={(checked) => setThemeField(theme, 'headingFontEnabled', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Heading font preset</Label>
                  <Popover
                    open={headingFontPickerOpen[theme]}
                    onOpenChange={(open) => setHeadingFontPopoverOpen(theme, open)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={headingFontPickerOpen[theme]}
                        className="w-full justify-between"
                      >
                        <span className="truncate text-left">
                          {selectedHeadingFontOption
                            ? selectedHeadingFontOption.label
                            : 'Search heading font presets...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search heading fonts..." />
                        <CommandList>
                          <CommandEmpty>No fonts found.</CommandEmpty>
                          <CommandGroup>
                            {HEADING_FONT_PRESET_OPTIONS.map((option) => {
                              const isSelected = option.value === themeAssets.headingFontFamily.trim();
                              return (
                                <CommandItem
                                  key={`${theme}-heading-${option.label}`}
                                  value={`${option.label} ${option.value}`}
                                  onSelect={() => {
                                    setThemeField(theme, 'headingFontFamily', option.value);
                                    setThemeField(theme, 'headingFontEnabled', true);
                                    setHeadingFontPopoverOpen(theme, false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate">{option.label}</span>
                                    <span
                                      className="text-xs text-text-tertiary truncate"
                                      style={{ fontFamily: option.value }}
                                    >
                                      {option.preview}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`heading-font-family-${theme}`}>Heading font family</Label>
                  <Input
                    id={`heading-font-family-${theme}`}
                    value={themeAssets.headingFontFamily}
                    placeholder='"Bebas Neue", Impact, sans-serif'
                    onChange={(event) => setThemeField(theme, 'headingFontFamily', event.target.value)}
                  />
                </div>

                <div className="rounded-md border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary win95-inset">
                  <div
                    className="text-lg font-bold text-text-primary"
                    style={{
                      fontFamily:
                        themeAssets.headingFontEnabled && themeAssets.headingFontFamily.trim()
                          ? themeAssets.headingFontFamily.trim()
                          : undefined,
                    }}
                  >
                    Heading Font Preview
                  </div>
                  <div className="mt-1 text-xs">
                    {themeAssets.headingFontEnabled ? 'Heading font enabled' : 'Heading font disabled (using body font)'}
                  </div>
                </div>
              </section>
                </div>

                <div className="flex flex-col gap-4">
                  <section className="rounded-md border border-border bg-surface p-4 space-y-3 win95-section">
                <div className="flex flex-wrap items-center justify-between gap-3 win95-section-header">
                  <div>
                    <h3 className="text-sm font-semibold">Icons</h3>
                    <p className="text-xs text-text-secondary">Left preview: default icon. Right preview: custom icon.</p>
                    <p className="text-xs text-text-tertiary">
                      Nav and toggle icons: 24x24 (or 32x32) transparent PNG/WebP. Ornaments: 24x24 transparent PNG/WebP.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAllIconFlags(theme, false)}>
                      Disable all custom
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAllIconFlags(theme, true)}>
                      Enable all custom
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {SKIN_ICON_NAMES.map((iconName) => {
                    const FallbackIcon = ICON_FALLBACKS[iconName];
                    return (
                      <div
                        key={`${theme}-${iconName}`}
                        className="flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-surface-subtle px-3 py-2 win95-row"
                      >
                        <div className="min-w-[210px] text-xs">
                          <div className="font-medium text-text-primary">{formatIconLabel(iconName)}</div>
                          <div className="text-text-tertiary">Key: {iconName}</div>
                          <div className="text-text-tertiary">{getIconRecommendation(iconName)}</div>
                        </div>

                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface win95-icon-cell">
                          <FallbackIcon className="h-4 w-4" />
                        </span>

                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface win95-icon-cell">
                          <ThemeIcon
                            theme={theme}
                            iconName={iconName}
                            fallback={FallbackIcon}
                            useCustom
                            customSrc={themeAssets.iconPath[iconName]}
                            className="h-4 w-4"
                          />
                        </span>

                        <div className="w-full md:w-auto md:min-w-[280px] flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="h-8 flex-1"
                              disabled={isSaving || isIconUploading(theme, iconName)}
                              onChange={(event) => {
                                const input = event.currentTarget;
                                const file = input.files?.[0] ?? null;
                                void handleIconUpload(theme, iconName, file).finally(() => {
                                  input.value = '';
                                });
                              }}
                            />
                            {isIconUploading(theme, iconName) ? (
                              <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                            ) : (
                              <Upload className="h-4 w-4 text-text-tertiary" />
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!themeAssets.iconPath[iconName]?.trim()}
                              onClick={() =>
                                setThemeAssets(theme, (prev) => ({
                                  ...prev,
                                  iconPath: {
                                    ...prev.iconPath,
                                    [iconName]: '',
                                  },
                                  iconEnabled: {
                                    ...prev.iconEnabled,
                                    [iconName]: false,
                                  },
                                }))
                              }
                            >
                              Clear
                            </Button>
                          </div>
                          <div className="text-xs text-text-tertiary">
                            {themeAssets.iconPath[iconName]?.trim()
                              ? 'Custom icon uploaded.'
                              : 'No custom icon uploaded yet.'}
                          </div>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <Label htmlFor={`${theme}-${iconName}-enabled`} className="text-xs">
                            Use custom
                          </Label>
                          <Switch
                            id={`${theme}-${iconName}-enabled`}
                            checked={themeAssets.iconEnabled[iconName]}
                            onCheckedChange={(checked) => setThemeIconFlag(theme, iconName, checked)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </section>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
