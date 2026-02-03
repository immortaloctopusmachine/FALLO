import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/settings/skills - Get all skills
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const skills = await prisma.skill.findMany({
      where: {
        studioId: null, // Global skills only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { userSkills: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: skills });
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch skills' } },
      { status: 500 }
    );
  }
}

// POST /api/settings/skills - Create a new skill
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (user?.permission !== 'ADMIN' && user?.permission !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Skill name is required' } },
        { status: 400 }
      );
    }

    // Get the highest position
    const maxPosition = await prisma.skill.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const skill = await prisma.skill.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        position: (maxPosition._max.position ?? -1) + 1,
        studioId: null,
      },
    });

    return NextResponse.json({ success: true, data: skill }, { status: 201 });
  } catch (error) {
    console.error('Failed to create skill:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create skill' } },
      { status: 500 }
    );
  }
}
