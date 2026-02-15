// Card Types
export type CardType = 'TASK' | 'USER_STORY' | 'EPIC' | 'UTILITY';
export type UtilitySubtype = 'LINK' | 'NOTE' | 'MILESTONE' | 'BLOCKER';
export type UserStoryFlag = 'COMPLEX' | 'HIGH_RISK' | 'MISSING_DOCS' | 'BLOCKED' | 'NEEDS_REVIEW';
export type UserPermission = 'VIEWER' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN';
export type TaskReleaseMode = 'IMMEDIATE' | 'STAGED';

// View Types
export type ListViewType = 'TASKS' | 'PLANNING';
export type ListPhase = 'BACKLOG' | 'SPINE_PROTOTYPE' | 'CONCEPT' | 'PRODUCTION' | 'TWEAK' | 'DONE';
export type BoardViewMode = 'tasks' | 'planning' | 'spine';
export type ListTemplateType = 'STANDARD_SLOT' | 'BRANDED_GAME';
export type BoardTemplateType = 'BLANK' | 'STANDARD_SLOT' | 'BRANDED_GAME';

// Base Card
export interface BaseCard {
  id: string;
  type: CardType;
  title: string;
  description: string | null;
  position: number;
  color: string | null;
  featureImage: string | null;
  featureImagePosition: number;
  listId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

// Task Card
export interface TaskCardData {
  storyPoints: number | null;
  deadline: string | null;
  linkedUserStoryId: string | null;
  linkedEpicId: string | null;
  // Task dependency chain
  dependsOnTaskId?: string | null;
  // Task release staging metadata
  releaseMode?: TaskReleaseMode;
  stagedFromPlanningListId?: string | null;
  scheduledReleaseDate?: string | null;
  releaseTargetListId?: string | null;
  releasedAt?: string | null;
}

export interface TaskCard extends BaseCard {
  type: 'TASK';
  taskData: TaskCardData;
  assignees?: CardAssignee[];
  attachments?: Attachment[];
  checklists?: Checklist[];
  comments?: Comment[];
  _count?: {
    attachments: number;
    comments: number;
  };
  // Attached list info for connected task display
  list?: {
    id: string;
    name: string;
    phase: string | null;
  };
}

// User Story Card
export interface UserStoryCardData {
  linkedEpicId: string | null;
  flags: UserStoryFlag[];
}

export interface UserStoryCard extends BaseCard {
  type: 'USER_STORY';
  userStoryData: UserStoryCardData;
  // Computed (not stored)
  completionPercentage?: number;
  totalStoryPoints?: number;
  connectedTasks?: TaskCard[];
}

// Epic Card
export interface EpicCardData {
  // Reserved for future epic-specific stored data
  _placeholder?: never;
}

export interface EpicCard extends BaseCard {
  type: 'EPIC';
  epicData: EpicCardData;
  // Computed (not stored)
  storyCount?: number;
  overallProgress?: number;
  totalStoryPoints?: number;
  connectedUserStories?: UserStoryCard[];
}

// Utility Card
export interface UtilityCardData {
  subtype: UtilitySubtype;
  url?: string;
  content?: string;
  date?: string;
  blockedCardIds?: string[];
}

export interface UtilityCard extends BaseCard {
  type: 'UTILITY';
  utilityData: UtilityCardData;
}

// Union type for all cards
export type Card = TaskCard | UserStoryCard | EpicCard | UtilityCard;

// Related types
export interface CompanyRole {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  isDefault: boolean;
}

export interface UserCompanyRole {
  id: string;
  companyRole: CompanyRole;
  assignedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  slackUserId?: string | null;
  slackDisplayName?: string | null;
  slackAvatarUrl?: string | null;
  permission: UserPermission;
  deletedAt?: string | null;
  userCompanyRoles?: UserCompanyRole[];
}

export interface CardAssignee {
  id: string;
  userId: string;
  user: User;
  assignedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  uploaderId?: string | null;
  uploader?: User | null;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: User;
  attachmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: string;
  name: string;
  type: 'todo' | 'feedback';
  position: number;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  content: string;
  isComplete: boolean;
  position: number;
}

export interface List {
  id: string;
  name: string;
  position: number;
  boardId: string;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
  // View-specific fields
  viewType: ListViewType;
  phase?: ListPhase | null;
  color?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationWeeks?: number | null;
  durationDays?: number | null; // Duration in business days (for 5-day blocks)
  // Timeline sync
  timelineBlockId?: string | null;
  timelineBlock?: {
    id: string;
    blockType: {
      name: string;
      color: string;
    };
  } | null;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  settings: BoardSettings;
  lists: List[];
  timelineBlocks?: {
    id: string;
    startDate: string;
    endDate: string;
    position: number;
    blockType: {
      id: string;
      name: string;
      color: string;
      description: string | null;
      isDefault: boolean;
      position: number;
    };
  }[];
  members: BoardMember[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ProjectLink {
  label: string;
  url: string;
  isDefault?: boolean;
}

export interface BoardSettings {
  // LLM settings
  llmEnabled?: boolean;
  llmProvider?: 'anthropic';

  // Project settings
  projectStartDate?: string;           // ISO date string
  lastDayStaticArt?: string;           // ISO date string
  lastDayAnimationTweaks?: string;     // ISO date string
  releaseDate?: string;                // ISO date string
  marketingAssetsDeadline?: string;    // ISO date string
  customDates?: { id: string; label: string; date: string }[];
  listTemplate?: ListTemplateType;     // Which list template is used
  coreProjectTemplateId?: string;      // Dynamic core template used to create planning blocks/events

  // Project links
  projectLinks?: {
    gameSpecification?: string;
    gameOverviewPlanning?: string;
    animationDocument?: string;
    gameSheetInfo?: string;
    gameNameBrainstorming?: string;
    oneDrive?: string;
  };

  // Slack integration
  slackChannelId?: string;
  slackChannelName?: string;
  slackAlertsEnabled?: boolean;
  slackSlowProgressThresholdPct?: number;

  // Project-specific role rows (separate from company roles on user profiles)
  projectRoleAssignments?: {
    id: string;
    roleId: string;
    roleName: string;
    roleColor?: string | null;
    userId: string;
  }[];

  // Auto-calculated date overrides (from timeline TWEAK blocks)
  lastTweakOverride?: string;       // ISO date, overrides calculated Last Tweak
  lastStaticArtOverride?: string;   // ISO date, overrides calculated Last Static Art

  // Board background
  backgroundType?: 'none' | 'gradient' | 'image';
  backgroundGradient?: string;
  backgroundImageUrl?: string;
}

export interface TeamSettings {
  // Slack integration
  slackChannelId?: string;
  slackChannelName?: string;

  // Team-specific role rows (same pattern as project role assignments)
  teamRoleAssignments?: {
    id: string;
    roleId: string;
    roleName: string;
    roleColor?: string | null;
    userId: string;
  }[];
}

export interface CoreProjectTemplateBlockItem {
  id: string;
  position: number;
  blockTypeId: string;
  blockType: BlockType;
}

export interface CoreProjectTemplateEventItem {
  id: string;
  position: number;
  unitOffset: number;
  title: string | null;
  eventTypeId: string;
  eventType: EventType;
}

export interface CoreProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  position: number;
  blocks: CoreProjectTemplateBlockItem[];
  events: CoreProjectTemplateEventItem[];
}

// Weekly progress for burn-up charts
export interface WeeklyProgress {
  id: string;
  weekStartDate: string;
  totalStoryPoints: number;
  completedPoints: number;
  tasksCompleted: number;
  tasksTotal: number;
  createdAt: string;
}

export interface BoardMember {
  id: string;
  userId: string;
  user: User;
  permission: UserPermission;
  joinedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Timeline Types
export type TimelineZoomLevel = 'day' | 'week' | 'month';

export interface BlockType {
  id: string;
  name: string;
  color: string;
  description: string | null;
  isDefault: boolean;
  position: number;
}

export interface EventType {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  isDefault: boolean;
  position: number;
}

export interface TimelineBlock {
  id: string;
  startDate: string;
  endDate: string;
  position: number;
  blockType: BlockType;
  list: {
    id: string;
    name: string;
    phase: string | null;
  } | null;
  metrics?: {
    userStoryCount: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
    completedTaskCount: number;
    taskCount: number;
  };
}

// User weekly availability per board (project)
export interface UserWeeklyAvailability {
  id: string;
  dedication: number; // 0, 25, 33, 50, 75, 100
  weekStart: string;  // ISO date (Monday)
  userId: string;
  boardId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

// For grouped display in UI - availability by role for a week
export interface RoleWeekAvailability {
  roleId: string;
  roleName: string;
  roleColor: string | null;
  weekStart: string;
  entries: {
    userId: string;
    userName: string | null;
    dedication: number;
  }[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  eventType: EventType;
}

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface EpicNamePreset {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

export interface ModuleTaskTemplate {
  id: string;
  title: string;
  titleOverride: string | null;
  color: string;
  description: string | null;
  storyPoints: number | null;
  featureImage: string | null;
  tags: string[];
  destinationMode: TaskReleaseMode;
  chainGroupId: string | null;
  chainOrder: number | null;
}

export interface BoardModuleTemplate {
  id: string;
  name: string;
  description: string | null;
  symbol: string;
  epicName: string;
  userStoryDescription: string | null;
  userStoryFeatureImage: string | null;
  taskTemplates: ModuleTaskTemplate[];
  position: number;
}

export interface ModuleImageAsset {
  id: string;
  name: string;
  url: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Member info for timeline display (includes company roles)
export interface TimelineMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  timelineProjectRole?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  userCompanyRoles: {
    companyRole: {
      id: string;
      name: string;
      color: string | null;
      position: number;
    };
  }[];
}

export interface TimelineData {
  board: {
    id: string;
    name: string;
    description: string | null;
    teamId: string | null;
    team: Team | null;
    members: TimelineMember[];
    projectRoleAssignments?: {
      id: string;
      roleId: string;
      roleName: string;
      roleColor: string | null;
      userId: string;
    }[];
  };
  blocks: TimelineBlock[];
  events: TimelineEvent[];
  availability: UserWeeklyAvailability[];
  blockTypes: BlockType[];
  eventTypes: EventType[];
}

export interface TimelineArchivedProjectSummary {
  id: string;
  name: string;
  teamId: string | null;
  team: Team | null;
}
