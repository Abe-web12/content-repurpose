"use client";

import type { AIProvider } from "@/hooks/use-ai";

interface ProviderCardProps {
  provider: AIProvider;
  onToggle?: (id: string, enabled: boolean) => void;
}

export function ProviderCard({ provider, onToggle }: ProviderCardProps) {
  const healthStatus = provider.health?.status ?? "unknown";
  const statusColor =
    healthStatus === "healthy" ? "text-green-500"
    : healthStatus === "degraded" ? "text-yellow-500"
    : healthStatus === "disabled" ? "text-gray-400"
    : "text-red-500";

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <h3 className="font-semibold text-lg">{provider.displayName}</h3>
        </div>
        {onToggle && (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={provider.isEnabled}
              onChange={() => onToggle(provider.id, !provider.isEnabled)}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
          </label>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <span>Type: {provider.type}</span>
        <span>Model: {provider.defaultModel}</span>
        <span>Priority: {provider.priority}</span>
        <span>
          Latency: {provider.health?.latency ? `${provider.health.latency.toFixed(0)}ms` : "N/A"}
        </span>
        <span>
          Success: {provider.health?.successRate ? `${provider.health.successRate.toFixed(1)}%` : "N/A"}
        </span>
        <span>
          Calls: {provider.health?.totalCalls ?? 0}
        </span>
      </div>
      {provider.capabilities?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {provider.capabilities.map((cap) => (
            <span key={cap} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              {cap}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
