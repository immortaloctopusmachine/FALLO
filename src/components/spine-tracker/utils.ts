import type {
  Skeleton,
  Animation,
  SkeletonPlacement,
  SpineTrackerState,
  SpineChange,
  ChangelogResult,
} from '@/types/spine-tracker';

// ============== AUTO-CATEGORIZATION ==============

/** Determine the appropriate group for a skeleton based on its name */
export function getGroupForSkeleton(name: string): string {
  const upper = name.toUpperCase();
  if (
    upper.includes('ALIEN_') ||
    upper.includes('ITEM_') ||
    upper.includes('WEAPON_DROP') ||
    upper.includes('PARTICLE_BLOOD')
  )
    return 'symbols';
  if (
    upper.includes('GUI_') ||
    upper.includes('BUTTON') ||
    upper.includes('MENU') ||
    upper.includes('HUD') ||
    upper.includes('SPIN_') ||
    upper.includes('SLIDER') ||
    upper.includes('TOGGLE')
  )
    return 'ui';
  if (
    upper.includes('PLAYER') ||
    upper.includes('WEAPON_') ||
    upper.includes('MOTHERSHIP') ||
    upper.includes('MUZZLE')
  )
    return 'characters';
  if (
    upper.includes('PARTICLE_') ||
    upper.includes('EFFECT') ||
    upper.includes('WIN') ||
    upper.includes('FLASH') ||
    upper.includes('SHIELD')
  )
    return 'other';
  if (
    upper.includes('SCREEN') ||
    upper.includes('LOADING') ||
    upper.includes('START') ||
    upper.includes('END') ||
    upper.includes('FEATURE')
  )
    return 'screens';
  if (upper.includes('LAYOUT') || upper.includes('BACKGROUND')) return 'layout';
  return 'other';
}

// ============== PLACEMENT PARSING ==============

/** Parse a placement string (from markdown format) into structured data */
export function parsePlacement(placementStr: string | null): SkeletonPlacement {
  if (!placementStr || placementStr === 'standalone' || placementStr.includes('standalone')) {
    return { parent: null, bone: null, notes: placementStr || 'Standalone' };
  }
  if (placementStr === 'dynamic') {
    return { parent: null, bone: null, notes: 'Dynamic placement' };
  }
  const parts = placementStr.includes('->')
    ? placementStr.split('->')
    : placementStr.split('→');
  if (parts.length === 2) {
    return { parent: parts[0].trim(), bone: parts[1].trim(), notes: '' };
  }
  return { parent: null, bone: null, notes: placementStr };
}

// ============== SKELETON FACTORY ==============

/** Create a new empty skeleton with defaults */
export function createSkeleton(overrides: Partial<Skeleton> = {}): Skeleton {
  return {
    id: `skeleton_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: 'NEW_SKELETON',
    status: 'planned',
    zOrder: 100,
    group: 'other',
    isGeneric: false,
    description: '',
    placement: { parent: null, bone: null, notes: '' },
    targetBone: '',
    animations: [{ name: 'idle', status: 'planned', track: 0, targetBone: '', notes: '', soundFx: [] }],
    skins: [],
    events: [],
    previewImageDataUrl: null,
    connectedTasks: [],
    generalNotes: '',
    ...overrides,
  };
}

/** Create a new empty animation */
export function createAnimation(overrides: Partial<Animation> = {}): Animation {
  return {
    name: 'new_anim',
    status: 'planned',
    track: 0,
    notes: '',
    soundFx: [],
    ...overrides,
  };
}

/** Create the default empty state for a new Spine Tracker */
export function createEmptyState(projectName: string = 'Untitled Project'): SpineTrackerState {
  return {
    skeletons: [],
    customGroups: {},
    groupOrder: ['symbols', 'ui', 'characters', 'screens', 'layout', 'other'],
    projectName,
    baseline: null,
  };
}

// ============== CHANGE TRACKING ==============

/** Generate a changelog comparing current state to a baseline snapshot */
export function generateChangelog(
  current: SpineTrackerState,
  baseline: { skeletons: Skeleton[] } | null
): ChangelogResult {
  if (!baseline) {
    return { hasChanges: false, changes: [] };
  }

  const changes: SpineChange[] = [];
  const baseSkeletonMap = new Map(baseline.skeletons.map((s) => [s.id, s]));
  const currentSkeletonMap = new Map(current.skeletons.map((s) => [s.id, s]));

  // Check for new skeletons
  current.skeletons.forEach((skeleton) => {
    if (!baseSkeletonMap.has(skeleton.id)) {
      changes.push({
        type: 'added',
        skeleton: skeleton.name,
        detail: `New skeleton added (${skeleton.status})`,
      });
    }
  });

  // Check for removed skeletons
  baseline.skeletons.forEach((skeleton) => {
    if (!currentSkeletonMap.has(skeleton.id)) {
      changes.push({
        type: 'removed',
        skeleton: skeleton.name,
        detail: 'Skeleton removed',
      });
    }
  });

  // Check for modified skeletons
  current.skeletons.forEach((skeleton) => {
    const base = baseSkeletonMap.get(skeleton.id);
    if (!base) return;

    // Status change
    if (skeleton.status !== base.status) {
      changes.push({
        type: 'modified',
        skeleton: skeleton.name,
        detail: `Status: ${base.status} → ${skeleton.status}`,
      });
    }

    // New animations
    const baseAnimNames = new Set(base.animations.map((a) => a.name));
    skeleton.animations.forEach((anim) => {
      if (!baseAnimNames.has(anim.name)) {
        changes.push({
          type: 'modified',
          skeleton: skeleton.name,
          detail: `New animation: ${anim.name}`,
        });
      }
    });

    // Animation status changes
    skeleton.animations.forEach((anim) => {
      const baseAnim = base.animations.find((a) => a.name === anim.name);
      if (baseAnim && baseAnim.status !== anim.status) {
        changes.push({
          type: 'modified',
          skeleton: skeleton.name,
          detail: `Animation '${anim.name}': ${baseAnim.status} → ${anim.status}`,
        });
      }
    });

    // Sound FX changes
    skeleton.animations.forEach((anim) => {
      const baseAnim = base.animations.find((a) => a.name === anim.name);
      if (baseAnim) {
        const baseSfx = baseAnim.soundFx || [];
        const currentSfx = anim.soundFx || [];
        if (currentSfx.length > baseSfx.length) {
          const diff = currentSfx.length - baseSfx.length;
          changes.push({
            type: 'modified',
            skeleton: skeleton.name,
            detail: `Animation '${anim.name}': Added ${diff} sound effect${diff > 1 ? 's' : ''}`,
          });
        }
        if (currentSfx.length < baseSfx.length) {
          const diff = baseSfx.length - currentSfx.length;
          changes.push({
            type: 'modified',
            skeleton: skeleton.name,
            detail: `Animation '${anim.name}': Removed ${diff} sound effect${diff > 1 ? 's' : ''}`,
          });
        }
      }
    });
  });

  return { hasChanges: changes.length > 0, changes };
}

// ============== EXPORT FORMATTERS ==============

/** Format the full spine tracker state as markdown documentation */
export function exportAsMarkdown(state: SpineTrackerState): string {
  let md = `# Spine Asset Tracker — ${state.projectName}\n\n`;
  md += `## Important Notes\n\n- **DESKTOP/SPINE_ASSETS is the source of truth**\n- Mobile and Desktop must have identical file names\n\n`;
  md += `## Skeleton Index\n\n| Skeleton | Status | Z-Order | Placement | Notes |\n|----------|--------|---------|-----------|-------|\n`;

  const sorted = [...state.skeletons].sort((a, b) => a.zOrder - b.zOrder);
  sorted.forEach((s) => {
    const placement = s.placement.parent
      ? `${s.placement.parent}->${s.placement.bone || '?'}`
      : 'standalone';
    md += `| ${s.name} | \`${s.status}\` | ${s.zOrder} | ${placement} | ${s.description || '-'} |\n`;
  });

  md += `\n---\n\n## Skeleton Details\n\n`;
  sorted.forEach((s) => {
    md += `### ${s.name}\n\n`;
    md += `**Status**: \`${s.status}\`\n**Z-Order**: ${s.zOrder}\n\n`;
    md += `**Description**: ${s.description || '-'}\n\n`;
    md += `**Placement**:\n| Property | Value |\n|----------|-------|\n`;
    md += `| Skeleton | ${s.placement.parent || 'none (standalone)'} |\n`;
    md += `| Target Bone | ${s.placement.bone || 'none'} |\n`;
    md += `| Notes | ${s.placement.notes || '-'} |\n\n`;

    md += `#### Animations\n\n| Animation | Status | Track | Notes |\n|-----------|--------|-------|-------|\n`;
    s.animations.forEach((a) => {
      md += `| \`${a.name}\` | \`${a.status}\` | ${a.track} | ${a.notes || '-'} |\n`;
      if (a.soundFx && a.soundFx.length > 0) {
        md += `\n**Sound FX for \`${a.name}\`:**\n\n| File | Trigger | Volume | Notes |\n|------|---------|--------|-------|\n`;
        a.soundFx.forEach((sfx) => {
          md += `| ${sfx.file} | ${sfx.trigger} | ${sfx.volume} | ${sfx.notes || '-'} |\n`;
        });
        md += `\n`;
      }
    });

    if (s.skins.length) {
      md += `\n#### Skins\n\n| Skin | Status | Notes |\n|------|--------|-------|\n`;
      s.skins.forEach((sk) => {
        md += `| \`${sk.name}\` | \`${sk.status}\` | ${sk.notes || '-'} |\n`;
      });
    }

    if (s.events.length) {
      md += `\n#### Events\n\n| Event | Animation | Notes |\n|-------|-----------|-------|\n`;
      s.events.forEach((e) => {
        md += `| \`${e.name}\` | ${e.animation || '-'} | ${e.notes || '-'} |\n`;
      });
    }

    if (s.generalNotes) md += `\n#### Notes\n\n${s.generalNotes}\n`;
    md += `\n---\n\n`;
  });

  return md;
}

/** Format changelog as markdown for export */
export function exportChangelogAsMarkdown(changelog: ChangelogResult): string {
  if (!changelog.hasChanges) return '';

  let md = `# Spine Asset Changes\n\n`;
  md += `**Generated**: ${new Date().toLocaleString()}\n`;
  md += `**Changes**: ${changelog.changes.length}\n\n`;

  const added = changelog.changes.filter((c) => c.type === 'added');
  const modified = changelog.changes.filter((c) => c.type === 'modified');
  const removed = changelog.changes.filter((c) => c.type === 'removed');

  if (added.length > 0) {
    md += `## New Skeletons\n\n`;
    added.forEach((c) => {
      md += `- **${c.skeleton}**: ${c.detail}\n`;
    });
    md += `\n`;
  }

  if (modified.length > 0) {
    md += `## Modified Skeletons\n\n`;
    const grouped: Record<string, string[]> = {};
    modified.forEach((c) => {
      if (!grouped[c.skeleton]) grouped[c.skeleton] = [];
      grouped[c.skeleton].push(c.detail);
    });
    Object.entries(grouped).forEach(([name, details]) => {
      md += `### ${name}\n`;
      details.forEach((d) => (md += `- ${d}\n`));
      md += `\n`;
    });
  }

  if (removed.length > 0) {
    md += `## Removed Skeletons\n\n`;
    removed.forEach((c) => {
      md += `- **${c.skeleton}**: ${c.detail}\n`;
    });
    md += `\n`;
  }

  return md;
}

// ============== VALIDATION ==============

/** Validate imported JSON data has the expected structure */
export function validateImportData(data: unknown): data is SpineTrackerState {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.skeletons)) return false;
  // Check at least the first skeleton has required fields
  if (obj.skeletons.length > 0) {
    const first = obj.skeletons[0] as Record<string, unknown>;
    if (typeof first.id !== 'string' || typeof first.name !== 'string') return false;
  }
  return true;
}

/** Normalize imported data to ensure all required fields exist */
export function normalizeImportData(data: SpineTrackerState): SpineTrackerState {
  return {
    skeletons: data.skeletons.map((s) => ({
      id: s.id || `skeleton_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: s.name || 'UNNAMED',
      status: s.status || 'planned',
      zOrder: s.zOrder ?? 100,
      group: s.group || getGroupForSkeleton(s.name || ''),
      isGeneric: s.isGeneric || false,
      description: s.description || '',
      placement: s.placement || { parent: null, bone: null, notes: '' },
      targetBone: s.targetBone || '',
      animations: (s.animations || []).map((a) => ({
        name: a.name || 'unnamed',
        status: a.status || 'planned',
        track: a.track ?? 0,
        notes: a.notes || '',
        soundFx: (a.soundFx || []).map((sfx) => ({
          file: sfx.file || '',
          trigger: sfx.trigger || 'spine_event',
          volume: sfx.volume ?? 1.0,
          notes: sfx.notes || '',
        })),
      })),
      skins: (s.skins || []).map((sk) => ({
        name: sk.name || 'unnamed',
        status: sk.status || 'planned',
        notes: sk.notes || '',
      })),
      events: (s.events || []).map((e) => ({
        name: e.name || 'unnamed',
        animation: e.animation || '',
        notes: e.notes || '',
      })),
      previewImageDataUrl: s.previewImageDataUrl || null,
      connectedTasks: Array.isArray(s.connectedTasks)
        ? s.connectedTasks
            .map((taskName) => (typeof taskName === 'string' ? taskName.trim() : ''))
            .filter(Boolean)
        : [],
      generalNotes: s.generalNotes || '',
      isLayoutTemplate: s.isLayoutTemplate || s.name === 'LAYOUT_TEMPLATE',
    })),
    customGroups: data.customGroups || {},
    groupOrder: (data.groupOrder || [
      'symbols',
      'ui',
      'characters',
      'screens',
      'layout',
      'other',
    ]).filter((groupId) => groupId !== 'effects'),
    projectName: data.projectName || 'Untitled Project',
    baseline: data.baseline || null,
  };
}
