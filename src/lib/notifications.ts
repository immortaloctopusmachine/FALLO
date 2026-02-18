import { prisma } from '@/lib/prisma';
import { postSlackMessage, isSlackConfigured } from '@/lib/slack';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: (params.data || {}) as Record<string, string>,
    },
  });
}

export async function createNotificationWithSlackDM(
  params: CreateNotificationParams & { slackUserId?: string | null }
) {
  const notification = await createNotification(params);

  // Also send Slack DM if user has a slackUserId linked
  if (params.slackUserId && isSlackConfigured()) {
    try {
      await postSlackMessage(params.slackUserId, params.message);
    } catch (err) {
      console.error('Failed to send Slack DM:', err);
      // Non-blocking: notification still created even if Slack fails
    }
  }

  return notification;
}
