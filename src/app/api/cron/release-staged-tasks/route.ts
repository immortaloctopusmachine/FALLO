import { NextResponse } from 'next/server';
import { processDueStagedTasks } from '@/lib/task-release';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  const tokenFromAuth = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  const tokenFromHeader = request.headers.get('x-cron-secret');

  return tokenFromAuth === secret || tokenFromHeader === secret;
}

async function handleCronRequest(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CRON_SECRET_MISSING',
          message: 'CRON_SECRET environment variable is not configured',
        },
      },
      { status: 500 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid cron secret',
        },
      },
      { status: 401 }
    );
  }

  try {
    const result = await processDueStagedTasks();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Cron staged-task release failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process staged task releases',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
