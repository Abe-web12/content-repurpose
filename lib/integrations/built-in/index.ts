import { IntegrationRegistry } from "../registry";
import { IntegrationManager } from "../manager";
import { IntegrationInterface } from "../types";

import { slack } from "./slack/index";
import { discord } from "./discord/index";
import { email } from "./email/index";
import { googleDrive } from "./google-drive/index";
import { webhook } from "./webhook/index";
import { zapier } from "./zapier/index";
import { make } from "./makecom/index";

const BUILT_IN_INTEGRATIONS: IntegrationInterface[] = [
  slack,
  discord,
  email,
  googleDrive,
  webhook,
  zapier,
  make,
];

const BUILT_IN_METADATA: Array<{
  key: string;
  name: string;
  description: string;
  type: string;
  category: string;
  provider: string;
  hasOAuth: boolean;
  oauthProvider?: string;
  hasWebhooks: boolean;
  configSchema: Record<string, unknown>;
  permissions: string[];
}> = [
  {
    key: "slack",
    name: "Slack",
    description: "Send messages, notifications, and collaborate with your team in Slack",
    type: "COMMUNICATION",
    category: "Communication",
    provider: "slack",
    hasOAuth: true,
    oauthProvider: "SLACK",
    hasWebhooks: true,
    configSchema: {
      oauth: {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        scopes: "channels:read,chat:write,users:read,files:read",
        authUrl: "https://slack.com/oauth/v2/authorize",
        tokenUrl: "https://slack.com/api/oauth.v2.access",
        revocationUrl: "https://slack.com/api/auth.revoke",
      },
    },
    permissions: ["read:channels", "write:messages", "read:users", "read:files"],
  },
  {
    key: "discord",
    name: "Discord",
    description: "Send messages, manage channels, and integrate with your Discord community",
    type: "COMMUNICATION",
    category: "Communication",
    provider: "discord",
    hasOAuth: true,
    oauthProvider: "DISCORD",
    hasWebhooks: true,
    configSchema: {
      oauth: {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        scopes: "identify,guilds,channels:read,messages:write,webhooks:write",
        authUrl: "https://discord.com/api/v10/oauth2/authorize",
        tokenUrl: "https://discord.com/api/v10/oauth2/token",
        revocationUrl: "https://discord.com/api/v10/oauth2/token/revoke",
      },
    },
    permissions: ["read:channels", "write:messages", "read:members", "manage:webhooks"],
  },
  {
    key: "email",
    name: "Email (Gmail)",
    description: "Send and receive emails via Gmail with full message threading support",
    type: "COMMUNICATION",
    category: "Communication",
    provider: "google",
    hasOAuth: true,
    oauthProvider: "GOOGLE_DRIVE",
    hasWebhooks: true,
    configSchema: {
      oauth: {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        scopes: "https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.labels,https://www.googleapis.com/auth/gmail.modify",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        revocationUrl: "https://oauth2.googleapis.com/revoke",
        pkce: true,
      },
    },
    permissions: ["read:messages", "write:messages", "read:labels", "read:threads", "write:send"],
  },
  {
    key: "google-drive",
    name: "Google Drive",
    description: "Access, create, and manage files and folders in Google Drive",
    type: "STORAGE",
    category: "Storage",
    provider: "google",
    hasOAuth: true,
    oauthProvider: "GOOGLE_DRIVE",
    hasWebhooks: true,
    configSchema: {
      oauth: {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        scopes: "https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/drive.metadata.readonly",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        revocationUrl: "https://oauth2.googleapis.com/revoke",
        pkce: true,
      },
    },
    permissions: ["read:files", "write:files", "read:metadata", "write:metadata"],
  },
  {
    key: "webhook",
    name: "Webhook",
    description: "Send data to any HTTP endpoint with customizable payloads and signing",
    type: "AUTOMATION",
    category: "Automation",
    provider: "webhook",
    hasOAuth: false,
    hasWebhooks: false,
    configSchema: {
      properties: {
        url: { type: "string", title: "Webhook URL", description: "The URL to send webhook payloads to" },
        secret: { type: "string", title: "Secret", description: "Optional HMAC signing secret" },
        method: { type: "string", title: "HTTP Method", enum: ["POST", "PUT", "PATCH", "GET", "DELETE"], default: "POST" },
        retryCount: { type: "number", title: "Retry Count", default: 3 },
        timeoutMs: { type: "number", title: "Timeout (ms)", default: 30000 },
      },
    },
    permissions: ["write:webhooks", "read:responses"],
  },
  {
    key: "zapier",
    name: "Zapier",
    description: "Connect with thousands of apps via Zapier automations and triggers",
    type: "AUTOMATION",
    category: "Automation",
    provider: "zapier",
    hasOAuth: true,
    oauthProvider: "ZAPIER",
    hasWebhooks: true,
    configSchema: {
      credentials: {
        apiKey: { type: "string", title: "API Key" },
      },
      oauth: {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        scopes: "",
        authUrl: "https://zapier.com/oauth/authorize",
        tokenUrl: "https://zapier.com/oauth/token",
      },
    },
    permissions: ["write:triggers", "read:zaps", "write:actions"],
  },
  {
    key: "makecom",
    name: "Make.com",
    description: "Automate workflows with Make.com (formerly Integromat) scenarios and webhooks",
    type: "AUTOMATION",
    category: "Automation",
    provider: "makecom",
    hasOAuth: true,
    oauthProvider: "MAKECOM",
    hasWebhooks: true,
    configSchema: {
      credentials: {
        apiKey: { type: "string", title: "API Key" },
      },
      oauth: {
        clientId: "",
        clientSecret: "",
        redirectUri: "",
        scopes: "",
        authUrl: "https://www.make.com/oauth/authorize",
        tokenUrl: "https://www.make.com/oauth/token",
      },
    },
    permissions: ["read:scenarios", "write:webhooks", "read:executions"],
  },
];

export async function registerBuiltInIntegrations(): Promise<void> {
  const registry = IntegrationRegistry.getInstance();

  for (const metadata of BUILT_IN_METADATA) {
    await IntegrationManager.upsertIntegration({
      key: metadata.key,
      name: metadata.name,
      description: metadata.description,
      type: metadata.type as any,
      category: metadata.category,
      provider: metadata.provider,
      isBuiltIn: true,
      isEnabled: true,
      hasOAuth: metadata.hasOAuth,
      oauthProvider: metadata.oauthProvider,
      hasWebhooks: metadata.hasWebhooks,
      configSchema: metadata.configSchema,
      permissions: metadata.permissions,
      healthEndpoint: undefined,
      docsUrl: undefined,
    });
  }

  for (const integration of BUILT_IN_INTEGRATIONS) {
    registry.registerBuiltIn(integration.id, integration);
  }
}

export {
  slack,
  discord,
  email,
  googleDrive,
  webhook,
  zapier,
  make,
};

export { BUILT_IN_METADATA };
