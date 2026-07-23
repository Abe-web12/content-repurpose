/**
 * Comprehensive export barrel for all Zod validation schemas.
 * This ensures every mutation endpoint can use Zod validation
 * instead of manual validation.
 */
export * from "./auth";
export * from "./analytics";
export * from "./billing";
export * from "./brand-kit";
export * from "./content";
export * from "./generate";
export * from "./knowledge";
export * from "./organization";
export * from "./prompt";
export * from "./agents";

// ─── Additional schemas that fill validation gaps ─────────────────────────────

import { z } from "zod";

/** API Key management */
export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(64, "Name too long"),
  orgId: z.string().uuid("Invalid organization ID"),
  permissions: z.array(z.string()).optional().default([]),
  scopes: z.array(z.string()).optional().default([]),
  allowedIps: z.array(z.string().ip()).optional().default([]),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const updateApiKeySchema = z.object({
  action: z.enum(["revoke", "rotate", "update"]),
  keyId: z.string().uuid(),
  name: z.string().min(1).max(64).optional(),
  permissions: z.array(z.string()).optional(),
  scopes: z.array(z.string()).optional(),
});
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;

/** Marketplace */
export const marketplaceListingSchema = z.object({
  integrationKey: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().min(1).max(5000),
  shortDescription: z.string().max(200).optional(),
  category: z.string().min(1),
  icon: z.string().optional(),
  images: z.array(z.string().url()).optional().default([]),
  provider: z.string().min(1),
  websiteUrl: z.string().url().optional(),
  docsUrl: z.string().url().optional(),
  isFree: z.boolean().optional().default(true),
  priceCents: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional().default([]),
  permissions: z.array(z.string()).optional().default([]),
  requirements: z.array(z.string()).optional().default([]),
});
export type MarketplaceListingInput = z.infer<typeof marketplaceListingSchema>;

/** Integrations */
export const installIntegrationSchema = z.object({
  integrationKey: z.string().min(1),
  config: z.record(z.unknown()).optional().default({}),
});
export type InstallIntegrationInput = z.infer<typeof installIntegrationSchema>;

export const updateIntegrationSchema = z.object({
  config: z.record(z.unknown()).optional(),
  isPaused: z.boolean().optional(),
});
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;

/** Workflows */
export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(128, "Name too long"),
  description: z.string().max(2000).optional(),
  trigger: z.enum(["manual", "schedule", "webhook", "event"]).optional().default("manual"),
  config: z.record(z.unknown()).optional().default({}),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = createWorkflowSchema.partial();
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

/** Webhooks */
export const webhookEndpointSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
  url: z.string().url("Must be a valid URL"),
  triggerEvents: z.array(z.string()).min(1, "At least one event required"),
  secret: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});
export type WebhookEndpointInput = z.infer<typeof webhookEndpointSchema>;

/** Team */
export const teamUpdateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(500).optional(),
});
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;

/** Branding */
export const brandingSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color").optional(),
  logo: z.string().url().optional().nullable(),
  logoLight: z.string().url().optional().nullable(),
  logoDark: z.string().url().optional().nullable(),
  favicon: z.string().url().optional().nullable(),
  fontFamily: z.string().optional(),
  emailBrandingEnabled: z.boolean().optional(),
});
export type BrandingInput = z.infer<typeof brandingSchema>;

/** Notifications */
export const notificationSchema = z.object({
  type: z.string().optional().default("info"),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(2000),
  link: z.string().url().optional().nullable(),
});
export type NotificationInput = z.infer<typeof notificationSchema>;

/** Security */
export const securityPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  rules: z.array(z.record(z.unknown())).optional().default([]),
  isActive: z.boolean().optional().default(true),
});
export type SecurityPolicyInput = z.infer<typeof securityPolicySchema>;

/** Domains */
export const domainSchema = z.object({
  domain: z.string().regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, "Must be a valid domain"),
});
export type DomainInput = z.infer<typeof domainSchema>;

/** Feedback */
export const feedbackSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000),
  rating: z.number().int().min(1).max(5).optional(),
  type: z.enum(["GENERAL", "BUG", "FEATURE"]).optional().default("GENERAL"),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;
