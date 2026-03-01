-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('JUNIOR', 'MID', 'SENIOR');

-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('LOGIN', 'VELOCITY_STREAK', 'VELOCITY_MILESTONE', 'QUALITY_CONSISTENCY', 'QUALITY_VELOCITY_COMBINED', 'REVIEWER');

-- AlterEnum
ALTER TYPE "EvaluatorRole" ADD VALUE 'HEAD_OF_ANIMATION';

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "seniority" "Seniority";

-- CreateTable
CREATE TABLE "seniority_configs" (
    "id" TEXT NOT NULL,
    "seniority" "Seniority" NOT NULL,
    "expectedPointsPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "expectedQualityAvg" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "warmUpPoints" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "steadyHandRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "inTheFlowRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "onARollRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "powerhouseRatio" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "forceOfNatureRatio" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seniority_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_login_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_login_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalLoginDays" INTEGER NOT NULL DEFAULT 0,
    "lastLoginDate" DATE,
    "weekendsCounted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "seniorityAtSnapshot" "Seniority",
    "storyPointsCompleted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cardsCompleted" INTEGER NOT NULL DEFAULT 0,
    "avgQualityScore" DOUBLE PRECISION,
    "avgTechnicalQuality" DOUBLE PRECISION,
    "avgArtDirection" DOUBLE PRECISION,
    "avgContextFit" DOUBLE PRECISION,
    "avgDelivery" DOUBLE PRECISION,
    "scoredCardCount" INTEGER NOT NULL DEFAULT 0,
    "firstPassCount" INTEGER NOT NULL DEFAULT 0,
    "firstPassRate" DOUBLE PRECISION,
    "avgReviewCycles" DOUBLE PRECISION,
    "evaluationsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "evaluationEligible" INTEGER NOT NULL DEFAULT 0,
    "evaluationRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_definitions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "tier" TEXT,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badge_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_awards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeDefinitionId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerSnapshotId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "badge_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streakType" TEXT NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "longestCount" INTEGER NOT NULL DEFAULT 0,
    "lastQualifiedWeek" TIMESTAMP(3),
    "graceUsed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seniority_configs_seniority_key" ON "seniority_configs"("seniority");

-- CreateIndex
CREATE INDEX "daily_login_records_userId_idx" ON "daily_login_records"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_login_records_userId_date_key" ON "daily_login_records"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "login_streaks_userId_key" ON "login_streaks"("userId");

-- CreateIndex
CREATE INDEX "weekly_snapshots_userId_idx" ON "weekly_snapshots"("userId");

-- CreateIndex
CREATE INDEX "weekly_snapshots_weekStartDate_idx" ON "weekly_snapshots"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_snapshots_userId_weekStartDate_key" ON "weekly_snapshots"("userId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "badge_definitions_slug_key" ON "badge_definitions"("slug");

-- CreateIndex
CREATE INDEX "badge_awards_userId_idx" ON "badge_awards"("userId");

-- CreateIndex
CREATE INDEX "badge_awards_badgeDefinitionId_idx" ON "badge_awards"("badgeDefinitionId");

-- CreateIndex
CREATE INDEX "badge_awards_triggerSnapshotId_idx" ON "badge_awards"("triggerSnapshotId");

-- CreateIndex
CREATE INDEX "user_streaks_userId_idx" ON "user_streaks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_streaks_userId_streakType_key" ON "user_streaks"("userId", "streakType");

-- AddForeignKey
ALTER TABLE "daily_login_records" ADD CONSTRAINT "daily_login_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_streaks" ADD CONSTRAINT "login_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_snapshots" ADD CONSTRAINT "weekly_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_badgeDefinitionId_fkey" FOREIGN KEY ("badgeDefinitionId") REFERENCES "badge_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_triggerSnapshotId_fkey" FOREIGN KEY ("triggerSnapshotId") REFERENCES "weekly_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
