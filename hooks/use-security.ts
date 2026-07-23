"use client";

import { useState, useEffect, useCallback } from "react";
import { showError } from "@/components/ui/toast";

// ─── SSO ───────────────────────────────────────────────
interface SSOProviderData {
  id: string;
  orgId: string;
  providerType: string;
  clientId: string;
  issuerUrl: string | null;
  domains: string[];
  isActive: boolean;
  createdAt: string;
}

export function useSSOProviders(orgId: string | null) {
  const [providers, setProviders] = useState<SSOProviderData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      const res = await globalThis.fetch(`/api/sso?orgId=${orgId}`);
      if (!res.ok) throw new Error("Failed to load SSO providers");
      const json = await res.json();
      setProviders(json.data ?? []);
    } catch {
      showError("Failed to load SSO providers");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  return { providers, loading, refetch: load };
}

export function useCreateSSOProvider() {
  const [loading, setLoading] = useState(false);

  const create = useCallback(async (orgId: string, data: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/sso", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ...data }),
      });
      if (!res.ok) throw new Error("Failed to create provider");
      return await res.json();
    } catch (err) {
      showError("Failed to create SSO provider");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading };
}

// ─── MFA ───────────────────────────────────────────────
interface MFAMethodData {
  id: string;
  userId: string;
  type: string;
  isPrimary: boolean;
  confirmedAt: string;
  createdAt: string;
}

export function useMFAMethods() {
  const [methods, setMethods] = useState<MFAMethodData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await globalThis.fetch("/api/mfa");
      if (!res.ok) throw new Error("Failed to load MFA methods");
      const json = await res.json();
      setMethods(json.data ?? []);
    } catch {
      showError("Failed to load MFA methods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { methods, loading, refetch: load };
}

export function useMFAActions() {
  const [loading, setLoading] = useState(false);

  const setup = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mfa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      if (!res.ok) throw new Error("Failed to setup MFA");
      return await res.json();
    } catch (err) {
      showError("Failed to setup MFA");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirm = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/mfa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", token }),
      });
      if (!res.ok) throw new Error("Failed to confirm MFA");
      return await res.json();
    } catch (err) {
      showError("Failed to confirm MFA");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendEmailOTP = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mfa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email_otp" }),
      });
      if (!res.ok) throw new Error("Failed to send email OTP");
      return await res.json();
    } catch (err) {
      showError("Failed to send email OTP");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { setup, confirm, sendEmailOTP, loading };
}

// ─── Sessions ──────────────────────────────────────────
interface SessionData {
  id: string;
  userId: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  location: string | null;
  isTrusted: boolean;
  isBlocked: boolean;
  lastActiveAt: string;
  createdAt: string;
}

interface DeviceStats {
  totalSessions: number;
  activeToday: number;
  trustedDevices: number;
  blockedDevices: number;
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await globalThis.fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      const json = await res.json();
      setSessions(json.data?.sessions ?? []);
      setStats(json.data?.stats ?? null);
    } catch {
      showError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { sessions, stats, loading, refetch: load };
}

export function useSessionActions() {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (action: string, sessionId?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sessionId }),
      });
      if (!res.ok) throw new Error("Failed to execute session action");
    } catch (err) {
      showError("Failed to execute session action");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading };
}

// ─── Audit Log ─────────────────────────────────────────
interface AuditLogData {
  id: string;
  orgId: string | null;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export function useAuditLogs(orgId?: string, filters?: { action?: string; entityType?: string }) {
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orgId) params.set("orgId", orgId);
      if (filters?.action) params.set("action", filters.action);
      if (filters?.entityType) params.set("entityType", filters.entityType);
      const res = await globalThis.fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit logs");
      const json = await res.json();
      setLogs(json.data ?? []);
    } catch {
      showError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [orgId, filters?.action, filters?.entityType]);

  useEffect(() => { load(); }, [load]);

  return { logs, loading, refetch: load };
}

// ─── API Keys ──────────────────────────────────────────
interface APIKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  scopes: string[];
  allowedIps: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function useAPIKeys(orgId: string | null) {
  const [keys, setKeys] = useState<APIKeyData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      const res = await globalThis.fetch(`/api/api-keys?orgId=${orgId}`);
      if (!res.ok) throw new Error("Failed to load API keys");
      const json = await res.json();
      setKeys(json.data ?? []);
    } catch {
      showError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  return { keys, loading, refetch: load };
}

export function useAPIKeyActions() {
  const [loading, setLoading] = useState(false);

  const create = useCallback(async (orgId: string, data: { name: string; permissions?: string[]; scopes?: string[]; allowedIps?: string[] }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ...data }),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      return await res.json();
    } catch (err) {
      showError("Failed to create API key");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const revoke = useCallback(async (keyId: string) => {
    setLoading(true);
    try {
      await fetch("/api/api-keys", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", keyId }),
      });
    } catch (err) {
      showError("Failed to revoke API key");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rotate = useCallback(async (keyId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate", keyId }),
      });
      if (!res.ok) throw new Error("Failed to rotate API key");
      return await res.json();
    } catch (err) {
      showError("Failed to rotate API key");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, revoke, rotate, loading };
}

// ─── Security Policy ───────────────────────────────────
interface SecurityPolicyData {
  id: string;
  orgId: string;
  minPasswordLength: number;
  requireSpecialChars: boolean;
  requireNumbers: boolean;
  requireUppercase: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  requireMfa: boolean;
  allowedIpRanges: string[];
  allowedCountries: string[];
  allowedEmailDomains: string[];
  ipAllowlistEnabled: boolean;
  countryAllowlistEnabled: boolean;
  domainAllowlistEnabled: boolean;
  updatedAt: string;
}

export function useSecurityPolicy(orgId: string | null) {
  const [policy, setPolicy] = useState<SecurityPolicyData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      const res = await globalThis.fetch(`/api/security/policies?orgId=${orgId}`);
      if (!res.ok) throw new Error("Failed to load security policy");
      const json = await res.json();
      setPolicy(json.data ?? null);
    } catch {
      showError("Failed to load security policy");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  return { policy, loading, refetch: load };
}

export function useUpdateSecurityPolicy() {
  const [loading, setLoading] = useState(false);

  const update = useCallback(async (orgId: string, data: Partial<SecurityPolicyData>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/security/policies", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ...data }),
      });
      if (!res.ok) throw new Error("Failed to update security policy");
      return await res.json();
    } catch (err) {
      showError("Failed to update security policy");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading };
}

// ─── Threat Detection ──────────────────────────────────
interface ThreatEventData {
  id: string;
  type: string;
  severity: string;
  userId: string | null;
  orgId: string | null;
  ipAddress: string | null;
  details: any;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export function useThreats(orgId?: string, resolved?: boolean) {
  const [threats, setThreats] = useState<ThreatEventData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orgId) params.set("orgId", orgId);
      if (resolved !== undefined) params.set("resolved", String(resolved));
      const res = await globalThis.fetch(`/api/security/threats?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load threats");
      const json = await res.json();
      setThreats(json.data ?? []);
    } catch {
      showError("Failed to load threats");
    } finally {
      setLoading(false);
    }
  }, [orgId, resolved]);

  useEffect(() => { load(); }, [load]);

  return { threats, loading, refetch: load };
}

export function useSecurityScore(orgId?: string) {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orgId) params.set("orgId", orgId);
      params.set("type", "score");
      const res = await globalThis.fetch(`/api/security?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load security score");
      const json = await res.json();
      setScore(json.data ?? null);
    } catch {
      showError("Failed to load security score");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  return { score, loading, refetch: load };
}

export function useResolveThreat() {
  const [loading, setLoading] = useState(false);

  const resolve = useCallback(async (threatId: string) => {
    setLoading(true);
    try {
      await fetch("/api/security/threats", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", threatId }),
      });
    } catch (err) {
      showError("Failed to resolve threat");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { resolve, loading };
}

// ─── Compliance ────────────────────────────────────────
interface ComplianceConsentData {
  id: string;
  type: string;
  granted: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface PrivacyRequestData {
  id: string;
  requestType: string;
  status: string;
  details: any;
  completedAt: string | null;
  createdAt: string;
}

export function useCompliance() {
  const [consents, setConsents] = useState<ComplianceConsentData[]>([]);
  const [requests, setRequests] = useState<PrivacyRequestData[]>([]);
  const [exportData, setExportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [consentRes, requestRes] = await Promise.all([
        globalThis.fetch("/api/security/compliance?type=consents"),
        globalThis.fetch("/api/security/compliance?type=requests"),
      ]);
      if (consentRes.ok) {
        const json = await consentRes.json();
        setConsents(json.data ?? []);
      }
      if (requestRes.ok) {
        const json = await requestRes.json();
        setRequests(json.data ?? []);
      }
    } catch {
      showError("Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/security/compliance?type=export");
      if (!res.ok) throw new Error("Failed to export data");
      const json = await res.json();
      setExportData(json.data);
      return json.data;
    } catch (err) {
      showError("Failed to export user data");
      throw err;
    }
  }, []);

  return { consents, requests, exportData, loading, refetch: load, exportUserData };
}

export function useComplianceActions() {
  const [loading, setLoading] = useState(false);

  const recordConsent = useCallback(async (consentType: string, granted: boolean) => {
    setLoading(true);
    try {
      await fetch("/api/security/compliance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consent", consentType, granted }),
      });
    } catch (err) {
      showError("Failed to record consent");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPrivacyRequest = useCallback(async (requestType: string, details?: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/security/compliance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "privacy_request", requestType, details }),
      });
      if (!res.ok) throw new Error("Failed to create privacy request");
      return await res.json();
    } catch (err) {
      showError("Failed to create privacy request");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { recordConsent, createPrivacyRequest, loading };
}
