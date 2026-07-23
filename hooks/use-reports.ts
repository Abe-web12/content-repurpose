"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export interface ReportRecord {
  id: string;
  title: string;
  description: string | null;
  type: string;
  format: string | null;
  lastGeneratedAt: string | null;
  createdAt: string;
}

export function useReports(organizationId?: string) {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (organizationId) qs.set("organizationId", organizationId);
        if (cursor) qs.set("cursor", cursor);
        const res = await fetch(`/api/analytics/reports?${qs.toString()}`);
        const json = await res.json();
        if (res.ok) {
          setReports(json.data);
          setNextCursor(json.nextCursor);
          setHasMore(json.hasMore);
        } else {
          showError(json.error || "Failed to load reports");
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [organizationId]
  );

  const createReport = useCallback(
    async (input: { title: string; description?: string; type: string; format?: string; config?: Record<string, unknown>; filters?: Record<string, unknown> }) => {
      setCreating(true);
      try {
        const qs = organizationId ? `?organizationId=${organizationId}` : "";
        const res = await fetch(`/api/analytics/reports${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!res.ok) {
          showError(json.error || "Failed to create report");
          return null;
        }
        await fetchData();
        return json.data;
      } catch (err) {
        showError(err instanceof Error ? err.message : "Network error");
        return null;
      } finally {
        setCreating(false);
      }
    },
    [organizationId, fetchData]
  );

  const scheduleReport = useCallback(
    async (id: string, schedule: { frequency: string; recipients: string[]; format: string }) => {
      try {
        const res = await fetch(`/api/analytics/reports/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schedule),
        });
        const json = await res.json();
        if (!res.ok) {
          showError(json.error || "Failed to schedule report");
          return false;
        }
        return true;
      } catch (err) {
        showError(err instanceof Error ? err.message : "Network error");
        return false;
      }
    },
    []
  );

  return { reports, nextCursor, hasMore, loading, creating, fetchData, createReport, scheduleReport };
}
