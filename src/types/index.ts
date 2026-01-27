// Card Types
export type CardType = 'TASK' | 'USER_STORY' | 'EPIC' | 'UTILITY';
export type UtilitySubtype = 'LINK' | 'NOTE' | 'MILESTONE' | 'BLOCKER';
export type UserStoryFlag = 'COMPLEX' | 'HIGH_RISK' | 'MISSING_DOCS' | 'BLOCKED' | 'NEEDS_REVIEW';
export type UserRole = 'VIEWER' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN';

// Base Card
export interface BaseCard {
  id: string;
  type: CardType;
  title: string;
  description: string | null;
  position: number;
  color: string | null;
  featureImage: string | null;
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
  // Mostly computed fields
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
export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
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
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  settings: BoardSettings;
  lists: List[];
  members: BoardMember[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface BoardSettings {
  llmEnabled?: boolean;
  llmProvider?: 'anthropic';
  // Add more as needed
}

export interface BoardMember {
  id: string;
  userId: string;
  user: User;
  role: UserRole;
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
