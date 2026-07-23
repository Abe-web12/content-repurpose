import {
  BaseIntegration,
  BaseIntegrationConfig,
} from "../_base";
import {
  SyncResult,
  HealthCheckResult,
} from "../../types";

interface SlackMessage {
  channel: string;
  text: string;
  blocks?: unknown[];
  threadTs?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  topic: string;
  purpose: string;
  memberCount: number;
}

interface SlackUser {
  id: string;
  name: string;
  realName: string;
  email: string;
}

const CONFIG: BaseIntegrationConfig = {
  id: "slack",
  name: "Slack",
  version: "1.0.0",
  icon: "message-square",
  description: "Send messages, notifications, and collaborate with your team in Slack",
  category: "Communication",
  type: "COMMUNICATION",
  permissions: ["read:channels", "write:messages", "read:users", "read:files"],
  hasOAuth: true,
  hasWebhooks: true,
  oauthProvider: "SLACK",
  rateLimit: { requestsPerSecond: 5, maxRetries: 3, baseDelayMs: 1000 },
};

export class SlackIntegration extends BaseIntegration {
  constructor() {
    super(CONFIG);
  }

  async healthCheck(
    installedId: string,
    config: Record<string, unknown>
  ): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const token = await this.getValidToken(installedId);
      await this.apiRequest<{ ok: boolean }>("https://slack.com/api/auth.test", {
        token,
      });
      return {
        healthy: true,
        latency: Date.now() - start,
        message: "Slack API is accessible",
      };
    } catch (err) {
      return {
        healthy: false,
        message: err instanceof Error ? err.message : "Health check failed",
      };
    }
  }

  protected async performSync(
    installedId: string,
    organizationId: string,
    config: Record<string, unknown>
  ): Promise<SyncResult> {
    const token = await this.getValidToken(installedId);

    const channels = await this.fetchChannels(token);
    const users = await this.fetchUsers(token);

    return {
      success: true,
      recordsProcessed: channels.length + users.length,
      recordsCreated: channels.length,
      metadata: {
        channels: channels.length,
        users: users.length,
      },
    };
  }

  async action_sendMessage(params: Record<string, unknown>): Promise<unknown> {
    const { installedId, channel, text, blocks, threadTs } = params as Record<
      string,
      unknown
    > & { installedId: string; channel: string; text: string };

    const token = await this.getValidToken(installedId);

    const message: SlackMessage = {
      channel,
      text: String(text),
    };

    if (blocks) message.blocks = blocks as unknown[];
    if (threadTs) message.threadTs = String(threadTs);

    return this.apiRequest("https://slack.com/api/chat.postMessage", {
      method: "POST",
      token,
      body: message,
    });
  }

  async action_getChannels(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    return this.fetchChannels(token);
  }

  async action_getUsers(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    return this.fetchUsers(token);
  }

  async action_createChannel(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    return this.apiRequest("https://slack.com/api/conversations.create", {
      method: "POST",
      token,
      body: { name: params.name, is_private: params.isPrivate ?? false },
    });
  }

  async action_uploadFile(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    return this.apiRequest("https://slack.com/api/files.upload", {
      method: "POST",
      token,
      body: {
        channels: params.channels,
        content: params.content,
        filename: params.filename,
        title: params.title,
        filetype: params.filetype,
      },
    });
  }

  private async fetchChannels(token: string): Promise<SlackChannel[]> {
    const all: SlackChannel[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL("https://slack.com/api/conversations.list");
      url.searchParams.set("limit", "200");
      url.searchParams.set("types", "public_channel,private_channel");
      url.searchParams.set("exclude_archived", "true");
      if (cursor) url.searchParams.set("cursor", cursor);

      const data = await this.apiRequest<{
        ok: boolean;
        channels?: Array<{
          id: string;
          name: string;
          topic: { value: string };
          purpose: { value: string };
          num_members: number;
        }>;
        response_metadata?: { next_cursor: string };
      }>(url.toString(), { token });

      if (data.channels) {
        for (const ch of data.channels) {
          all.push({
            id: ch.id,
            name: ch.name,
            topic: ch.topic.value,
            purpose: ch.purpose.value,
            memberCount: ch.num_members,
          });
        }
      }

      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    return all;
  }

  private async fetchUsers(token: string): Promise<SlackUser[]> {
    const all: SlackUser[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL("https://slack.com/api/users.list");
      url.searchParams.set("limit", "200");
      if (cursor) url.searchParams.set("cursor", cursor);

      const data = await this.apiRequest<{
        ok: boolean;
        members?: Array<{
          id: string;
          name: string;
          real_name: string;
          profile: { email: string };
          deleted?: boolean;
          is_bot?: boolean;
        }>;
        response_metadata?: { next_cursor: string };
      }>(url.toString(), { token });

      if (data.members) {
        for (const m of data.members) {
          if (m.deleted || m.is_bot) continue;
          all.push({
            id: m.id,
            name: m.name,
            realName: m.real_name,
            email: m.profile.email,
          });
        }
      }

      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    return all;
  }
}

export const slack = new SlackIntegration();
