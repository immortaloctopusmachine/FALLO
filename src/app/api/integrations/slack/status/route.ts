import { requireAuth, requireAdmin, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  getSlackAuthInfo,
  isSlackConfigured,
  listSlackChannels,
  listSlackUsers,
} from '@/lib/slack';

type SlackCheckResult = {
  ok: boolean;
  details?: string;
};

export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const adminResult = await requireAdmin(session.user.id);
    if (adminResult.response) return adminResult.response;

    if (!isSlackConfigured()) {
      return apiSuccess({
        configured: false,
        workspace: null,
        checks: {
          auth: { ok: false, details: 'SLACK_BOT_TOKEN is not configured' } as SlackCheckResult,
          usersRead: { ok: false, details: 'Slack token not configured' } as SlackCheckResult,
          channelsRead: { ok: false, details: 'Slack token not configured' } as SlackCheckResult,
          chatWrite: { ok: false, details: 'Validate by sending a test message below' } as SlackCheckResult,
        },
      });
    }

    const checks: {
      auth: SlackCheckResult;
      usersRead: SlackCheckResult;
      channelsRead: SlackCheckResult;
      chatWrite: SlackCheckResult;
    } = {
      auth: { ok: false },
      usersRead: { ok: false },
      channelsRead: { ok: false },
      chatWrite: { ok: false, details: 'Validate by sending a test message below' },
    };

    let workspace: {
      teamId: string | null;
      teamName: string | null;
      botUserId: string | null;
      userId: string | null;
      url: string | null;
    } | null = null;

    try {
      workspace = await getSlackAuthInfo();
      checks.auth = { ok: true };
      checks.chatWrite = {
        ok: true,
        details: 'Token is valid. Send a test message below to confirm channel-level posting access.',
      };
    } catch (error) {
      checks.auth = {
        ok: false,
        details: error instanceof Error ? error.message : 'auth.test failed',
      };
      checks.chatWrite = { ok: false, details: 'Authentication failed; cannot validate message sending.' };
    }

    try {
      const users = await listSlackUsers();
      checks.usersRead = { ok: true, details: `${users.length} users available` };
    } catch (error) {
      checks.usersRead = {
        ok: false,
        details: error instanceof Error ? error.message : 'users.list failed',
      };
    }

    try {
      const channels = await listSlackChannels();
      checks.channelsRead = { ok: true, details: `${channels.length} channels available` };
    } catch (error) {
      checks.channelsRead = {
        ok: false,
        details: error instanceof Error ? error.message : 'conversations.list failed',
      };
    }

    return apiSuccess({
      configured: true,
      workspace,
      checks,
    });
  } catch (error) {
    console.error('Failed to fetch Slack integration status:', error);
    return ApiErrors.internal('Failed to fetch Slack integration status');
  }
}
