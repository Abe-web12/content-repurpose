"use client";

import { IntegrationCard } from "./integration-card";

interface FeaturedApp {
  integrationKey: string;
  name: string;
  description: string;
  category: string;
  averageRating: number;
  installCount: number;
}

interface FeaturedAppsProps {
  apps: FeaturedApp[];
}

export function FeaturedApps({ apps }: FeaturedAppsProps) {
  if (apps.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Featured Integrations</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <IntegrationCard
            key={app.integrationKey}
            integrationKey={app.integrationKey}
            name={app.name}
            description={app.description}
            category={app.category}
            rating={app.averageRating}
            installCount={app.installCount}
            featured
            href={`/marketplace/${app.integrationKey}`}
          />
        ))}
      </div>
    </div>
  );
}
