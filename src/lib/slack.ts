interface SlackApiResponse<T> {
  ok: boolean;
  error?: string;
  members?: T[];
  channels?: T[];
  user?: T;
  response_metadata?: {
    next_cursor?: string;
  };
}

export interface SlackUserProfile {
  id: string;
  realName: string;
  displayName: string;
  image192: string | null;
  email: string | null;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export interface SlackAuthInfo {
  teamId: string | null;
  teamName: string | null;
  botUserId: string | null;
  userId: string | null;
  url: string | null;
}

function getSlackBotToken(): string | null {
  return process.env.SLACK_BOT_TOKEN || null;
}

export function isSlackConfigured(): boolean {
  return !!getSlackBotToken();
}

async function slackApiRequest<T>(
  method: string,
  params: Record<string, string> = {}
): Promise<SlackApiResponse<T>> {
  const token = getSlackBotToken();
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not configured');
  }

  const url = new URL(`https://slack.com/api/${method}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Slack API request failed (${response.status})`);
  }

  return (await response.json()) as SlackApiResponse<T>;
}

function normalizeName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function listSlackUsers(): Promise<SlackUserProfile[]> {
  const result = await slackApiRequest<{
    id: string;
    deleted: boolean;
    is_bot?: boolean;
    real_name?: string;
    name?: string;
    profile?: {
      display_name?: string;
      real_name?: string;
      image_192?: string;
      email?: string;
    };
  }>('users.list');

  if (!result.ok) {
    throw new Error(result.error || 'Failed to list Slack users');
  }

  return (result.members || [])
    .filter((member) => !member.deleted && !member.is_bot)
    .map((member) => ({
      id: member.id,
      realName: member.real_name || member.profile?.real_name || member.name || '',
      displayName: member.profile?.display_name || '',
      image192: member.profile?.image_192 || null,
      email: member.profile?.email || null,
    }));
}

export async function listSlackChannels(): Promise<SlackChannel[]> {
  const allChannels: Array<{
    id: string;
    name: string;
    is_archived: boolean;
    is_private: boolean;
  }> = [];

  let cursor = '';
  do {
    const result = await slackApiRequest<{
      id: string;
      name: string;
      is_archived: boolean;
      is_private: boolean;
    }>('conversations.list', {
      types: 'public_channel,private_channel',
      limit: '200',
      exclude_archived: 'true',
      ...(cursor ? { cursor } : {}),
    });

    if (!result.ok) {
      throw new Error(result.error || 'Failed to list Slack channels');
    }

    allChannels.push(...(result.channels || []));
    cursor = result.response_metadata?.next_cursor?.trim() || '';
  } while (cursor);

  return allChannels
    .filter((channel) => !channel.is_archived)
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function getSlackUserProfile(slackUserId: string): Promise<SlackUserProfile | null> {
  const result = await slackApiRequest<{
    id: string;
    deleted: boolean;
    is_bot?: boolean;
    real_name?: string;
    name?: string;
    profile?: {
      display_name?: string;
      real_name?: string;
      image_192?: string;
      email?: string;
    };
  }>('users.info', { user: slackUserId });

  if (!result.ok || !result.user || result.user.deleted || result.user.is_bot) {
    return null;
  }

  return {
    id: result.user.id,
    realName: result.user.real_name || result.user.profile?.real_name || result.user.name || '',
    displayName: result.user.profile?.display_name || '',
    image192: result.user.profile?.image_192 || null,
    email: result.user.profile?.email || null,
  };
}

export async function findSlackUserByName(name: string): Promise<SlackUserProfile | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const normalizedInput = normalizeName(trimmed);
  const users = await listSlackUsers();

  const exactMatch = users.find((user) => {
    const candidates = [
      user.realName,
      user.displayName,
    ].filter(Boolean).map(normalizeName);
    return candidates.includes(normalizedInput);
  });

  if (exactMatch) return exactMatch;

  const fuzzyMatch = users.find((user) => {
    const candidates = [
      user.realName,
      user.displayName,
    ].filter(Boolean).map(normalizeName);
    return candidates.some((candidate) =>
      candidate.includes(normalizedInput) || normalizedInput.includes(candidate)
    );
  });

  return fuzzyMatch || null;
}

export async function getSlackAuthInfo(): Promise<SlackAuthInfo> {
  const token = getSlackBotToken();
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not configured');
  }

  const response = await fetch('https://slack.com/api/auth.test', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Slack auth.test failed (${response.status})`);
  }

  const result = (await response.json()) as {
    ok: boolean;
    error?: string;
    team_id?: string;
    team?: string;
    bot_id?: string;
    user_id?: string;
    url?: string;
  };

  if (!result.ok) {
    throw new Error(result.error || 'Slack auth test failed');
  }

  return {
    teamId: result.team_id || null,
    teamName: result.team || null,
    botUserId: result.bot_id || null,
    userId: result.user_id || null,
    url: result.url || null,
  };
}

export async function postSlackMessage(channelId: string, text: string): Promise<void> {
  const token = getSlackBotToken();
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN is not configured');
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack postMessage failed (${response.status})`);
  }

  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!result.ok) {
    throw new Error(result.error || 'Slack postMessage failed');
  }
}
