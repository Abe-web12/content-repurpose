export type IntegrationType =
  | "COMMUNICATION" | "STORAGE" | "PRODUCTIVITY" | "CRM"
  | "SOCIAL" | "CMS" | "AUTOMATION" | "AI" | "ANALYTICS"
  | "MARKETING" | "DEVELOPER_TOOLS" | "HR" | "FINANCE" | "OTHER";

export type OAuthProvider =
  | "SLACK" | "DISCORD" | "NOTION" | "GOOGLE_DRIVE" | "DROPBOX"
  | "ONEDRIVE" | "BOX" | "HUBSPOT" | "SALESFORCE" | "PIPEDRIVE"
  | "TRELLO" | "ASANA" | "CLICKUP" | "JIRA" | "MONDAY" | "GITHUB"
  | "GITLAB" | "BITBUCKET" | "LINKEDIN" | "TWITTER" | "FACEBOOK"
  | "INSTAGRAM" | "YOUTUBE" | "TIKTOK" | "WORDPRESS" | "GHOST"
  | "MEDIUM" | "ZAPIER" | "MAKECOM" | "N8N" | "AIRTABLE"
  | "MICROSOFT_TEAMS" | "GENERIC";

export interface IntegrationConfig {
  key: string;
  name: string;
  version: string;
  icon: string;
  description: string;
  category: string;
  type: IntegrationType;
  provider: string;
  hasOAuth: boolean;
  oauthProvider?: OAuthProvider;
  hasWebhooks: boolean;
  permissions: string[];
  configSchema: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  docsUrl?: string;
}

export interface InstallParams {
  organizationId: string;
  userId?: string;
  config?: Record<string, unknown>;
  credentials?: Record<string, string>;
  oauthCode?: string;
  oauthRedirectUri?: string;
}

export interface InstallResult {
  installedId: string;
  status: string;
  config: Record<string, unknown>;
  credentials?: Record<string, string>;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordsDeleted?: number;
  errors?: string[];
  metadata?: Record<string, unknown>;
}

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface IntegrationInterface {
  id: string;
  name: string;
  version: string;
  icon: string;
  description: string;
  category: string;
  type: IntegrationType;
  permissions: string[];
  configuration: Record<string, unknown>;
  healthCheck(installedId: string, config: Record<string, unknown>): Promise<HealthCheckResult>;
  install(params: InstallParams): Promise<InstallResult>;
  uninstall(installedId: string, config: Record<string, unknown>): Promise<void>;
  sync(installedId: string, config: Record<string, unknown>): Promise<SyncResult>;
  execute?(action: string, params: Record<string, unknown>): Promise<unknown>;
}

export interface MarketplaceFilter {
  category?: string;
  search?: string;
  sort?: "popular" | "rating" | "newest" | "name";
  featured?: boolean;
  isFree?: boolean;
  tags?: string[];
  page?: number;
  perPage?: number;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  scope: string;
  expiresAt?: Date;
  refreshExpiresAt?: Date;
  providerUserId?: string;
  providerUsername?: string;
  providerEmail?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  pkce?: boolean;
}

export interface WebhookDispatchResult {
  success: boolean;
  statusCode?: number;
  duration?: number;
  error?: string;
}
