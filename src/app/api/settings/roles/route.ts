import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/settings/roles - Get all company roles
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const roles = await prisma.companyRole.findMany({
      where: {
        studioId: null, // Global roles only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { userCompanyRoles: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error('Failed to fetch company roles:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch company roles' } },
      { status: 500 }
    );
  }
}

// POST /api/settings/roles - Create a new company role
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
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Role name is required' } },
        { status: 400 }
      );
    }

    // Get the highest position
    const maxPosition = await prisma.companyRole.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const role = await prisma.companyRole.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        position: (maxPosition._max.position ?? -1) + 1,
        studioId: null,
      },
    });

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    console.error('Failed to create company role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create company role' } },
      { status: 500 }
    );
  }
}
