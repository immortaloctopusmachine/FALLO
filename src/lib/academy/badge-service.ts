import { prisma } from '@/lib/prisma';
import type { BadgeRewardInfo } from '@/types/academy';
import { describeBadgeRequirement } from '@/lib/rewards/presentation';

/**
 * Award an Academy badge to a user. Idempotent — skips if the user
 * already has this specific badge definition awarded.
 *
 * @param userId - The user to award the badge to
 * @param badgeDefinitionId - The badge definition to award
 * @returns The badge info if newly awarded, null if already held or badge not found
 */
export async function awardAcademyBadge(
  userId: string,
  badgeDefinitionId: string
): Promise<BadgeRewardInfo | null> {
  // Check if already awarded (one-time per user per definition)
  const existing = await prisma.badgeAward.findFirst({
    where: { userId, badgeDefinitionId },
    select: { id: true },
  });

  if (existing) return null;

  // Verify the badge definition exists and is active
  const definition = await prisma.badgeDefinition.findFirst({
    where: { id: badgeDefinitionId, isActive: true },
    select: {
      id: true,
      name: true,
      iconUrl: true,
      slug: true,
      description: true,
      category: true,
      tier: true,
      conditions: true,
    },
  });

  if (!definition) return null;

  // Create the award
  await prisma.badgeAward.create({
    data: {
      userId,
      badgeDefinitionId,
      metadata: { source: 'academy' },
    },
  });

  // Create a notification for the user
  await prisma.notification.create({
    data: {
      userId,
      type: 'badge_awarded',
      title: `Badge earned: ${definition.name}`,
      message: definition.description,
      data: {
        badgeSlug: definition.slug,
        badgeDefinitionId: definition.id,
        badgeName: definition.name,
        badgeDescription: definition.description,
        badgeIconUrl: definition.iconUrl,
        badgeCategory: definition.category,
        badgeTier: definition.tier,
        reason: describeBadgeRequirement({
          category: definition.category,
          conditions: definition.conditions,
        }),
        source: 'academy',
      },
    },
  });

  return {
    id: definition.id,
    name: definition.name,
    iconUrl: definition.iconUrl,
  };
}
