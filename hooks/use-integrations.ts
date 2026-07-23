"use client";

import { useState, useEffect, useCallback } from "react";

interface Integration {
  id: string;
  key: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  type: string;
  category: string;
  provider: string;
  isBuiltIn: boolean;
  isEnabled: boolean;
  hasOAuth: boolean;
  oauthProvider: string | null;
  hasWebhooks: boolean;
}

interface InstalledIntegration {
  id: string;
  organizationId: string;
  integrationKey: string;
  status: string;
  config: Record<string, unknown>;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  lastHealthCheckAt: string | null;
  healthStatus: string | null;
  isPaused: boolean;
  version: string;
  createdAt: string;
}

interface MarketplaceListing {
  id: string;
  integrationKey: string;
  name: string;
  description: string;
  shortDescription: string | null;
  category: string;
  icon: string;
  images: string[];
  provider: string;
  status: string;
  featured: boolean;
  installCount: number;
  reviewCount: number;
  averageRating: number;
  isFree: boolean;
  tags: string[];
}

interface LogEntry {
  id: string;
  installedId: string;
  level: string;
  message: string;
  details: Record<string, unknown> | null;
  source: string;
  createdAt: string;
}

interface UseIntegrationsOptions {
  type?: string;
  category?: string;
  search?: string;
}

export function useIntegrations(options?: UseIntegrationsOptions) {
  const [data, setData] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (options?.type) params.set("type", options.type);
      if (options?.category) params.set("category", options.category);
      if (options?.search) params.set("search", options.search);

      const response = await fetch(`/api/integrations?${params}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to fetch integrations");
      setData(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch integrations");
    } finally {
      setLoading(false);
    }
  }, [options?.type, options?.category, options?.search]);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  return { data, loading, error, refetch: fetchIntegrations };
}

export function useIntegration(key: string) {
  const [data, setData] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegration = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/${key}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Integration not found");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch integration");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => { fetchIntegration(); }, [fetchIntegration]);

  return { data, loading, error, refetch: fetchIntegration };
}

export function useInstalledIntegrations(organizationId: string) {
  const [data, setData] = useState<InstalledIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstalled = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/installed?organizationId=${organizationId}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to fetch installed integrations");
      setData(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch installed integrations");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchInstalled(); }, [fetchInstalled]);

  return { data, loading, error, refetch: fetchInstalled };
}

export function useMarketplace(options?: {
  category?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
}) {
  const [data, setData] = useState<{
    items: MarketplaceListing[];
    total: number;
    page: number;
    hasMore: boolean;
  }>({ items: [], total: 0, page: 1, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketplace = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (options?.category) params.set("category", options.category);
      if (options?.search) params.set("search", options.search);
      if (options?.sort) params.set("sort", options.sort);
      if (options?.featured) params.set("featured", "true");

      const response = await fetch(`/api/marketplace?${params}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to fetch marketplace");
      setData(json.data || { items: [], total: 0, page: 1, hasMore: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch marketplace");
    } finally {
      setLoading(false);
    }
  }, [options?.category, options?.search, options?.sort, options?.featured]);

  useEffect(() => { fetchMarketplace(); }, [fetchMarketplace]);

  return { data, loading, error, refetch: fetchMarketplace };
}

export function useInstall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const install = useCallback(async (integrationKey: string, organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationKey, organizationId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Installation failed");
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { install, loading, error };
}

export function useSync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async (installedId: string, organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installedId, organizationId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Sync failed");
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sync, loading, error };
}

export function useOAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (integrationKey: string, organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationKey, organizationId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Connection failed");
      if (json.data?.authUrl) {
        window.location.href = json.data.authUrl;
      }
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async (installedId: string, organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installedId, organizationId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Disconnect failed");
      return json.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { connect, disconnect, loading, error };
}

export function useLogs(installedId: string) {
  const [data, setData] = useState<{ logs: LogEntry[]; total: number }>({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!installedId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/logs?installedId=${installedId}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to fetch logs");
      setData(json.data || { logs: [], total: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [installedId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { data, loading, error, refetch: fetchLogs };
}

export function useMarketplaceSearch() {
  const [results, setResults] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/marketplace/search?q=${encodeURIComponent(query)}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Search failed");
      setResults(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}
