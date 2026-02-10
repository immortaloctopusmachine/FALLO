'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface SlackChannelOption {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface SlackStatusResponse {
  configured: boolean;
  workspace: {
    teamId: string | null;
    teamName: string | null;
    botUserId: string | null;
    userId: string | null;
    url: string | null;
  } | null;
  checks: {
    auth: { ok: boolean; details?: string };
    usersRead: { ok: boolean; details?: string };
    channelsRead: { ok: boolean; details?: string };
    chatWrite: { ok: boolean; details?: string };
  };
}

function CheckRow({
  label,
  ok,
  details,
}: {
  label: string;
  ok: boolean;
  details?: string;
}) {
  return (
    <div className="flex items-start justify-between rounded-md border border-border bg-surface p-3">
      <div>
        <div className="text-body font-medium text-text-primary">{label}</div>
        {details ? <div className="text-caption text-text-secondary mt-1">{details}</div> : null}
      </div>
      <div className={ok ? 'text-green-600' : 'text-red-600'}>
        {ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
      </div>
    </div>
  );
}

export default function IntegrationsSettingsPage() {
  const [status, setStatus] = useState<SlackStatusResponse | null>(null);
  const [channels, setChannels] = useState<SlackChannelOption[]>([]);
  const [channelId, setChannelId] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [message, setMessage] = useState('Project Planner Slack integration test message.');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingChannels, setIsRefreshingChannels] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchStatus = useCallback(async () => {
    const response = await fetch('/api/integrations/slack/status', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to fetch Slack status');
    }
    setStatus(data.data as SlackStatusResponse);
  }, []);

  const fetchChannels = useCallback(async () => {
    const response = await fetch('/api/integrations/slack/channels', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok && data.success && Array.isArray(data.data)) {
      setChannels(data.data as SlackChannelOption[]);
    } else {
      setChannels([]);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchStatus(), fetchChannels()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  }, [fetchChannels, fetchStatus]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchStatus(), fetchChannels()]);
      toast.success('Slack status refreshed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh Slack status');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchChannels, fetchStatus]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if ((!channelId || !channels.some((channel) => channel.id === channelId)) && channels.length > 0) {
      setChannelId(channels[0].id);
    }
  }, [channelId, channels]);

  const filteredChannels = useMemo(() => {
    const query = channelSearch.trim().toLowerCase();
    if (!query) return channels;
    return channels.filter((channel) => channel.name.toLowerCase().includes(query));
  }, [channelSearch, channels]);

  const canSendTestMessage = useMemo(
    () => Boolean(status?.configured && channelId.trim() && message.trim() && !isSending),
    [channelId, isSending, message, status?.configured]
  );

  const refreshChannels = useCallback(async () => {
    setIsRefreshingChannels(true);
    try {
      await fetchChannels();
      toast.success('Channels refreshed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh channels');
    } finally {
      setIsRefreshingChannels(false);
    }
  }, [fetchChannels]);

  const handleSendTestMessage = async () => {
    if (!canSendTestMessage) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/integrations/slack/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channelId.trim(),
          text: message.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to send test message');
      }
      toast.success('Test message sent to Slack');
      await fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test message');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading integrations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-title font-semibold">Integrations</h2>
          <p className="text-body text-text-secondary mt-1">
            Validate workspace-level Slack connectivity and send a test message.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body font-semibold">Slack Workspace Connection</h3>
          <span className={status?.configured ? 'text-green-700 text-caption font-medium' : 'text-red-700 text-caption font-medium'}>
            {status?.configured ? 'Configured' : 'Not configured'}
          </span>
        </div>

        {status?.workspace ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-caption text-text-secondary">
            <div>
              <span className="font-medium text-text-primary">Workspace:</span>{' '}
              {status.workspace.teamName || 'Unknown'}
            </div>
            <div>
              <span className="font-medium text-text-primary">Team ID:</span>{' '}
              {status.workspace.teamId || 'Unknown'}
            </div>
            <div>
              <span className="font-medium text-text-primary">Bot User ID:</span>{' '}
              {status.workspace.botUserId || 'Unknown'}
            </div>
            <div>
              <span className="font-medium text-text-primary">Workspace URL:</span>{' '}
              {status.workspace.url || 'Unknown'}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <CheckRow
            label="Authentication (auth.test)"
            ok={Boolean(status?.checks.auth.ok)}
            details={status?.checks.auth.details}
          />
          <CheckRow
            label="User Discovery (users:read)"
            ok={Boolean(status?.checks.usersRead.ok)}
            details={status?.checks.usersRead.details}
          />
          <CheckRow
            label="Channel Discovery (channels/groups:read)"
            ok={Boolean(status?.checks.channelsRead.ok)}
            details={status?.checks.channelsRead.details}
          />
          <CheckRow
            label="Message Sending (chat:write)"
            ok={Boolean(status?.checks.chatWrite.ok)}
            details={status?.checks.chatWrite.details}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <h3 className="text-body font-semibold">Send Test Message</h3>
        <p className="text-caption text-text-secondary">
          Use this to validate `chat:write` and channel access with your bot token.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="slack-test-channel">Slack Channel</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refreshChannels()}
              disabled={isRefreshingChannels}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingChannels ? 'animate-spin' : ''}`} />
              Refresh channels
            </Button>
          </div>
          <Input
            placeholder="Search channels..."
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
          />
          <Select value={channelId} onValueChange={setChannelId} disabled={channels.length === 0}>
            <SelectTrigger id="slack-test-channel">
              <SelectValue placeholder={channels.length > 0 ? 'Select channel' : 'No channels available'} />
            </SelectTrigger>
            <SelectContent>
              {filteredChannels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  #{channel.name} {channel.isPrivate ? '(private)' : '(public)'}
                </SelectItem>
              ))}
              {filteredChannels.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-text-secondary">
                  No channels match your search.
                </div>
              ) : null}
            </SelectContent>
          </Select>
          <p className="text-caption text-text-secondary">
            Showing {filteredChannels.length} of {channels.length} channels.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slack-test-message">Message</Label>
          <Textarea
            id="slack-test-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={3000}
            rows={4}
          />
        </div>

        <Button onClick={() => void handleSendTestMessage()} disabled={!canSendTestMessage}>
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Test Message
            </>
          )}
        </Button>
      </section>
    </div>
  );
}
