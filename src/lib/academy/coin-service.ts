import { prisma } from '@/lib/prisma';

/**
 * Award coins to a user by incrementing their coin balance.
 * Creates the UserCoinBalance record if it doesn't exist.
 *
 * @param userId - The user to award coins to
 * @param amount - Number of coins to add (must be > 0)
 */
export async function awardCoins(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;

  await prisma.userCoinBalance.upsert({
    where: { userId },
    create: { userId, balance: amount },
    update: { balance: { increment: amount } },
  });
}

/**
 * Get a user's current coin balance.
 *
 * @param userId - The user to check
 * @returns Current balance (0 if no record exists)
 */
export async function getCoinBalance(userId: string): Promise<number> {
  const record = await prisma.userCoinBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return record?.balance ?? 0;
}
