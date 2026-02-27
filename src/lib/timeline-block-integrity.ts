import { prisma } from '@/lib/prisma';
import { getFriday, getMonday } from '@/lib/date-utils';

interface EnsureTimelineBlockIntegrityOptions {
  syncToList?: boolean;
}

function isSameInstant(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

export async function ensureTimelineBlockIntegrity(
  boardId: string,
  options: EnsureTimelineBlockIntegrityOptions = {}
): Promise<{ fixedBlocks: number }> {
  const { syncToList = true } = options;

  const blocks = await prisma.timelineBlock.findMany({
    where: { boardId },
    include: { list: true },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
  });

  if (blocks.length === 0) {
    return { fixedBlocks: 0 };
  }

  let previousMonday: Date | null = null;
  const updates: Array<
    ReturnType<typeof prisma.timelineBlock.update> |
    ReturnType<typeof prisma.list.update>
  > = [];
  let fixedBlocks = 0;

  for (const block of blocks) {
    let normalizedMonday = getMonday(block.startDate);
    let normalizedFriday = getFriday(normalizedMonday);

    if (previousMonday) {
      while (normalizedMonday.getTime() <= previousMonday.getTime()) {
        const nextMonday = new Date(previousMonday);
        nextMonday.setDate(nextMonday.getDate() + 7);
        normalizedMonday = nextMonday;
        normalizedFriday = getFriday(normalizedMonday);
      }
    }

    const needsBlockUpdate =
      !isSameInstant(block.startDate, normalizedMonday) ||
      !isSameInstant(block.endDate, normalizedFriday);

    if (needsBlockUpdate) {
      fixedBlocks++;
      updates.push(
        prisma.timelineBlock.update({
          where: { id: block.id },
          data: {
            startDate: normalizedMonday,
            endDate: normalizedFriday,
          },
        })
      );

      if (syncToList && block.listId) {
        updates.push(
          prisma.list.update({
            where: { id: block.listId },
            data: {
              startDate: normalizedMonday,
              endDate: normalizedFriday,
            },
          })
        );
      }
    }

    previousMonday = new Date(normalizedMonday);
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return { fixedBlocks };
}
