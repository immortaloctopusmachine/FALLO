-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."CardType" AS ENUM ('TASK', 'USER_STORY', 'EPIC', 'UTILITY');

-- CreateEnum
CREATE TYPE "public"."EvaluatorRole" AS ENUM ('LEAD', 'PO', 'HEAD_OF_ART');

-- CreateEnum
CREATE TYPE "public"."ListPhase" AS ENUM ('BACKLOG', 'SPINE_PROTOTYPE', 'CONCEPT', 'PRODUCTION', 'TWEAK', 'DONE');

-- CreateEnum
CREATE TYPE "public"."ListViewType" AS ENUM ('TASKS', 'PLANNING');

-- CreateEnum
CREATE TYPE "public"."ReviewScoreValue" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('VIEWER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."UserStoryFlag" AS ENUM ('COMPLEX', 'HIGH_RISK', 'MISSING_DOCS', 'BLOCKED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "public"."UtilitySubtype" AS ENUM ('LINK', 'NOTE', 'MILESTONE', 'BLOCKER');

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activities" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT NOT NULL,
    "uploaderId" TEXT,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."block_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studioId" TEXT,

    CONSTRAINT "block_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."board_members" (
    "id" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."board_modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "epicName" TEXT NOT NULL,
    "userStoryDescription" TEXT,
    "userStoryFeatureImage" TEXT,
    "taskTemplates" JSONB NOT NULL DEFAULT '[]',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "board_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."boards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "teamId" TEXT,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."card_tags" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "card_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."card_users" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "card_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cards" (
    "id" TEXT NOT NULL,
    "type" "public"."CardType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "color" TEXT,
    "featureImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "listId" TEXT NOT NULL,
    "parentId" TEXT,
    "taskData" JSONB,
    "userStoryData" JSONB,
    "epicData" JSONB,
    "utilityData" JSONB,
    "featureImagePosition" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checklist_items" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checklistId" TEXT NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."checklists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "attachmentId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'standard',

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."company_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studioId" TEXT,

    CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."core_project_template_blocks" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,
    "blockTypeId" TEXT NOT NULL,

    CONSTRAINT "core_project_template_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."core_project_template_events" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "unitOffset" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "core_project_template_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."core_project_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "core_project_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dimension_roles" (
    "id" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "role" "public"."EvaluatorRole" NOT NULL,

    CONSTRAINT "dimension_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."epic_name_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epic_name_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evaluation_scores" (
    "id" TEXT NOT NULL,
    "score" "public"."ReviewScoreValue" NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,

    CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evaluations" (
    "id" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewCycleId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studioId" TEXT,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."game_sheet_documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "game_sheet_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "boardId" TEXT NOT NULL,
    "color" TEXT,
    "durationWeeks" INTEGER,
    "endDate" TIMESTAMP(3),
    "phase" "public"."ListPhase",
    "startDate" TIMESTAMP(3),
    "viewType" "public"."ListViewType" NOT NULL DEFAULT 'TASKS',
    "durationDays" INTEGER,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."module_image_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_cycles" (
    "id" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "cardId" TEXT NOT NULL,

    CONSTRAINT "review_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_dimensions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studioId" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skin_settings" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."spine_skeleton_modules" (
    "id" TEXT NOT NULL,
    "skeletonName" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "zOrder" INTEGER NOT NULL DEFAULT 100,
    "description" TEXT,
    "placementParent" TEXT,
    "placementBone" TEXT,
    "placementNotes" TEXT,
    "generalNotes" TEXT,
    "animations" JSONB NOT NULL DEFAULT '[]',
    "skins" JSONB NOT NULL DEFAULT '[]',
    "events" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spine_skeleton_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."spine_tracker_data" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "boardId" TEXT NOT NULL,

    CONSTRAINT "spine_tracker_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioId" TEXT,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."team_members" (
    "id" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'MEMBER',
    "title" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "studioId" TEXT,
    "settings" JSONB DEFAULT '{}',

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_logs" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMs" INTEGER,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timeline_blocks" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "boardId" TEXT NOT NULL,
    "blockTypeId" TEXT NOT NULL,
    "listId" TEXT,

    CONSTRAINT "timeline_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timeline_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "boardId" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_company_roles" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "companyRoleId" TEXT NOT NULL,

    CONSTRAINT "user_company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_skills" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_spine_settings" (
    "id" TEXT NOT NULL,
    "finalAssetsPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_spine_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_weekly_availability" (
    "id" TEXT NOT NULL,
    "dedication" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_weekly_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "slackAvatarUrl" TEXT,
    "slackDisplayName" TEXT,
    "slackUserId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."weekly_progress" (
    "id" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "totalStoryPoints" INTEGER NOT NULL,
    "completedPoints" INTEGER NOT NULL,
    "tasksCompleted" INTEGER NOT NULL,
    "tasksTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boardId" TEXT NOT NULL,

    CONSTRAINT "weekly_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE INDEX "activities_boardId_idx" ON "public"."activities"("boardId" ASC);

-- CreateIndex
CREATE INDEX "activities_entityId_idx" ON "public"."activities"("entityId" ASC);

-- CreateIndex
CREATE INDEX "attachments_cardId_idx" ON "public"."attachments"("cardId" ASC);

-- CreateIndex
CREATE INDEX "attachments_uploaderId_idx" ON "public"."attachments"("uploaderId" ASC);

-- CreateIndex
CREATE INDEX "block_types_studioId_idx" ON "public"."block_types"("studioId" ASC);

-- CreateIndex
CREATE INDEX "board_members_boardId_idx" ON "public"."board_members"("boardId" ASC);

-- CreateIndex
CREATE INDEX "board_members_boardId_joinedAt_idx" ON "public"."board_members"("boardId" ASC, "joinedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "board_members_userId_boardId_key" ON "public"."board_members"("userId" ASC, "boardId" ASC);

-- CreateIndex
CREATE INDEX "board_modules_position_idx" ON "public"."board_modules"("position" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "board_modules_symbol_key" ON "public"."board_modules"("symbol" ASC);

-- CreateIndex
CREATE INDEX "boards_isTemplate_archivedAt_name_idx" ON "public"."boards"("isTemplate" ASC, "archivedAt" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "boards_teamId_idx" ON "public"."boards"("teamId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "card_tags_cardId_tagId_key" ON "public"."card_tags"("cardId" ASC, "tagId" ASC);

-- CreateIndex
CREATE INDEX "card_users_cardId_idx" ON "public"."card_users"("cardId" ASC);

-- CreateIndex
CREATE INDEX "card_users_userId_activatedAt_idx" ON "public"."card_users"("userId" ASC, "activatedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "card_users_userId_cardId_key" ON "public"."card_users"("userId" ASC, "cardId" ASC);

-- CreateIndex
CREATE INDEX "cards_listId_archivedAt_position_idx" ON "public"."cards"("listId" ASC, "archivedAt" ASC, "position" ASC);

-- CreateIndex
CREATE INDEX "cards_listId_idx" ON "public"."cards"("listId" ASC);

-- CreateIndex
CREATE INDEX "cards_parentId_idx" ON "public"."cards"("parentId" ASC);

-- CreateIndex
CREATE INDEX "cards_type_idx" ON "public"."cards"("type" ASC);

-- CreateIndex
CREATE INDEX "checklist_items_checklistId_idx" ON "public"."checklist_items"("checklistId" ASC);

-- CreateIndex
CREATE INDEX "checklists_cardId_idx" ON "public"."checklists"("cardId" ASC);

-- CreateIndex
CREATE INDEX "comments_cardId_idx" ON "public"."comments"("cardId" ASC);

-- CreateIndex
CREATE INDEX "company_roles_studioId_idx" ON "public"."company_roles"("studioId" ASC);

-- CreateIndex
CREATE INDEX "core_project_template_blocks_templateId_position_idx" ON "public"."core_project_template_blocks"("templateId" ASC, "position" ASC);

-- CreateIndex
CREATE INDEX "core_project_template_events_templateId_position_idx" ON "public"."core_project_template_events"("templateId" ASC, "position" ASC);

-- CreateIndex
CREATE INDEX "core_project_templates_position_idx" ON "public"."core_project_templates"("position" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dimension_roles_dimensionId_role_key" ON "public"."dimension_roles"("dimensionId" ASC, "role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "epic_name_presets_name_key" ON "public"."epic_name_presets"("name" ASC);

-- CreateIndex
CREATE INDEX "epic_name_presets_position_idx" ON "public"."epic_name_presets"("position" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_scores_evaluationId_dimensionId_key" ON "public"."evaluation_scores"("evaluationId" ASC, "dimensionId" ASC);

-- CreateIndex
CREATE INDEX "evaluations_reviewCycleId_idx" ON "public"."evaluations"("reviewCycleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_reviewCycleId_reviewerId_key" ON "public"."evaluations"("reviewCycleId" ASC, "reviewerId" ASC);

-- CreateIndex
CREATE INDEX "evaluations_reviewerId_idx" ON "public"."evaluations"("reviewerId" ASC);

-- CreateIndex
CREATE INDEX "event_types_studioId_idx" ON "public"."event_types"("studioId" ASC);

-- CreateIndex
CREATE INDEX "game_sheet_documents_updatedAt_idx" ON "public"."game_sheet_documents"("updatedAt" ASC);

-- CreateIndex
CREATE INDEX "lists_boardId_idx" ON "public"."lists"("boardId" ASC);

-- CreateIndex
CREATE INDEX "lists_boardId_position_idx" ON "public"."lists"("boardId" ASC, "position" ASC);

-- CreateIndex
CREATE INDEX "lists_viewType_idx" ON "public"."lists"("viewType" ASC);

-- CreateIndex
CREATE INDEX "module_image_assets_createdAt_idx" ON "public"."module_image_assets"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "module_image_assets_url_key" ON "public"."module_image_assets"("url" ASC);

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "public"."notifications"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "public"."notifications"("userId" ASC, "read" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "review_cycles_cardId_cycleNumber_key" ON "public"."review_cycles"("cardId" ASC, "cycleNumber" ASC);

-- CreateIndex
CREATE INDEX "review_cycles_cardId_idx" ON "public"."review_cycles"("cardId" ASC);

-- CreateIndex
CREATE INDEX "review_dimensions_position_idx" ON "public"."review_dimensions"("position" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken" ASC);

-- CreateIndex
CREATE INDEX "skills_studioId_idx" ON "public"."skills"("studioId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "skin_settings_scope_key" ON "public"."skin_settings"("scope" ASC);

-- CreateIndex
CREATE INDEX "spine_skeleton_modules_skeletonName_idx" ON "public"."spine_skeleton_modules"("skeletonName" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "spine_skeleton_modules_skeletonName_key" ON "public"."spine_skeleton_modules"("skeletonName" ASC);

-- CreateIndex
CREATE INDEX "spine_tracker_data_boardId_idx" ON "public"."spine_tracker_data"("boardId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "spine_tracker_data_boardId_key" ON "public"."spine_tracker_data"("boardId" ASC);

-- CreateIndex
CREATE INDEX "tags_studioId_idx" ON "public"."tags"("studioId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tags_studioId_name_key" ON "public"."tags"("studioId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "team_members_teamId_joinedAt_idx" ON "public"."team_members"("teamId" ASC, "joinedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "team_members_userId_teamId_key" ON "public"."team_members"("userId" ASC, "teamId" ASC);

-- CreateIndex
CREATE INDEX "teams_studioId_idx" ON "public"."teams"("studioId" ASC);

-- CreateIndex
CREATE INDEX "time_logs_cardId_idx" ON "public"."time_logs"("cardId" ASC);

-- CreateIndex
CREATE INDEX "time_logs_listId_idx" ON "public"."time_logs"("listId" ASC);

-- CreateIndex
CREATE INDEX "time_logs_userId_idx" ON "public"."time_logs"("userId" ASC);

-- CreateIndex
CREATE INDEX "timeline_blocks_boardId_idx" ON "public"."timeline_blocks"("boardId" ASC);

-- CreateIndex
CREATE INDEX "timeline_blocks_boardId_position_idx" ON "public"."timeline_blocks"("boardId" ASC, "position" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "timeline_blocks_listId_key" ON "public"."timeline_blocks"("listId" ASC);

-- CreateIndex
CREATE INDEX "timeline_events_boardId_idx" ON "public"."timeline_events"("boardId" ASC);

-- CreateIndex
CREATE INDEX "timeline_events_boardId_startDate_idx" ON "public"."timeline_events"("boardId" ASC, "startDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_company_roles_userId_companyRoleId_key" ON "public"."user_company_roles"("userId" ASC, "companyRoleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_userId_skillId_key" ON "public"."user_skills"("userId" ASC, "skillId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_spine_settings_userId_key" ON "public"."user_spine_settings"("userId" ASC);

-- CreateIndex
CREATE INDEX "user_weekly_availability_boardId_idx" ON "public"."user_weekly_availability"("boardId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_weekly_availability_boardId_userId_weekStart_key" ON "public"."user_weekly_availability"("boardId" ASC, "userId" ASC, "weekStart" ASC);

-- CreateIndex
CREATE INDEX "user_weekly_availability_userId_idx" ON "public"."user_weekly_availability"("userId" ASC);

-- CreateIndex
CREATE INDEX "user_weekly_availability_weekStart_idx" ON "public"."user_weekly_availability"("weekStart" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_slackUserId_key" ON "public"."users"("slackUserId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "weekly_progress_boardId_idx" ON "public"."weekly_progress"("boardId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_progress_boardId_weekStartDate_key" ON "public"."weekly_progress"("boardId" ASC, "weekStartDate" ASC);

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."block_types" ADD CONSTRAINT "block_types_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."board_members" ADD CONSTRAINT "board_members_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."board_members" ADD CONSTRAINT "board_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."boards" ADD CONSTRAINT "boards_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_tags" ADD CONSTRAINT "card_tags_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_tags" ADD CONSTRAINT "card_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_users" ADD CONSTRAINT "card_users_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."card_users" ADD CONSTRAINT "card_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cards" ADD CONSTRAINT "cards_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cards" ADD CONSTRAINT "cards_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."checklist_items" ADD CONSTRAINT "checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."checklists" ADD CONSTRAINT "checklists_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "public"."attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_roles" ADD CONSTRAINT "company_roles_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."core_project_template_blocks" ADD CONSTRAINT "core_project_template_blocks_blockTypeId_fkey" FOREIGN KEY ("blockTypeId") REFERENCES "public"."block_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."core_project_template_blocks" ADD CONSTRAINT "core_project_template_blocks_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."core_project_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."core_project_template_events" ADD CONSTRAINT "core_project_template_events_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."core_project_template_events" ADD CONSTRAINT "core_project_template_events_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."core_project_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dimension_roles" ADD CONSTRAINT "dimension_roles_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "public"."review_dimensions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluation_scores" ADD CONSTRAINT "evaluation_scores_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "public"."review_dimensions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluation_scores" ADD CONSTRAINT "evaluation_scores_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "public"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "public"."review_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_types" ADD CONSTRAINT "event_types_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lists" ADD CONSTRAINT "lists_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_cycles" ADD CONSTRAINT "review_cycles_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skills" ADD CONSTRAINT "skills_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."spine_tracker_data" ADD CONSTRAINT "spine_tracker_data_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_logs" ADD CONSTRAINT "time_logs_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_logs" ADD CONSTRAINT "time_logs_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_logs" ADD CONSTRAINT "time_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timeline_blocks" ADD CONSTRAINT "timeline_blocks_blockTypeId_fkey" FOREIGN KEY ("blockTypeId") REFERENCES "public"."block_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timeline_blocks" ADD CONSTRAINT "timeline_blocks_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timeline_blocks" ADD CONSTRAINT "timeline_blocks_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timeline_events" ADD CONSTRAINT "timeline_events_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timeline_events" ADD CONSTRAINT "timeline_events_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_company_roles" ADD CONSTRAINT "user_company_roles_companyRoleId_fkey" FOREIGN KEY ("companyRoleId") REFERENCES "public"."company_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_company_roles" ADD CONSTRAINT "user_company_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "public"."skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_spine_settings" ADD CONSTRAINT "user_spine_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_weekly_availability" ADD CONSTRAINT "user_weekly_availability_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_weekly_availability" ADD CONSTRAINT "user_weekly_availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."weekly_progress" ADD CONSTRAINT "weekly_progress_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
