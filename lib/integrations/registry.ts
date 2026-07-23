import { IntegrationInterface, IntegrationType } from "./types";
import { IntegrationNotFoundError } from "./errors";

interface IntegrationMetadata {
  id: string;
  name: string;
  version: string;
  icon: string;
  description: string;
  category: string;
  type: IntegrationType;
  hasOAuth: boolean;
  hasWebhooks: boolean;
  permissions: string[];
}

export class IntegrationRegistry {
  private static instance: IntegrationRegistry;
  private integrations: Map<string, IntegrationInterface> = new Map();

  private builtInIntegrations: Map<string, IntegrationInterface> = new Map();

  private constructor() {}

  static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
      IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
  }

  register(integration: IntegrationInterface): void {
    this.integrations.set(integration.id, integration);
  }

  get(key: string): IntegrationInterface {
    const integration = this.integrations.get(key) || this.builtInIntegrations.get(key);
    if (!integration) {
      throw new IntegrationNotFoundError(key);
    }
    return integration;
  }

  getAll(): IntegrationInterface[] {
    const registered = Array.from(this.integrations.values());
    const builtIn = Array.from(this.builtInIntegrations.values());
    const existingKeys = new Set(registered.map((i) => i.id));
    const merged = [...registered];
    for (const bi of builtIn) {
      if (!existingKeys.has(bi.id)) {
        merged.push(bi);
      }
    }
    return merged;
  }

  getByCategory(category: string): IntegrationInterface[] {
    return this.getAll().filter(
      (i) => i.category.toLowerCase() === category.toLowerCase()
    );
  }

  getByType(type: IntegrationType): IntegrationInterface[] {
    return this.getAll().filter((i) => i.type === type);
  }

  getEnabled(): IntegrationInterface[] {
    return this.getAll();
  }

  list(): IntegrationMetadata[] {
    return this.getAll().map((i) => ({
      id: i.id,
      name: i.name,
      version: i.version,
      icon: i.icon,
      description: i.description,
      category: i.category,
      type: i.type,
      hasOAuth: "hasOAuth" in i ? Boolean((i as Record<string, unknown>).hasOAuth) : false,
      hasWebhooks: "hasWebhooks" in i ? Boolean((i as Record<string, unknown>).hasWebhooks) : false,
      permissions: i.permissions,
    }));
  }

  registerBuiltIn(key: string, integration: IntegrationInterface): void {
    this.builtInIntegrations.set(key, integration);
  }

  clear(): void {
    this.integrations.clear();
    this.builtInIntegrations.clear();
  }
}
