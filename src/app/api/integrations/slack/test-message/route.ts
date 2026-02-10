import { apiSuccess, ApiErrors, requireAdmin, requireAuth } from '@/lib/api-utils';
import { isSlackConfigured, postSlackMessage } from '@/lib/slack';

export async function POST(request: Request) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const adminResult = await requireAdmin(session.user.id);
    if (adminResult.response) return adminResult.response;

    if (!isSlackConfigured()) {
      return ApiErrors.validation('Slack integration is not configured');
    }

    const body = await request.json().catch(() => ({})) as {
      channelId?: string;
      text?: string;
    };

    const channelId = body.channelId?.trim();
    const text = body.text?.trim();

    if (!channelId) {
      return ApiErrors.validation('Channel is required');
    }

    if (!text) {
      return ApiErrors.validation('Message text is required');
    }

    if (text.length > 3000) {
      return ApiErrors.validation('Message is too long (max 3000 characters)');
    }

    await postSlackMessage(channelId, text);

    return apiSuccess({ sent: true });
  } catch (error) {
    console.error('Failed to send Slack test message:', error);
    return ApiErrors.internal(
      error instanceof Error ? error.message : 'Failed to send Slack test message'
    );
  }
}

