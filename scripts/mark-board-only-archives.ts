/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import {
  parseBoardArchivedOnlyAt,
  parseProjectArchivedAt,
  setBoardArchivedOnlyAt,
} from '../src/lib/project-archive';

type Args = {
  ids: string[];
  apply: boolean;
  all: boolean;
  includeTemplates: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Args = {
    ids: [],
    apply: false,
    all: false,
    includeTemplates: true,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--apply') {
      parsed.apply = true;
      continue;
    }

    if (arg === '--all') {
      parsed.all = true;
      continue;
    }

    if (arg === '--exclude-templates') {
      parsed.includeTemplates = false;
      continue;
    }

    if (arg === '--ids' && args[i + 1]) {
      const raw = args[i + 1];
      parsed.ids.push(
        ...raw
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      );
      i += 1;
      continue;
    }

    if (arg === '--id' && args[i + 1]) {
      const id = args[i + 1]?.trim();
      if (id) parsed.ids.push(id);
      i += 1;
      continue;
    }
  }

  parsed.ids = Array.from(new Set(parsed.ids));
  return parsed;
}

function describeLegacyState(settings: unknown): 'project' | 'board' | 'unmarked' {
  if (parseProjectArchivedAt(settings)) return 'project';
  if (parseBoardArchivedOnlyAt(settings)) return 'board';
  return 'unmarked';
}

async function main() {
  const prisma = new PrismaClient();
  const args = parseArgs();

  try {
    const archivedBoards = await prisma.board.findMany({
      where: {
        archivedAt: { not: null },
        ...(args.includeTemplates ? {} : { isTemplate: false }),
      },
      select: {
        id: true,
        name: true,
        isTemplate: true,
        archivedAt: true,
        settings: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            timelineBlocks: true,
            timelineEvents: true,
          },
        },
      },
      orderBy: { archivedAt: 'desc' },
    });

    const unmarkedLegacyBoards = archivedBoards.filter(
      (board) => describeLegacyState(board.settings) === 'unmarked'
    );

    if (!args.apply && args.ids.length === 0 && !args.all) {
      console.log('Legacy archive marker report (no changes made):');
      console.log(`- Archived boards scanned: ${archivedBoards.length}`);
      console.log(`- Unmarked legacy boards: ${unmarkedLegacyBoards.length}`);

      if (unmarkedLegacyBoards.length > 0) {
        console.log('');
        console.log('Potential board-only candidates (review before applying):');
        for (const board of unmarkedLegacyBoards) {
          console.log(
            [
              `id=${board.id}`,
              `name="${board.name}"`,
              `template=${board.isTemplate}`,
              `team="${board.team?.name || 'none'}"`,
              `blocks=${board._count.timelineBlocks}`,
              `events=${board._count.timelineEvents}`,
              `archivedAt=${board.archivedAt?.toISOString() || 'null'}`,
            ].join(' | ')
          );
        }
        console.log('');
        console.log(
          'Apply specific IDs: npm run migrate:mark-board-only-archives -- --ids <id1,id2> --apply'
        );
        console.log(
          'Apply all unmarked legacy boards: npm run migrate:mark-board-only-archives -- --all --apply'
        );
      }

      return;
    }

    let targets = unmarkedLegacyBoards;
    if (args.ids.length > 0) {
      const idSet = new Set(args.ids);
      targets = archivedBoards.filter((board) => idSet.has(board.id));
    } else if (!args.all) {
      console.error('No targets selected. Use --ids or --all.');
      process.exitCode = 1;
      return;
    }

    if (targets.length === 0) {
      console.log('No matching archived boards found for the requested selection.');
      return;
    }

    if (!args.apply) {
      console.log('Dry run (no changes made). Targets:');
      targets.forEach((board) => {
        const state = describeLegacyState(board.settings);
        console.log(`- ${board.id} | ${board.name} | state=${state}`);
      });
      console.log('Re-run with --apply to write changes.');
      return;
    }

    const updates = targets
      .filter((board) => board.archivedAt)
      .map((board) =>
        prisma.board.update({
          where: { id: board.id },
          data: {
            settings: setBoardArchivedOnlyAt(board.settings, board.archivedAt as Date),
          },
        })
      );

    const result = await prisma.$transaction(updates);
    console.log(`Updated ${result.length} board(s) with boardArchivedOnlyAt.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
