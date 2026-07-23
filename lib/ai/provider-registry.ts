import { ProviderInterface, ProviderType } from "./provider-interface";

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, ProviderInterface> = new Map();

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: ProviderInterface): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): ProviderInterface {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider "${name}" not registered`);
    }
    return provider;
  }

  getAll(): ProviderInterface[] {
    return Array.from(this.providers.values());
  }

  getByType(type: ProviderType): ProviderInterface[] {
    return this.getAll().filter((p) => p.type === type);
  }

  getByCapability(capability: string): ProviderInterface[] {
    return this.getAll().filter((p) =>
      p.capabilities.includes(capability as any)
    );
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  clear(): void {
    this.providers.clear();
  }
}
