"use client";

import { useState, useCallback, useEffect } from "react";

export interface ReferralStats {
  totalInvites: number;
  convertedCount: number;
  totalCredits: number;
  totalRevenue: number;
  pendingRewards: number;
  conversionRate: number;
}

export interface ReferralEvent {
  id: string;
  inviteeEmail: string | null;
  eventType: string;
  status: string;
  createdAt: string;
}

export interface ReferralReward {
  id: string;
  creditAmount: number;
  cashAmount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  totalReferrals: number;
  convertedCount: number;
  totalRevenue: number;
  rank: number;
}

export function useReferralCode() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch("/api/referrals/code");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setCode(json.data.code);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCode(); }, [fetchCode]);

  return { code, loading, error, refetch: fetchCode };
}

export function useReferralStats() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.fetch("/api/referrals/stats")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setStats(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

export function useReferralData() {
  const [data, setData] = useState<{ stats: ReferralStats; events: ReferralEvent[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.fetch("/api/referrals?limit=50&offset=0");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData(json.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useReferralRewards() {
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.fetch("/api/referrals/rewards")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.data)) setRewards(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { rewards, loading };
}

export function useReferralLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.fetch("/api/referrals/leaderboard?limit=20")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.data)) setLeaderboard(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { leaderboard, loading };
}

export function useApplyReferral() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const apply = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await window.fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setSuccess(true);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { apply, loading, error, success, reset: () => { setError(null); setSuccess(false); } };
}
