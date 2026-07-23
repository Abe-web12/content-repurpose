"use client";

import { IntegrationCard } from "./integration-card";

interface Integration {
  integrationKey: string;
  name: string;
  description: string;
  icon?: string;
  category?: string;
  status?: string;
  health?: string | null;
  lastSyncAt?: string | null;
  featured?: boolean;
  rating?: number;
  installCount?: number;
}

interface IntegrationGridProps {
  integrations: Integration[];
  installed?: Record<string, boolean>;
  onInstall?: (key: string) => void;
  onSync?: (key: string) => void;
}

export function IntegrationGrid({ integrations, installed, onInstall, onSync }: IntegrationGridProps) {
  if (integrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-indigo-500/10 p-4">
          <div className="text-4xl">🔌</div>
        </div>
        <h3 className="text-lg font-semibold text-white">No integrations found</h3>
        <p className="mt-1 text-sm text-gray-400">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.integrationKey}
          integrationKey={integration.integrationKey}
          name={integration.name}
          description={integration.description}
          icon={integration.icon}
          category={integration.category}
          status={integration.status}
          health={integration.health}
          lastSyncAt={integration.lastSyncAt}
          featured={integration.featured}
          rating={integration.rating}
          installCount={integration.installCount}
          installed={installed ? installed[integration.integrationKey] : undefined}
          href={`/marketplace/${integration.integrationKey}`}
          onInstall={onInstall ? () => onInstall(integration.integrationKey) : undefined}
          onSync={onSync ? () => onSync(integration.integrationKey) : undefined}
        />
      ))}
    </div>
  );
}
