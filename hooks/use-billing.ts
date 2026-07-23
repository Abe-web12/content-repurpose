"use client";

import { useState, useEffect, useCallback } from "react";
import { showError } from "@/components/ui/toast";

interface BalanceData {
  balance: number;
  reserved: number;
  available: number;
  pendingExpiration: number;
  totalPurchased: number;
  totalSpent: number;
  totalExpired: number;
  totalReferral: number;
}

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  couponId: string | null;
}

interface InvoiceData {
  id: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface RevenueData {
  mrr: number;
  arr: number;
  arpu: number;
  totalCustomers: number;
  activeSubscriptions: number;
  churnRate: number;
  lifetimeValue: number;
  creditRevenue: number;
  trends: Array<{ date: string; mrr: number; newCustomers: number; churnedCount: number }>;
}

interface HealthData {
  healthScore: number;
  churnRisk: string;
  mrr: number;
  lifetimeValue: number;
  daysActive: number;
  totalGenerations: number;
  totalPublishes: number;
  billingStatus: string;
  daysSinceLastLogin: number | null;
  factors?: Record<string, number>;
}

interface CreditTxn {
  id: string;
  amount: number;
  balanceAfter: number;
  source: string;
  reference: string | null;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface CreditHistory {
  transactions: CreditTxn[];
  total: number;
}

interface PackageData {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: string;
  stripePriceId: string | null;
}

interface AddonData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  creditsAmount: number | null;
  priceCents: number;
  stripePriceId: string | null;
  purchased: boolean;
  purchasedAt: string | null;
}

interface LifetimePlanData {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  planTier: string;
  creditPack: number;
}

interface UsageStats {
  totalPurchased: number;
  totalSpent: number;
  totalExpired: number;
  totalReferral: number;
}

interface TeamData {
  id: string;
  name: string;
  plan: string;
  mrr: number;
  healthScore: number;
  churnRisk: string;
}

interface BillingData {
  balance: BalanceData | null;
  subscription: SubscriptionData | null;
  revenue: RevenueData | null;
  health: HealthData | null;
  credits: CreditHistory | null;
  packages: PackageData[];
  addons: AddonData[];
  lifetimePlans: LifetimePlanData[];
  invoices: InvoiceData[];
  stats: UsageStats | null;
  team: TeamData[];
  loading: boolean;
}

function useFetch<T>(key: string | null, fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (key === null) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, deps);

  return { data, loading, refetch: () => fetcher().then(setData) };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json.data ?? json;
}

export function useBilling(): BillingData {
  const { data: balance } = useFetch("balance", () => fetchJson("/api/billing/credits?action=balance"), []);
  const { data: subscription } = useFetch("subscription", () => fetchJson("/api/billing/subscriptions?action=my-subscription"), []);
  const { data: revenue } = useFetch("revenue", () => fetchJson("/api/billing/revenue"), []);
  const { data: health } = useFetch("health", () => fetchJson("/api/billing/health"), []);
  const { data: packages } = useFetch("packages", () => fetchJson("/api/billing/credits?action=packages"), []);
  const { data: addons } = useFetch("addons", () => fetchJson("/api/billing/addons"), []);
  const { data: invoices } = useFetch("invoices", () => fetchJson("/api/billing/invoices"), []);
  const { data: team } = useFetch("team", () => fetchJson("/api/billing/health?action=at-risk&limit=5"), []);

  const loading = balance === null || subscription === null;

  return {
    balance: balance ? { ...balance, ...(balance as any).stats } as BalanceData : null,
    subscription: subscription as SubscriptionData | null,
    revenue: revenue as RevenueData | null,
    health: health as HealthData | null,
    credits: null,
    packages: (packages ?? []) as PackageData[],
    addons: ((addons ?? []) as any[]).map((a) => ({
      ...a,
      purchased: a.purchased ?? false,
      purchasedAt: a.purchasedAt ?? null,
    })) as AddonData[],
    lifetimePlans: [] as LifetimePlanData[],
    invoices: (invoices ?? []) as InvoiceData[],
    stats: (balance as any)?.stats ?? null,
    team: (team ?? []) as TeamData[],
    loading,
  };
}

export function useCreditHistory(limit = 50, offset = 0) {
  const [data, setData] = useState<CreditHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.fetch(`/api/billing/credits?action=history&limit=${limit}&offset=${offset}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData(json);
    } catch (e: any) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => { loadData(); }, [loadData]);

  return { data, loading, refetch: loadData };
}

export function useInvoiceHistory() {
  const { data, loading } = useFetch(
    "invoices",
    () => fetchJson<InvoiceData[]>("/api/billing/invoices"),
    []
  );
  return { invoices: data ?? [], loading };
}

export function useBillingPortal() {
  const [loading, setLoading] = useState(false);

  const openPortal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      const errMsg = json.error || json.statusCode || "Unknown error";
      console.error("[BILLING_PORTAL]", errMsg);
      showError(errMsg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to open billing portal";
      console.error("[BILLING_PORTAL]", msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { openPortal, loading };
}

export function useCheckout() {
  const [loading, setLoading] = useState<string | null>(null);

  const checkout = useCallback(async (type: string, payload: Record<string, unknown>) => {
    const key = `${type}:${JSON.stringify(payload)}`;
    setLoading(key);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) { showError(json.error || "Checkout failed"); return null; }
      if (json.url) window.location.href = json.url;
      return json;
    } catch {
      showError("Something went wrong");
      return null;
    } finally {
      setLoading(null);
    }
  }, []);

  return { checkout, loading, isLoading: (key: string) => loading === key };
}

export function useSubscriptionActions() {
  const [loading, setLoading] = useState<string | null>(null);

  const changePlan = useCallback(async (plan: string, couponCode?: string) => {
    setLoading("change_plan");
    try {
      const res = await fetch("/api/billing/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_plan", plan, couponCode }),
      });
      const json = await res.json();
      if (!res.ok) { showError(json.error || "Failed"); return null; }
      return json.data;
    } catch {
      showError("Failed to change plan");
      return null;
    } finally {
      setLoading(null);
    }
  }, []);

  const cancel = useCallback(async (atPeriodEnd = true) => {
    setLoading("cancel");
    try {
      const res = await fetch("/api/billing/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", atPeriodEnd }),
      });
      const json = await res.json();
      if (!res.ok) { showError(json.error || "Failed"); return false; }
      return true;
    } catch {
      showError("Failed to cancel");
      return false;
    } finally {
      setLoading(null);
    }
  }, []);

  const sync = useCallback(async () => {
    setLoading("sync");
    try {
      await fetch("/api/billing/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
    } catch {
      showError("Failed to sync");
    } finally {
      setLoading(null);
    }
  }, []);

  return { changePlan, cancel, sync, loading, isLoading: (key: string) => loading === key };
}
