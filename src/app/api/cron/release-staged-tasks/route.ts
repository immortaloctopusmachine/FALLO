import { processDueStagedTasks } from '@/lib/task-release';
import { apiError, ApiErrors, apiSuccess } from '@/lib/api-utils';

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
    return ApiErrors.internal('CRON_SECRET environment variable is not configured');
  }

  if (!isAuthorized(request)) {
    return apiError('UNAUTHORIZED', 'Invalid cron secret', 401);
  }

  try {
    const result = await processDueStagedTasks();
    return apiSuccess(result);
  } catch (error) {
    console.error('Cron staged-task release failed:', error);
    return ApiErrors.internal('Failed to process staged task releases');
  }
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}
