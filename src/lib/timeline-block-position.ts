import { prisma } from '@/lib/prisma';

/**
 * Re-number timeline blocks per board and block type.
 * For each block type, positions are assigned in chronological order starting at 1.
 */
export async function renumberTimelineBlockPositions(boardId: string): Promise<void> {
  const blocks = await prisma.timelineBlock.findMany({
    where: { boardId },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      blockTypeId: true,
      position: true,
    },
  });

  const counters = new Map<string, number>();
  const updates: ReturnType<typeof prisma.timelineBlock.update>[] = [];

  for (const block of blocks) {
    const next = (counters.get(block.blockTypeId) ?? 0) + 1;
    counters.set(block.blockTypeId, next);

    if (block.position !== next) {
      updates.push(
        prisma.timelineBlock.update({
          where: { id: block.id },
          data: { position: next },
        })
      );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

