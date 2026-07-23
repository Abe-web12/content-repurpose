import {
  BaseIntegration,
  BaseIntegrationConfig,
} from "../_base";
import {
  SyncResult,
  HealthCheckResult,
} from "../../types";

const CONFIG: BaseIntegrationConfig = {
  id: "discord",
  name: "Discord",
  version: "1.0.0",
  icon: "message-circle",
  description: "Send messages, manage channels, and integrate with your Discord community",
  category: "Communication",
  type: "COMMUNICATION",
  permissions: ["read:channels", "write:messages", "read:members", "manage:webhooks"],
  hasOAuth: true,
  hasWebhooks: true,
  oauthProvider: "DISCORD",
  rateLimit: { requestsPerSecond: 10, maxRetries: 3, baseDelayMs: 500 },
};

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  topic: string | null;
  position: number;
}

interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  joinedAt: string;
}

interface DiscordMessage {
  content: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string };
    timestamp?: string;
  }>;
  components?: unknown[];
  tts?: boolean;
}

export class DiscordIntegration extends BaseIntegration {
  private baseUrl = "https://discord.com/api/v10";

  constructor() {
    super(CONFIG);
  }

  async healthCheck(
    installedId: string,
    _config: Record<string, unknown>
  ): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const token = await this.getValidToken(installedId);
      await this.apiRequest<{ id: string }>(`${this.baseUrl}/users/@me`, {
        token,
      });
      return {
        healthy: true,
        latency: Date.now() - start,
        message: "Discord API is accessible",
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
    _organizationId: string,
    config: Record<string, unknown>
  ): Promise<SyncResult> {
    try {
      const token = await this.getValidToken(installedId);
      const guildId = String(config.guildId ?? "");

      if (!guildId) {
        return { success: false, recordsProcessed: 0, errors: ["guildId required for sync"] };
      }

      const [channels, members] = await Promise.all([
        this.action_getChannels({ installedId, guildId }).catch(() => [] as unknown[]),
        this.action_getMembers({ installedId, guildId }).catch(() => [] as unknown[]),
      ]);

      return {
        success: true,
        recordsProcessed: (channels as unknown[]).length + (members as unknown[]).length,
      };
    } catch (err) {
      return {
        success: false,
        recordsProcessed: 0,
        errors: [err instanceof Error ? err.message : "Sync failed"],
      };
    }
  }

  async action_sendMessage(params: Record<string, unknown>): Promise<unknown> {
    const { installedId, channelId } = params as Record<string, unknown>;
    const token = await this.getValidToken(String(installedId));

    const message: DiscordMessage = {
      content: String(params.content ?? ""),
    };

    if (params.embeds) message.embeds = params.embeds as DiscordMessage["embeds"];
    if (params.components) message.components = params.components as unknown[];
    if (params.tts) message.tts = true;

    return this.apiRequest(
      `${this.baseUrl}/channels/${channelId}/messages`,
      {
        method: "POST",
        token,
        body: message,
      }
    );
  }

  async action_getChannels(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const guildId = String(params.guildId ?? "");

    const data = await this.apiRequest<DiscordChannel[]>(
      `${this.baseUrl}/guilds/${guildId}/channels`,
      { token }
    );

    return data
      .filter((ch) => [0, 2, 5].includes(ch.type))
      .map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        topic: ch.topic,
        position: ch.position,
      }));
  }

  async action_getGuilds(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));

    const data = await this.apiRequest<Array<{ id: string; name: string; icon: string | null }>>(
      `${this.baseUrl}/users/@me/guilds`,
      { token }
    );

    return data.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
    }));
  }

  async action_getMembers(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const guildId = String(params.guildId ?? "");

    const all: DiscordMember[] = [];
    let lastId: string | undefined;

    do {
      const url = new URL(`${this.baseUrl}/guilds/${guildId}/members`);
      url.searchParams.set("limit", "1000");
      if (lastId) url.searchParams.set("after", lastId);

      const data = await this.apiRequest<
        Array<{
          user: { id: string; username: string; global_name: string | null };
          nick: string | null;
          roles: string[];
          joined_at: string;
        }>
      >(url.toString(), { token });

      for (const m of data) {
        all.push({
          id: m.user.id,
          username: m.user.username,
          displayName: m.nick ?? m.user.global_name ?? m.user.username,
          roles: m.roles,
          joinedAt: m.joined_at,
        });
      }

      lastId = data.length === 1000 ? data[data.length - 1].user.id : undefined;
    } while (lastId);

    return all;
  }

  async action_createWebhook(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const channelId = String(params.channelId ?? "");
    const name = String(params.name ?? "Repurpose AI");

    return this.apiRequest(
      `${this.baseUrl}/channels/${channelId}/webhooks`,
      {
        method: "POST",
        token,
        body: { name },
      }
    );
  }

  async action_editMessage(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const channelId = String(params.channelId ?? "");
    const messageId = String(params.messageId ?? "");

    return this.apiRequest(
      `${this.baseUrl}/channels/${channelId}/messages/${messageId}`,
      {
        method: "PATCH",
        token,
        body: { content: params.content, embeds: params.embeds },
      }
    );
  }

  async action_deleteMessage(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const channelId = String(params.channelId ?? "");
    const messageId = String(params.messageId ?? "");

    return this.apiRequest(
      `${this.baseUrl}/channels/${channelId}/messages/${messageId}`,
      { method: "DELETE", token }
    );
  }
}

export const discord = new DiscordIntegration();
