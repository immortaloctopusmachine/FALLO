import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/boards/[boardId]/timeline/blocks/[blockId]/assignments - Get assignments for a block
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; blockId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, blockId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check membership
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a board member' } },
        { status: 403 }
      );
    }

    const assignments = await prisma.timelineAssignment.findMany({
      where: { blockId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Failed to fetch timeline assignments:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline assignments' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/timeline/blocks/[blockId]/assignments - Add user assignment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string; blockId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, blockId } = await params;

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

    // Check if block exists
    const block = await prisma.timelineBlock.findFirst({
      where: {
        id: blockId,
        boardId,
      },
    });

    if (!block) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Block not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { userId, dedication = 100, startDate, endDate } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'userId is required' } },
        { status: 400 }
      );
    }

    // Validate dedication is valid (25, 50, 75, or 100)
    const validDedications = [25, 50, 75, 100];
    if (!validDedications.includes(dedication)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'dedication must be 25, 50, 75, or 100' } },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Check if user is already assigned to this block
    const existingAssignment = await prisma.timelineAssignment.findFirst({
      where: {
        blockId,
        userId,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_EXISTS', message: 'User is already assigned to this block' } },
        { status: 400 }
      );
    }

    // Use block dates as default if not provided
    const assignmentStartDate = startDate ? new Date(startDate) : block.startDate;
    const assignmentEndDate = endDate ? new Date(endDate) : block.endDate;

    const assignment = await prisma.timelineAssignment.create({
      data: {
        blockId,
        userId,
        dedication,
        startDate: assignmentStartDate,
        endDate: assignmentEndDate,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    console.error('Failed to create timeline assignment:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create timeline assignment' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/timeline/blocks/[blockId]/assignments - Remove user assignment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; blockId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, blockId } = await params;

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

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const userId = searchParams.get('userId');

    if (!assignmentId && !userId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'assignmentId or userId is required' } },
        { status: 400 }
      );
    }

    // Find and delete the assignment
    if (assignmentId) {
      const assignment = await prisma.timelineAssignment.findFirst({
        where: {
          id: assignmentId,
          blockId,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } },
          { status: 404 }
        );
      }

      await prisma.timelineAssignment.delete({
        where: { id: assignmentId },
      });
    } else if (userId) {
      const assignment = await prisma.timelineAssignment.findFirst({
        where: {
          blockId,
          userId,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } },
          { status: 404 }
        );
      }

      await prisma.timelineAssignment.delete({
        where: { id: assignment.id },
      });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete timeline assignment:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete timeline assignment' } },
      { status: 500 }
    );
  }
}

// PATCH /api/boards/[boardId]/timeline/blocks/[blockId]/assignments - Update assignment
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; blockId: string }> }
) {
  try {
    const session = await auth();
    const { boardId, blockId } = await params;

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
    const { assignmentId, dedication, startDate, endDate } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'assignmentId is required' } },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const existingAssignment = await prisma.timelineAssignment.findFirst({
      where: {
        id: assignmentId,
        blockId,
      },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } },
        { status: 404 }
      );
    }

    // Validate dedication if provided
    if (dedication !== undefined) {
      const validDedications = [25, 50, 75, 100];
      if (!validDedications.includes(dedication)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'dedication must be 25, 50, 75, or 100' } },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dedication !== undefined) updateData.dedication = dedication;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);

    const assignment = await prisma.timelineAssignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Failed to update timeline assignment:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update timeline assignment' } },
      { status: 500 }
    );
  }
}
